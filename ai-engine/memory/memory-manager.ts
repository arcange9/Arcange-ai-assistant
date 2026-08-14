import { MemoryCategory, MemoryItem } from '../types.js';
import { PersistManager } from './persist.js';
import * as path from 'path';

export interface MemoryManagerOptions {
  storagePath?: string;
  maxEntries?: number;
}

export class MemoryManager {
  private memories: Map<string, MemoryItem> = new Map();
  private storagePath: string;
  private maxEntries: number;

  constructor(options: MemoryManagerOptions = {}) {
    this.storagePath = options.storagePath || path.join(process.cwd(), 'data', 'arcange-memory.json');
    this.maxEntries = options.maxEntries || 1000;
    this.loadSync();
  }

  private loadSync(): void {
    const loaded = PersistManager.loadFromFileSync<MemoryItem[]>(this.storagePath, []);
    this.memories.clear();
    for (const item of loaded) {
      this.memories.set(item.id, item);
    }
  }

  private async save(): Promise<void> {
    const items = Array.from(this.memories.values());
    await PersistManager.saveToFile(this.storagePath, items);
  }

  public async add(
    category: MemoryCategory,
    content: string,
    tags: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<MemoryItem> {
    const now = Date.now();
    const id = `mem_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const newItem: MemoryItem = {
      id,
      category,
      content,
      tags,
      metadata,
      createdAt: now,
      updatedAt: now
    };

    // Maintain max entries limit by removing oldest items if capacity exceeded
    if (this.memories.size >= this.maxEntries) {
      const oldestKey = Array.from(this.memories.values())
        .sort((a, b) => a.createdAt - b.createdAt)[0]?.id;
      if (oldestKey) {
        this.memories.delete(oldestKey);
      }
    }

    this.memories.set(id, newItem);
    await this.save();
    return newItem;
  }

  public get(id: string): MemoryItem | null {
    return this.memories.get(id) || null;
  }

  public listByCategory(category: MemoryCategory): MemoryItem[] {
    return Array.from(this.memories.values())
      .filter(item => item.category === category)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public search(query: string, limit: number = 10): MemoryItem[] {
    if (!query || !query.trim()) {
      return Array.from(this.memories.values())
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    }

    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scored: Array<{ item: MemoryItem; score: number }> = [];

    for (const item of this.memories.values()) {
      let score = 0;
      const contentLower = item.content.toLowerCase();
      const tagsLower = (item.tags || []).join(' ').toLowerCase();
      const categoryLower = item.category.toLowerCase();

      for (const term of queryTerms) {
        if (contentLower.includes(term)) score += 3;
        if (tagsLower.includes(term)) score += 2;
        if (categoryLower.includes(term)) score += 1;
      }

      if (score > 0) {
        scored.push({ item, score });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score || b.item.createdAt - a.item.createdAt)
      .slice(0, limit)
      .map(s => s.item);
  }

  public async delete(id: string): Promise<boolean> {
    const existed = this.memories.delete(id);
    if (existed) {
      await this.save();
    }
    return existed;
  }

  public async clearAll(): Promise<void> {
    this.memories.clear();
    await this.save();
  }

  public getAll(): MemoryItem[] {
    return Array.from(this.memories.values()).sort((a, b) => b.createdAt - a.createdAt);
  }
}
