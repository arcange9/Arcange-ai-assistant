// Core Types
export * from './types.js';

// Providers
export * from './providers/index.js';

// Planner
export * from './planner/planner.js';
export * from './planner/prompts.js';

// Executor & Permissions
export * from './executor/tool-executor.js';
export * from './executor/agent-loop.js';
export * from './executor/permissions.js';

// Memory & Persistence
export * from './memory/memory-manager.js';
export * from './memory/persist.js';

// Agents & Routing
export * from './agents/agent-definitions.js';
export * from './agents/agent-router.js';

// Model Manager
export * from './model-manager.js';

import {
  AgentType,
  ChatMessage,
  ChatRequest,
  ChatResponse,
  MemoryCategory,
  MemoryItem,
  ModelRole,
  StreamChunk,
  TaskPlan,
  ToolDefinition
} from './types.js';
import { ModelManager } from './model-manager.js';
import { MemoryManager } from './memory/memory-manager.js';
import { AgentRouter } from './agents/agent-router.js';
import { ToolExecutor } from './executor/tool-executor.js';
import { AgentLoop, AgentLoopCallbacks } from './executor/agent-loop.js';
import { PermissionManager } from './executor/permissions.js';

export interface EngineConfig {
  configPath?: string;
  memoryPath?: string;
  autoConfirmPermissions?: boolean;
}

export interface ArcangeAIEngine {
  chat(messages: ChatMessage[], options?: { role?: ModelRole; model?: string; temperature?: number }): Promise<ChatResponse>;
  streamChat(messages: ChatMessage[], options?: { role?: ModelRole; model?: string; temperature?: number }): AsyncGenerator<StreamChunk, void, unknown>;
  runAgent(
    userMessage: string,
    options?: {
      agentType?: AgentType | string;
      callbacks?: AgentLoopCallbacks;
      availableTools?: ToolDefinition[];
    }
  ): Promise<{ response: string; plan: TaskPlan }>;
  getModels(providerId?: string): Promise<string[]>;
  manageMemory: {
    add(category: MemoryCategory, content: string, tags?: string[]): Promise<MemoryItem>;
    search(query: string, limit?: number): MemoryItem[];
    get(id: string): MemoryItem | null;
    delete(id: string): Promise<boolean>;
    clearAll(): Promise<void>;
  };
  manageWorkflows: {
    registerTool(tool: ToolDefinition, handler: (params: any) => Promise<any>): void;
  };
  modelManager: ModelManager;
  memoryManager: MemoryManager;
  permissionManager: PermissionManager;
  toolExecutor: ToolExecutor;
  agentRouter: AgentRouter;
}

export function createEngine(config: EngineConfig = {}): ArcangeAIEngine {
  const modelManager = new ModelManager(config.configPath);
  const memoryManager = new MemoryManager({ storagePath: config.memoryPath });
  const permissionManager = new PermissionManager(config.autoConfirmPermissions ?? false);
  const toolExecutor = new ToolExecutor(permissionManager);
  const agentRouter = new AgentRouter();

  return {
    modelManager,
    memoryManager,
    permissionManager,
    toolExecutor,
    agentRouter,

    async chat(messages: ChatMessage[], options: { role?: ModelRole; model?: string; temperature?: number } = {}): Promise<ChatResponse> {
      const role = options.role || 'smart';
      const { provider, modelId } = modelManager.getModelForRole(role);
      
      return await provider.chat({
        messages,
        model: options.model || modelId,
        temperature: options.temperature
      });
    },

    async *streamChat(messages: ChatMessage[], options: { role?: ModelRole; model?: string; temperature?: number } = {}): AsyncGenerator<StreamChunk, void, unknown> {
      const role = options.role || 'smart';
      const { provider, modelId } = modelManager.getModelForRole(role);

      yield* provider.streamChat({
        messages,
        model: options.model || modelId,
        temperature: options.temperature
      });
    },

    async runAgent(
      userMessage: string,
      options: {
        agentType?: AgentType | string;
        callbacks?: AgentLoopCallbacks;
        availableTools?: ToolDefinition[];
      } = {}
    ): Promise<{ response: string; plan: TaskPlan }> {
      const routeResult = agentRouter.routeRequest(userMessage, options.agentType);
      const { provider } = modelManager.getModelForRole(routeResult.agent.modelRole);

      // Inject memory context if relevant
      const relevantMemories = memoryManager.search(userMessage, 5);
      const memoryContext = relevantMemories.length > 0
        ? `Relevant User Memories:\n` + relevantMemories.map(m => `- [${m.category}] ${m.content}`).join('\n')
        : undefined;

      const loop = new AgentLoop(provider, toolExecutor, permissionManager);

      return await loop.run(userMessage, {
        availableTools: options.availableTools,
        context: memoryContext,
        callbacks: options.callbacks
      });
    },

    async getModels(providerId?: string): Promise<string[]> {
      if (providerId) {
        return await modelManager.getAvailableModels(providerId);
      }
      return [
        ...(await modelManager.getAvailableModels('gemini').catch(() => [])),
        ...(await modelManager.getAvailableModels('openrouter').catch(() => [])),
        ...(await modelManager.getAvailableModels('ollama').catch(() => []))
      ];
    },

    manageMemory: {
      add: (category, content, tags) => memoryManager.add(category, content, tags),
      search: (query, limit) => memoryManager.search(query, limit),
      get: (id) => memoryManager.get(id),
      delete: (id) => memoryManager.delete(id),
      clearAll: () => memoryManager.clearAll()
    },

    manageWorkflows: {
      registerTool: (tool, handler) => {
        agentRouter.registerTool(tool);
        toolExecutor.registerToolHandler(tool.name, handler);
      }
    }
  };
}
