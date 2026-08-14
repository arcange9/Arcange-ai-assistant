export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  params: Record<string, any>;
}

export interface ChatMessage {
  id?: string;
  role: ChatRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
  images?: string[];
  timestamp?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  dangerous?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  tools?: ToolDefinition[];
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  model: string;
  content: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface StreamChunk {
  id: string;
  content: string;
  delta?: string;
  toolCallDelta?: Partial<ToolCall>;
  finishReason?: string | null;
}

export interface AIProvider {
  id: string;
  name: string;
  models: string[];
  streamChat(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown>;
  listModels(): Promise<string[]>;
  chat(request: ChatRequest): Promise<ChatResponse>;
}

export interface ToolResult {
  toolCallId?: string;
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTimeMs?: number;
}

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type PlanStatus = 'created' | 'planning' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface TaskStep {
  id: string;
  description: string;
  tool?: string;
  params?: Record<string, any>;
  dependsOn?: string[];
  status: StepStatus;
  result?: ToolResult;
  error?: string;
}

export interface TaskPlan {
  id: string;
  userGoal: string;
  steps: TaskStep[];
  status: PlanStatus;
  createdTime: number;
  updatedTime: number;
}

export type AgentType = 'general' | 'coding' | 'desktop' | 'browser' | 'research' | 'file' | 'automation';

export type ModelRole = 'fast' | 'smart' | 'coding' | 'vision';

export interface AgentDefinition {
  id: string;
  name: string;
  type: AgentType;
  systemPrompt: string;
  modelRole: ModelRole;
  availableTools: string[];
  icon?: string;
  description?: string;
}

export type MemoryCategory = 'user_preferences' | 'conversations' | 'projects' | 'important_facts' | 'tasks';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface ModelConfig {
  providerId: string;
  modelId: string;
  apiKey?: string;
  baseUrl?: string;
}
