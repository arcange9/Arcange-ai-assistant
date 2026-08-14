import { BaseProvider, BaseProviderOptions } from './base-provider.js';
import { ChatMessage, ChatRequest, ChatResponse, StreamChunk } from '../types.js';

export class GeminiProvider extends BaseProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini';
  private defaultModel = 'gemini-1.5-pro';

  constructor(apiKey: string, options: Omit<BaseProviderOptions, 'apiKey'> = {}) {
    super({ ...options, apiKey });
    this.models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
  }

  private mapRoleToGemini(role: string): string {
    if (role === 'assistant') return 'model';
    if (role === 'system') return 'user';
    return 'user';
  }

  private extractBase64AndMime(dataUrl: string): { mimeType: string; data: string } {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
    return { mimeType: 'image/jpeg', data: dataUrl };
  }

  private formatRequestBody(request: ChatRequest) {
    const contents: Array<{ role: string; parts: Array<Record<string, any>> }> = [];
    let systemInstruction: { parts: Array<{ text: string }> } | undefined = undefined;

    if (request.systemInstruction) {
      systemInstruction = {
        parts: [{ text: request.systemInstruction }]
      };
    }

    for (const msg of request.messages) {
      if (msg.role === 'system' && !systemInstruction) {
        systemInstruction = {
          parts: [{ text: msg.content }]
        };
        continue;
      }

      const parts: Array<Record<string, any>> = [];

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (msg.images && msg.images.length > 0) {
        for (const img of msg.images) {
          const { mimeType, data } = this.extractBase64AndMime(img);
          parts.push({
            inlineData: {
              mimeType,
              data
            }
          });
        }
      }

      if (parts.length > 0) {
        contents.push({
          role: this.mapRoleToGemini(msg.role),
          parts
        });
      }
    }

    const generationConfig: Record<string, any> = {};
    if (request.temperature !== undefined) {
      generationConfig.temperature = request.temperature;
    }
    if (request.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = request.maxTokens;
    }

    const body: Record<string, any> = { contents };
    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }
    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    return body;
  }

  public async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.retryWithExponentialBackoff(async () => {
      if (!this.apiKey) {
        throw new Error('Gemini API key is required');
      }

      const model = request.model || this.defaultModel;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      const requestBody = this.formatRequestBody(request);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const textParts = candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean) || [];
      const content = textParts.join('');

      const usage = data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0
      } : undefined;

      return {
        id: `gemini-${Date.now()}`,
        model,
        content,
        usage,
        finishReason: candidate?.finishReason || 'STOP'
      };
    }).catch(err => {
      throw this.handleError(err, 'chat');
    });
  }

  public async *streamChat(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is required');
    }

    const model = request.model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;
    const requestBody = this.formatRequestBody(request);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
    } catch (err) {
      throw this.handleError(err, 'streamChat setup');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw this.handleError(new Error(`Gemini API HTTP ${response.status}: ${errorText}`), 'streamChat');
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

          const candidate = parsed.candidates?.[0];
          const textParts = candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean) || [];
          const deltaText = textParts.join('');

          if (deltaText || candidate?.finishReason) {
            yield {
              id: `gemini-stream-${Date.now()}`,
              content: deltaText,
              delta: deltaText,
              finishReason: candidate?.finishReason || null
            };
          }
        }
      }

      if (buffer.trim()) {
        const parsed = this.parseSSEEvent(buffer);
        if (parsed) {
          const candidate = parsed.candidates?.[0];
          const textParts = candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean) || [];
          const deltaText = textParts.join('');
          if (deltaText) {
            yield {
              id: `gemini-stream-${Date.now()}`,
              content: deltaText,
              delta: deltaText,
              finishReason: candidate?.finishReason || 'STOP'
            };
          }
        }
      }
    } catch (err) {
      throw this.handleError(err, 'streamChat reading');
    } finally {
      reader.releaseLock();
    }
  }

  public async listModels(): Promise<string[]> {
    return this.retryWithExponentialBackoff(async () => {
      if (!this.apiKey) return this.models;

      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        return this.models;
      }

      const data = await response.json();
      if (Array.isArray(data.models)) {
        const available = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => m.name.replace(/^models\//, ''));
        if (available.length > 0) {
          this.models = available;
        }
      }

      return this.models;
    }).catch(() => this.models);
  }
}
