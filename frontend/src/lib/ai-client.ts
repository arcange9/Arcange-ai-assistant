import { Message, AIProvider } from '../types';

export interface StreamChatOptions {
  messages: Message[];
  provider: AIProvider;
  modelId: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  onChunk: (chunk: string) => void;
  onThinking?: (thinking: string) => void;
  onError: (error: Error) => void;
  onComplete: (fullText: string) => void;
  signal?: AbortSignal;
}

export async function streamChatCompletion(options: StreamChatOptions): Promise<void> {
  const {
    messages,
    provider,
    modelId,
    apiKey,
    systemPrompt,
    temperature = 0.7,
    maxTokens = 4096,
    onChunk,
    onError,
    onComplete,
    signal
  } = options;

  try {
    if (provider === 'gemini' && apiKey) {
      await streamGemini({
        messages,
        modelId,
        apiKey,
        systemPrompt,
        temperature,
        maxTokens,
        onChunk,
        onComplete,
        signal
      });
    } else if (provider === 'openrouter' && apiKey) {
      await streamOpenRouter({
        messages,
        modelId,
        apiKey,
        systemPrompt,
        temperature,
        maxTokens,
        onChunk,
        onComplete,
        signal
      });
    } else {
      // Fallback simulated streaming response if API key is not configured or offline mode
      await simulateStream({
        messages,
        modelId,
        provider,
        onChunk,
        onComplete,
        signal
      });
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('Stream aborted by user');
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

async function streamGemini({
  messages,
  modelId,
  apiKey,
  systemPrompt,
  temperature,
  maxTokens,
  onChunk,
  onComplete,
  signal
}: Omit<StreamChatOptions, 'provider' | 'onError'> & { apiKey: string }) {
  const effectiveModel = modelId || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:streamGenerateContent?key=${apiKey}&alt=sse`;

  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const body: any = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    }
  };

  if (systemPrompt) {
    body.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body reader not available');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.replace('data: ', '').trim();
        if (!jsonStr) continue;
        try {
          const data = JSON.parse(jsonStr);
          const candidate = data.candidates?.[0];
          const textPart = candidate?.content?.parts?.[0]?.text;
          if (textPart) {
            fullContent += textPart;
            onChunk(textPart);
          }
        } catch (e) {
          // parse error ignored for partial JSON chunks
        }
      }
    }
  }

  onComplete(fullContent);
}

async function streamOpenRouter({
  messages,
  modelId,
  apiKey,
  systemPrompt,
  temperature,
  maxTokens,
  onChunk,
  onComplete,
  signal
}: Omit<StreamChatOptions, 'provider' | 'onError'> & { apiKey: string }) {
  const effectiveModel = modelId || 'anthropic/claude-3.5-sonnet';
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }

  for (const m of messages) {
    formattedMessages.push({
      role: m.role,
      content: m.content
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://arcange.ai',
      'X-Title': 'Arcange AI Assistant'
    },
    body: JSON.stringify({
      model: effectiveModel,
      messages: formattedMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true
    }),
    signal
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenRouter API error ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body reader not available');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.replace('data: ', '').trim();
        if (jsonStr === '[DONE]') break;
        try {
          const data = JSON.parse(jsonStr);
          const delta = data.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onChunk(delta);
          }
        } catch (e) {
          // ignore stream parse errors
        }
      }
    }
  }

  onComplete(fullContent);
}

async function simulateStream({
  messages,
  modelId,
  provider,
  onChunk,
  onComplete,
  signal
}: {
  messages: Message[];
  modelId: string;
  provider: AIProvider;
  onChunk: (chunk: string) => void;
  onComplete: (fullText: string) => void;
  signal?: AbortSignal;
}) {
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || 'Hello';
  
  let simulatedResponse = `I am **Arcange AI Assistant**, running with model \`${modelId || 'Arcange Engine'}\` (${provider}).\n\n`;

  if (lastUserMsg.toLowerCase().includes('hello') || lastUserMsg.toLowerCase().includes('hi')) {
    simulatedResponse += `Hello! How can I assist you with code, automation, research, or system analysis today?`;
  } else if (lastUserMsg.toLowerCase().includes('code') || lastUserMsg.toLowerCase().includes('react')) {
    simulatedResponse += `Here is a quick TypeScript snippet demonstrating high-performance reactive state management:\n\n\`\`\`typescript\nimport { create } from 'zustand';\n\ninterface SystemState {\n  status: 'idle' | 'executing' | 'error';\n  setStatus: (status: 'idle' | 'executing' | 'error') => void;\n}\n\nexport const useSystemStore = create<SystemState>((set) => ({\n  status: 'idle',\n  setStatus: (status) => set({ status }),\n}));\n\`\`\`\n\nIs there a specific feature or file you would like me to draft or execute?`;
  } else {
    simulatedResponse += `I've analyzed your query regarding: "${lastUserMsg}".\n\nKey actions available:\n- **Execute Local Code**: Run terminal commands or automated scripts.\n- **Browser Inspection**: Automate navigation and extract page context.\n- **Memory Indexing**: Save key concepts to your persistent knowledge store.\n\nTo enable full live model generation, please add your Gemini or OpenRouter API key in **Settings > AI Providers**.`;
  }

  const words = simulatedResponse.split(' ');
  let fullText = '';

  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) {
      break;
    }
    const word = (i === 0 ? '' : ' ') + words[i];
    fullText += word;
    onChunk(word);
    await new Promise(resolve => setTimeout(resolve, 35));
  }

  onComplete(fullText);
}
