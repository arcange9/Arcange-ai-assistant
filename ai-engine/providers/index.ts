import { AIProvider } from '../types.js';
import { BaseProviderOptions } from './base-provider.js';
import { GeminiProvider } from './gemini-provider.js';
import { OpenRouterProvider } from './openrouter-provider.js';
import { OllamaProvider } from './ollama-provider.js';

export interface ProviderConfig extends BaseProviderOptions {
  type: 'gemini' | 'openrouter' | 'ollama' | 'lmstudio' | string;
  apiKey?: string;
  baseUrl?: string;
}

export class LMStudioProvider extends OpenRouterProvider {
  public override readonly id = 'lmstudio';
  public override readonly name = 'LM Studio (Local)';

  constructor(baseUrl: string = 'http://localhost:1234/v1', options: BaseProviderOptions = {}) {
    super(options.apiKey || 'lm-studio', {
      ...options,
      baseUrl,
      siteUrl: 'http://localhost',
      siteName: 'LM Studio Local'
    });
    this.models = ['local-model'];
  }
}

export function createProvider(typeOrConfig: string | ProviderConfig, options: ProviderConfig = { type: '' }): AIProvider {
  let config: ProviderConfig;

  if (typeof typeOrConfig === 'string') {
    config = { ...options, type: typeOrConfig };
  } else {
    config = typeOrConfig;
  }

  const providerType = config.type.toLowerCase();

  switch (providerType) {
    case 'gemini':
    case 'google':
      return new GeminiProvider(config.apiKey || '', config);

    case 'openrouter':
      return new OpenRouterProvider(config.apiKey || '', config);

    case 'ollama':
      return new OllamaProvider(config.baseUrl || 'http://localhost:11434', config);

    case 'lmstudio':
    case 'lm-studio':
      return new LMStudioProvider(config.baseUrl || 'http://localhost:1234/v1', config);

    default:
      throw new Error(`Unsupported provider type: ${config.type}. Supported types: gemini, openrouter, ollama, lmstudio.`);
  }
}

export {
  BaseProvider,
  GeminiProvider,
  OpenRouterProvider,
  OllamaProvider
};
