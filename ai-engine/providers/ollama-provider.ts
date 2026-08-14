import { BaseProvider, BaseProviderOptions } from './base-provider.js';
import { ChatMessage, ChatRequest, ChatResponse, StreamChunk } from '../types.js';

export class OllamaProvider extends BaseProvider {
  public readonly id = 'ollama';
  public readonly name = 'Ollama (Local)';
  private defaultModel = 'llama3';

  constructor(baseUrl: string = 'http://localhost:11434', options: BaseProviderOptions = {}) {
    super({ ...options, baseUrl });
    this.models = ['llama3', 'mistral', 'codellama', 'phi3'];
  }

  private formatMessages(messages: ChatMessage[], systemInstruction?: string) {
    const formatted: Array<{ role: string; content: string; images?: string[] }> = [];

    if (systemInstruction) {
      formatted.push({
        role: 'system',
        content: systemInstruction
      });
    }

    for (const msg of messages) {
      const formattedMsg: { role: string; content: string; images?: string[] } = {
        role: msg.role,
        content: msg.content
      };

      if (msg.images && msg.images.length > 0) {
        // Ollama expects array of base64 string without data URI prefix
        formattedMsg.images = msg.images.map(img => {
          if (img.includes('base64,')) {
            return img.split('base64,')[1];
          }
          return img;
        });
      }

      formatted.push(formattedMsg);
    }

    return formatted;
  }

  public async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.retryWithExponentialBackoff(async () => {
      const model = request.model || this.defaultModel;
      const url = `${this.baseUrl}/api/chat`;

      const body = {
        model,
        messages: this.formatMessages(request.messages, request.systemInstruction),
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      return {
        id: `ollama-${Date.now()}`,
        model,
        content: data.message?.content || '',
        usage: data.prompt_eval_count !== undefined ? {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        } : undefined,
        finishReason: data.done ? 'stop' : undefined
      };
    }).catch(err => {
      throw this.handleError(err, 'chat');
    });
  }

  public async *streamChat(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const model = request.model || this.defaultModel;
    const url = `${this.baseUrl}/api/chat`;

    const body = {
      model,
      messages: this.formatMessages(request.messages, request.systemInstruction),
      stream: true,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens
      }
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (err) {
      throw this.handleError(err, 'streamChat connection');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw this.handleError(new Error(`Ollama HTTP ${response.status}: ${errorText}`), 'streamChat');
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
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            const delta = parsed.message?.content || '';
            const finishReason = parsed.done ? 'stop' : null;

            if (delta || finishReason) {
              yield {
                id: `ollama-stream-${Date.now()}`,
                content: delta,
                delta,
                finishReason
              };
            }
          } catch (e) {
            console.warn('[Ollama] Failed to parse NDJSON line:', trimmed);
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          const delta = parsed.message?.content || '';
          if (delta) {
            yield {
              id: `ollama-stream-${Date.now()}`,
              content: delta,
              delta,
              finishReason: parsed.done ? 'stop' : null
            };
          }
        } catch (e) {
          // ignore trailing partial line
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
      const url = `${this.baseUrl}/api/tags`;
      const response = await fetch(url);

      if (!response.ok) {
        return this.models;
      }

      const data = await response.json();
      if (Array.isArray(data.models)) {
        const names = data.models.map((m: any) => m.name);
        if (names.length > 0) {
          this.models = names;
        }
      }

      return this.models;
    }).catch(() => this.models);
  }
}
