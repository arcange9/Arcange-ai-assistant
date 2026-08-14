import { DocumentProcessor, DocumentInfo, DocumentChunk } from './processor';
import { EmbeddingGenerator, EmbeddingProvider } from './embeddings';
import { VectorStore, SearchResult, VectorDocInfo } from './vector-store';

export interface RAGManagerOptions {
  storagePath?: string;
  embeddingProvider?: EmbeddingProvider;
  embeddingModel?: string;
  geminiApiKey?: string;
  openRouterApiKey?: string;
}

export interface GroundedAnswer {
  question: string;
  answer: string;
  sources: SearchResult[];
  contextUsed: string;
}

export class RAGManager {
  private processor: DocumentProcessor;
  private embedder: EmbeddingGenerator;
  private vectorStore: VectorStore;
  private geminiApiKey: string;
  private openRouterApiKey: string;

  constructor(options: RAGManagerOptions = {}) {
    this.processor = new DocumentProcessor();
    this.embedder = new EmbeddingGenerator({
      provider: options.embeddingProvider,
      model: options.embeddingModel,
      geminiApiKey: options.geminiApiKey,
      openRouterApiKey: options.openRouterApiKey,
    });
    this.vectorStore = new VectorStore(options.storagePath);
    this.geminiApiKey =
      options.geminiApiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';
    this.openRouterApiKey =
      options.openRouterApiKey ||
      process.env.OPENROUTER_API_KEY ||
      '';
  }

  /**
   * Ingest a document: process, chunk, embed, and store in vector database
   */
  public async ingestDocument(
    filePath: string
  ): Promise<{ documentInfo: DocumentInfo; chunkCount: number }> {
    // 1. Process document into chunks
    const processed = await this.processor.processDocument(filePath);

    // 2. Generate embeddings for chunks
    const chunkTexts = processed.chunks.map((c) => c.text);
    const embeddings = await this.embedder.generateBatchEmbeddings(chunkTexts);

    // 3. Store in vector database
    await this.vectorStore.add(processed.chunks, embeddings, {
      fileName: processed.documentInfo.name,
      fileType: processed.documentInfo.type,
      fileSize: processed.documentInfo.size,
    });

    return {
      documentInfo: processed.documentInfo,
      chunkCount: processed.chunks.length,
    };
  }

  /**
   * Query vector store for relevant document chunks
   */
  public async query(question: string, topK = 5): Promise<SearchResult[]> {
    const questionEmbedding = await this.embedder.generateEmbedding(question);
    return await this.vectorStore.search(questionEmbedding, topK);
  }

  /**
   * Perform RAG query: retrieve relevant contexts and generate AI answer grounded in sources
   */
  public async queryWithAI(
    question: string,
    provider: 'gemini' | 'openrouter' = 'gemini',
    model?: string,
    topK = 5
  ): Promise<GroundedAnswer> {
    // 1. Retrieve top matching chunks
    const sources = await this.query(question, topK);

    if (sources.length === 0) {
      return {
        question,
        answer: 'No relevant document context found in vector store to answer the question.',
        sources: [],
        contextUsed: '',
      };
    }

    // 2. Construct grounded context string
    const contextText = sources
      .map(
        (src, idx) =>
          `[Source ${idx + 1}: ${src.chunk.metadata.source} (Section: ${
            src.chunk.metadata.sectionHeader || 'N/A'
          }, Relevance Score: ${(src.score * 100).toFixed(1)}%)]\n${src.chunk.text}`
      )
      .join('\n\n---\n\n');

    const prompt = `You are Arcange AI Knowledge Assistant. Answer the user's question accurately based ONLY on the provided context below.
If the answer cannot be determined from the context, state clearly that the provided context does not contain enough information.

CONTEXT:
${contextText}

QUESTION:
${question}

ANSWER:`;

    let answer = '';

    if (provider === 'gemini') {
      answer = await this.callGeminiLLM(prompt, model || 'gemini-1.5-flash');
    } else {
      answer = await this.callOpenRouterLLM(prompt, model || 'google/gemini-flash-1.5');
    }

    return {
      question,
      answer,
      sources,
      contextUsed: contextText,
    };
  }

  /**
   * Call Gemini LLM API
   */
  private async callGeminiLLM(prompt: string, model: string): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key is not configured.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini LLM error (${response.status}): ${errText}`);
    }

    const json: any = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  }

  /**
   * Call OpenRouter LLM API
   */
  private async callOpenRouterLLM(prompt: string, model: string): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error('OpenRouter API key is not configured.');
    }

    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openRouterApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter LLM error (${response.status}): ${errText}`);
    }

    const json: any = await response.json();
    return json.choices?.[0]?.message?.content?.trim() || '';
  }

  /**
   * List all ingested documents
   */
  public async listDocuments(): Promise<VectorDocInfo[]> {
    return await this.vectorStore.listDocuments();
  }

  /**
   * Delete a document by ID
   */
  public async deleteDocument(docId: string): Promise<boolean> {
    return await this.vectorStore.removeDocument(docId);
  }

  /**
   * Clear all documents and vectors
   */
  public async clearAll(): Promise<void> {
    await this.vectorStore.clear();
  }

  /**
   * Get RAG storage status metrics
   */
  public async getStatus(): Promise<{
    totalDocs: number;
    totalChunks: number;
    storageSizeBytes: number;
    storagePath: string;
  }> {
    const docs = await this.listDocuments();
    const status = await this.vectorStore.getStatus();

    return {
      totalDocs: docs.length,
      totalChunks: status.totalEntries,
      storageSizeBytes: status.sizeBytes,
      storagePath: status.storagePath,
    };
  }
}

export default RAGManager;
