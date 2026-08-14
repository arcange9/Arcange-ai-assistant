import { AIProvider, ChatRequest, ChatResponse, StreamChunk } from '../types.js';

export interface BaseProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  initialDelayMs?: number;
  requestsPerMinute?: number;
}

export abstract class BaseProvider implements AIProvider {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public models: string[] = [];

  protected apiKey?: string;
  protected baseUrl?: string;
  protected maxRetries: number;
  protected initialDelayMs: number;
  protected requestsPerMinute: number;
  private lastRequestTimes: number[] = [];

  constructor(options: BaseProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.maxRetries = options.maxRetries ?? 3;
    this.initialDelayMs = options.initialDelayMs ?? 1000;
    this.requestsPerMinute = options.requestsPerMinute ?? 60;
  }

  public abstract streamChat(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown>;
  public abstract chat(request: ChatRequest): Promise<ChatResponse>;
  public abstract listModels(): Promise<string[]>;

  protected async checkRateLimit(): Promise<void> {
    if (this.requestsPerMinute <= 0) return;

    const now = Date.now();
    const windowStart = now - 60000;
    
    // Filter out requests older than 1 minute
    this.lastRequestTimes = this.lastRequestTimes.filter(time => time > windowStart);

    if (this.lastRequestTimes.length >= this.requestsPerMinute) {
      const oldestInWindow = this.lastRequestTimes[0];
      const waitTime = 60000 - (now - oldestInWindow);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.lastRequestTimes.push(Date.now());
  }

  protected handleError(error: unknown, context: string): Error {
    const message = error instanceof Error ? error.message : String(error);
    const providerError = new Error(`[${this.name}] Error during ${context}: ${message}`);
    (providerError as any).originalError = error;
    return providerError;
  }

  protected async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.maxRetries,
    initialDelay: number = this.initialDelayMs
  ): Promise<T> {
    let attempt = 0;
    let delay = initialDelay;

    while (true) {
      try {
        await this.checkRateLimit();
        return await operation();
      } catch (error: any) {
        attempt++;
        
        // Don't retry client errors (400-499) except rate limiting (429)
        const status = error?.status || error?.statusCode || error?.response?.status;
        const isRateLimit = status === 429;
        const isClientError = status >= 400 && status < 500 && !isRateLimit;

        if (attempt > maxRetries || isClientError) {
          throw error;
        }

        const jitter = Math.random() * 200;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        delay *= 2;
      }
    }
  }

  protected parseSSEEvent(dataString: string): any | null {
    const trimmed = dataString.trim();
    if (!trimmed || trimmed === 'data: [DONE]') {
      return null;
    }
    if (trimmed.startsWith('data: ')) {
      try {
        return JSON.parse(trimmed.slice(6));
      } catch (e) {
        console.warn(`[${this.name}] Failed to parse SSE JSON:`, trimmed);
        return null;
      }
    }
    return null;
  }
}
