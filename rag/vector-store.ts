import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentChunk, ChunkMetadata } from './processor';

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export interface VectorDocInfo {
  id: string;
  name: string;
  chunkCount: number;
  createdAt: string;
}

export interface VectorEntry {
  chunk: DocumentChunk;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface IVectorStore {
  add(chunks: DocumentChunk[], embeddings: number[][], metadata?: Record<string, any>): Promise<void>;
  search(queryEmbedding: number[], topK?: number, minScore?: number): Promise<SearchResult[]>;
  removeDocument(docId: string): Promise<boolean>;
  listDocuments(): Promise<VectorDocInfo[]>;
  save(): Promise<void>;
  load(): Promise<void>;
  clear(): Promise<void>;
}

export class VectorStore implements IVectorStore {
  private entries: VectorEntry[] = [];
  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath =
      storagePath ||
      path.join(process.cwd(), 'data', 'vector_store.json');
  }

  /**
   * Cosine Similarity calculation between two numerical vectors
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      // Scale or handle mismatch
      const minLen = Math.min(vecA.length, vecB.length);
      vecA = vecA.slice(0, minLen);
      vecB = vecB.slice(0, minLen);
    }

    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Add chunk documents and their vector embeddings to store
   */
  public async add(
    chunks: DocumentChunk[],
    embeddings: number[][],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error('Number of chunks does not match number of embeddings');
    }

    for (let i = 0; i < chunks.length; i++) {
      this.entries.push({
        chunk: chunks[i],
        embedding: embeddings[i],
        metadata: { ...metadata, ...(chunks[i].metadata || {}) },
      });
    }

    await this.save();
  }

  /**
   * Perform vector similarity search
   */
  public async search(
    queryEmbedding: number[],
    topK = 5,
    minScore = 0.0
  ): Promise<SearchResult[]> {
    if (this.entries.length === 0) {
      await this.load().catch(() => {});
    }

    const scoredResults: SearchResult[] = this.entries
      .map((entry) => {
        const score = this.cosineSimilarity(queryEmbedding, entry.embedding);
        return { chunk: entry.chunk, score };
      })
      .filter((res) => res.score >= minScore)
      .sort((a, b) => b.score - a.score);

    return scoredResults.slice(0, topK);
  }

  /**
   * Remove document chunks matching documentId
   */
  public async removeDocument(docId: string): Promise<boolean> {
    const initialCount = this.entries.length;
    this.entries = this.entries.filter(
      (e) => e.chunk.metadata.documentId !== docId && e.chunk.metadata.source !== docId
    );

    const removed = this.entries.length < initialCount;
    if (removed) {
      await this.save();
    }
    return removed;
  }

  /**
   * List unique ingested documents in store
   */
  public async listDocuments(): Promise<VectorDocInfo[]> {
    if (this.entries.length === 0) {
      await this.load().catch(() => {});
    }

    const docMap = new Map<string, { name: string; count: number }>();

    for (const entry of this.entries) {
      const docId = entry.chunk.metadata.documentId || entry.chunk.metadata.source;
      const docName = entry.chunk.metadata.source;

      if (!docMap.has(docId)) {
        docMap.set(docId, { name: docName, count: 1 });
      } else {
        const existing = docMap.get(docId)!;
        existing.count++;
      }
    }

    const result: VectorDocInfo[] = [];
    docMap.forEach((val, id) => {
      result.push({
        id,
        name: val.name,
        chunkCount: val.count,
        createdAt: new Date().toISOString(),
      });
    });

    return result;
  }

  /**
   * Persist vector store to disk
   */
  public async save(): Promise<void> {
    const dir = path.dirname(this.storagePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.storagePath, JSON.stringify(this.entries, null, 2), 'utf-8');
  }

  /**
   * Load vector store from disk
   */
  public async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      this.entries = JSON.parse(data);
    } catch {
      this.entries = [];
    }
  }

  /**
   * Clear all entries
   */
  public async clear(): Promise<void> {
    this.entries = [];
    await this.save();
  }

  /**
   * Get store status metrics
   */
  public async getStatus(): Promise<{ totalEntries: number; storagePath: string; sizeBytes: number }> {
    let sizeBytes = 0;
    try {
      const stats = await fs.stat(this.storagePath);
      sizeBytes = stats.size;
    } catch {}

    return {
      totalEntries: this.entries.length,
      storagePath: this.storagePath,
      sizeBytes,
    };
  }
}

export default VectorStore;
