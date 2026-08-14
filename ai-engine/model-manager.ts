import { AIProvider, ModelConfig, ModelRole } from './types.js';
import { createProvider } from './providers/index.js';
import { PersistManager } from './memory/persist.js';
import * as path from 'path';

export interface ModelRoleAssignment {
  providerId: string;
  modelId: string;
}

export interface ModelManagerConfig {
  providers: Record<string, { apiKey?: string; baseUrl?: string }>;
  roleAssignments: Record<ModelRole, ModelRoleAssignment>;
}

const DEFAULT_CONFIG: ModelManagerConfig = {
  providers: {
    gemini: { apiKey: '' },
    openrouter: { apiKey: '' },
    ollama: { baseUrl: 'http://localhost:11434' },
    lmstudio: { baseUrl: 'http://localhost:1234/v1' }
  },
  roleAssignments: {
    fast: { providerId: 'gemini', modelId: 'gemini-1.5-flash' },
    smart: { providerId: 'gemini', modelId: 'gemini-1.5-pro' },
    coding: { providerId: 'openrouter', modelId: 'anthropic/claude-3.5-sonnet' },
    vision: { providerId: 'gemini', modelId: 'gemini-1.5-pro' }
  }
};

export class ModelManager {
  private providers: Map<string, AIProvider> = new Map();
  private config: ModelManagerConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'data', 'model-config.json');
    this.config = PersistManager.loadFromFileSync<ModelManagerConfig>(this.configPath, DEFAULT_CONFIG);
    this.initializeProviders();
  }

  private initializeProviders(): void {
    for (const [providerId, provConfig] of Object.entries(this.config.providers)) {
      try {
        const provider = createProvider(providerId, provConfig);
        this.providers.set(providerId, provider);
      } catch (err: any) {
        console.warn(`[ModelManager] Failed to initialize provider '${providerId}':`, err.message);
      }
    }
  }

  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(providerId: string): AIProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' is not registered or initialized.`);
    }
    return provider;
  }

  public getModelForRole(role: ModelRole): { provider: AIProvider; modelId: string } {
    const assignment = this.config.roleAssignments[role] || DEFAULT_CONFIG.roleAssignments[role];
    const provider = this.getProvider(assignment.providerId);
    return {
      provider,
      modelId: assignment.modelId
    };
  }

  public async setModelRole(role: ModelRole, providerId: string, modelId: string): Promise<void> {
    this.config.roleAssignments[role] = { providerId, modelId };
    await this.saveConfig();
  }

  public async updateProviderConfig(
    providerId: string,
    providerConfig: { apiKey?: string; baseUrl?: string }
  ): Promise<void> {
    this.config.providers[providerId] = {
      ...(this.config.providers[providerId] || {}),
      ...providerConfig
    };

    const newProvider = createProvider(providerId, this.config.providers[providerId]);
    this.providers.set(providerId, newProvider);

    await this.saveConfig();
  }

  public async getAvailableModels(providerId: string): Promise<string[]> {
    const provider = this.getProvider(providerId);
    return await provider.listModels();
  }

  public async saveConfig(customPath?: string): Promise<void> {
    const savePath = customPath || this.configPath;
    await PersistManager.saveToFile(savePath, this.config);
  }

  public async loadConfig(customPath?: string): Promise<void> {
    const loadPath = customPath || this.configPath;
    this.config = await PersistManager.loadFromFile<ModelManagerConfig>(loadPath, DEFAULT_CONFIG);
    this.initializeProviders();
  }

  public getConfig(): ModelManagerConfig {
    return JSON.parse(JSON.stringify(this.config));
  }
}
