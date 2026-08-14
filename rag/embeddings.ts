export type EmbeddingProvider = 'gemini' | 'openrouter';

export interface EmbeddingOptions {
  provider?: EmbeddingProvider;
  model?: string;
  dimension?: number;
  geminiApiKey?: string;
  openRouterApiKey?: string;
}

export class EmbeddingGenerator {
  private provider: EmbeddingProvider;
  private model: string;
  private dimension: number;
  private geminiApiKey: string;
  private openRouterApiKey: string;
  private cache: Map<string, number[]> = new Map();

  constructor(options: EmbeddingOptions = {}) {
    this.provider = options.provider || 'gemini';
    this.model = options.model || (this.provider === 'gemini' ? 'text-embedding-004' : 'openai/text-embedding-3-small');
    this.dimension = options.dimension || 768;
    this.geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    this.openRouterApiKey = options.openRouterApiKey || process.env.OPENROUTER_API_KEY || '';
  }

  /**
   * Deterministic local fallback embedding generator (384/768 dimensional normalized vector)
   */
  private generateLocalFallbackEmbedding(text: string, dim: number = this.dimension): number[] {
    const vector = new Array(dim).fill(0);
    const clean = text.toLowerCase().replace(/[^\w\s]/g, '');
    const tokens = clean.split(/\s+/).filter(Boolean);

    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        const idx = (charCode * 31 + j * 17 + i * 7) % dim;
        vector[idx] += 1.0;
      }
    }

    // Normalization
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1.0;
    return vector.map((val) => val / magnitude);
  }

  /**
   * Generate embedding vector for a single string text
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = `${this.provider}:${this.model}:${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let embedding: number[];

    try {
      if (this.provider === 'gemini') {
        embedding = await this.generateGeminiEmbedding(text);
      } else {
        embedding = await this.generateOpenRouterEmbedding(text);
      }
    } catch (err) {
      // Fall back gracefully to deterministic local vector generator
      embedding = this.generateLocalFallbackEmbedding(text);
    }

    this.cache.set(cacheKey, embedding);
    return embedding;
  }

  /**
   * Batch generation of embeddings for multiple texts
   */
  public async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const emb = await this.generateEmbedding(text);
      results.push(emb);
    }
    return results;
  }

  /**
   * Gemini Embedding REST API call
   */
  private async generateGeminiEmbedding(text: string): Promise<number[]> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.geminiApiKey}`;

    const payload = {
      model: `models/${this.model}`,
      content: {
        parts: [{ text }],
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Embedding error (${response.status}): ${errText}`);
    }

    const json: any = await response.json();
    const values = json.embedding?.values;
    if (!values || !Array.isArray(values)) {
      throw new Error('Invalid response structure from Gemini Embedding API');
    }

    return values;
  }

  /**
   * OpenRouter Embeddings REST API call
   */
  private async generateOpenRouterEmbedding(text: string): Promise<number[]> {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter API key is not configured.');
    }

    const url = 'https://openrouter.ai/api/v1/embeddings';

    const payload = {
      model: this.model,
      input: text,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openRouterApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter Embedding error (${response.status}): ${errText}`);
    }

    const json: any = await response.json();
    const embedding = json.data?.[0]?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid response structure from OpenRouter Embedding API');
    }

    return embedding;
  }

  /**
   * Clear in-memory embedding cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

export default EmbeddingGenerator;
