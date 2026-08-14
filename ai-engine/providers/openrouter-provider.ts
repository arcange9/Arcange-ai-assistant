import { BaseProvider, BaseProviderOptions } from './base-provider.js';
import { ChatMessage, ChatRequest, ChatResponse, StreamChunk } from '../types.js';

export interface OpenRouterProviderOptions extends BaseProviderOptions {
  siteUrl?: string;
  siteName?: string;
}

export class OpenRouterProvider extends BaseProvider {
  public readonly id = 'openrouter';
  public readonly name = 'OpenRouter';
  private defaultModel = 'anthropic/claude-3.5-sonnet';
  private siteUrl: string;
  private siteName: string;

  constructor(apiKey: string, options: OpenRouterProviderOptions = {}) {
    super({ ...options, apiKey });
    this.baseUrl = options.baseUrl || 'https://openrouter.ai/api/v1';
    this.siteUrl = options.siteUrl || 'https://arcange.ai';
    this.siteName = options.siteName || 'Arcange AI Assistant';
    this.models = [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.1-70b-instruct'
    ];
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'HTTP-Referer': this.siteUrl,
      'X-Title': this.siteName
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private formatMessages(messages: ChatMessage[], systemInstruction?: string): any[] {
    const formatted: any[] = [];

    if (systemInstruction) {
      formatted.push({
        role: 'system',
        content: systemInstruction
      });
    }

    for (const msg of messages) {
      if (msg.images && msg.images.length > 0) {
        const contentParts: any[] = [];
        if (msg.content) {
          contentParts.push({ type: 'text', text: msg.content });
        }
        for (const img of msg.images) {
          const url = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
          contentParts.push({
            type: 'image_url',
            image_url: { url }
          });
        }
        formatted.push({
          role: msg.role,
          content: contentParts
        });
      } else {
        formatted.push({
          role: msg.role,
          content: msg.content,
          name: msg.name
        });
      }
    }

    return formatted;
  }

  public async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.retryWithExponentialBackoff(async () => {
      const model = request.model || this.defaultModel;
      const url = `${this.baseUrl}/chat/completions`;

      const body: Record<string, any> = {
        model,
        messages: this.formatMessages(request.messages, request.systemInstruction),
        stream: false
      };

      if (request.temperature !== undefined) body.temperature = request.temperature;
      if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;
      if (request.tools && request.tools.length > 0) {
        body.tools = request.tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }
        }));
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const message = choice?.message;

      const toolCalls = message?.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        params: JSON.parse(tc.function.arguments || '{}')
      }));

      return {
        id: data.id || `openrouter-${Date.now()}`,
        model: data.model || model,
        content: message?.content || '',
        toolCalls,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0
        } : undefined,
        finishReason: choice?.finish_reason || 'stop'
      };
    }).catch(err => {
      throw this.handleError(err, 'chat');
    });
  }

  public async *streamChat(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const model = request.model || this.defaultModel;
    const url = `${this.baseUrl}/chat/completions`;

    const body: Record<string, any> = {
      model,
      messages: this.formatMessages(request.messages, request.systemInstruction),
      stream: true
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });
    } catch (err) {
      throw this.handleError(err, 'streamChat connection');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw this.handleError(new Error(`OpenRouter HTTP ${response.status}: ${errorText}`), 'streamChat');
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const parsed = this.parseSSEEvent(line);
          if (!parsed) continue;

          const choice = parsed.choices?.[0];
          const deltaContent = choice?.delta?.content || '';
          const finishReason = choice?.finish_reason || null;

          if (deltaContent || finishReason) {
            yield {
              id: parsed.id || `openrouter-stream-${Date.now()}`,
              content: deltaContent,
              delta: deltaContent,
              finishReason
            };
          }
        }
      }

      if (buffer.trim()) {
        const parsed = this.parseSSEEvent(buffer);
        if (parsed) {
          const choice = parsed.choices?.[0];
          const deltaContent = choice?.delta?.content || '';
          if (deltaContent) {
            yield {
              id: parsed.id || `openrouter-stream-${Date.now()}`,
              content: deltaContent,
              delta: deltaContent,
              finishReason: choice?.finish_reason || 'stop'
            };
          }
        }
      }
    } catch (err) {
      throw this.handleError(err, 'streamChat reader');
    } finally {
      reader.releaseLock();
    }
  }

  public async listModels(): Promise<string[]> {
    return this.retryWithExponentialBackoff(async () => {
      const url = `${this.baseUrl}/models`;
      const response = await fetch(url, { headers: this.getHeaders() });

      if (!response.ok) {
        return this.models;
      }

      const data = await response.json();
      if (Array.isArray(data.data)) {
        const available = data.data.map((m: any) => m.id);
        if (available.length > 0) {
          this.models = available;
        }
      }

      return this.models;
    }).catch(() => this.models);
  }
}
