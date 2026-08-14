export type AIProvider = 'gemini' | 'openrouter' | 'ollama' | 'openai' | 'anthropic' | 'custom';

export type ModelRole = 'fast' | 'smart' | 'coding' | 'vision';

export interface ModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  modelId: string;
  role: ModelRole;
  maxTokens: number;
  temperature: number;
  topP?: number;
  isDefault?: boolean;
}

export type AgentType = 'general' | 'coding' | 'browser' | 'automation' | 'screen' | 'research';

export interface AgentConfig {
  id: AgentType;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  tools: string[];
  enabled: boolean;
  color?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  path?: string;
  content?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  model?: string;
  agentType?: AgentType;
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
  tokens?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  isStreaming?: boolean;
  thinking?: string;
  error?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  modelId: string;
  agentType: AgentType;
  pinned?: boolean;
  tags?: string[];
  systemPrompt?: string;
}

export type MemoryCategory = 'user_preference' | 'project_fact' | 'system_instruction' | 'entity' | 'custom';

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  category: MemoryCategory;
  tags: string[];
  source?: string;
  createdAt: string;
  updatedAt: string;
  importance?: 'low' | 'medium' | 'high';
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'agent_start' | 'agent_stop' | 'tool_call' | 'file_access' | 'browser_nav' | 'screen_capture' | 'system_exec' | 'workflow_run';
  status: 'running' | 'success' | 'error' | 'pending';
  title: string;
  description: string;
  details?: Record<string, any>;
  agentType?: AgentType;
}

export interface WorkflowStep {
  id: string;
  type: 'action' | 'condition' | 'agent_prompt' | 'wait' | 'web_request' | 'script';
  name: string;
  config: Record<string, any>;
  nextStepId?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: 'manual' | 'schedule' | 'event';
  schedule?: string;
  enabled: boolean;
  steps: WorkflowStep[];
  lastRun?: string;
  status?: 'idle' | 'running' | 'success' | 'failed';
  createdAt: string;
}

export interface PermissionRequest {
  id: string;
  title: string;
  description: string;
  type: 'file_system' | 'screen_capture' | 'browser_control' | 'terminal_exec' | 'network_request';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'granted' | 'denied';
  details?: Record<string, any>;
  timestamp: string;
}

export type Theme = 'dark' | 'light' | 'system';

export interface VoiceSettings {
  enabled: boolean;
  autoSpeak: boolean;
  voiceId: string;
  pitch: number;
  rate: number;
}

export interface DesktopSettings {
  autoStart: boolean;
  minimizeToTray: boolean;
  globalHotkey: string;
  allowTerminalExec: boolean;
  allowFileSystem: boolean;
  allowScreenCapture: boolean;
}

export interface MemorySettings {
  autoExtract: boolean;
  maxEntries: number;
  storageType: 'local' | 'synced';
}

export interface Settings {
  theme: Theme;
  defaultProvider: AIProvider;
  defaultModelId: string;
  apiKeys: {
    gemini?: string;
    openrouter?: string;
    openai?: string;
    anthropic?: string;
    customEndpoint?: string;
  };
  modelConfigs: ModelConfig[];
  voice: VoiceSettings;
  desktop: DesktopSettings;
  memory: MemorySettings;
  selectedAgent: AgentType;
}

export interface KnowledgeDocument {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
  chunkCount: number;
  status: 'processing' | 'indexed' | 'error';
  contentSnippet?: string;
  path?: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: ProjectFile[];
  content?: string;
  language?: string;
}
