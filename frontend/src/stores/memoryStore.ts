import { create } from 'zustand';
import { MemoryEntry, MemoryCategory } from '../types';
import { generateId } from '../lib/utils';

interface MemoryStore {
  entries: MemoryEntry[];
  searchQuery: string;
  selectedCategory: MemoryCategory | 'all';
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: MemoryCategory | 'all') => void;
  addMemory: (entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMemory: (id: string, updates: Partial<MemoryEntry>) => void;
  deleteMemory: (id: string) => void;
  clearAllMemory: () => void;
  getFilteredEntries: () => MemoryEntry[];
}

const INITIAL_MEMORIES: MemoryEntry[] = [
  {
    id: 'mem-1',
    key: 'Preferred Language & Framework',
    value: 'TypeScript with React, Vite, and Tailwind CSS',
    category: 'user_preference',
    tags: ['coding', 'react', 'typescript'],
    source: 'user_dialog',
    importance: 'high',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'mem-2',
    key: 'Project Workspace',
    value: 'Arcange AI Assistant Desktop App',
    category: 'project_fact',
    tags: ['arcange', 'electron', 'desktop'],
    source: 'system_auto',
    importance: 'high',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'mem-3',
    key: 'Default AI Provider',
    value: 'Google Gemini 1.5 Flash with OpenRouter fallback',
    category: 'system_instruction',
    tags: ['llm', 'api', 'gemini'],
    source: 'settings',
    importance: 'medium',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  }
];

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  entries: INITIAL_MEMORIES,
  searchQuery: '',
  selectedCategory: 'all',

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  addMemory: (entry) => {
    const newEntry: MemoryEntry = {
      ...entry,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set((state) => ({
      entries: [newEntry, ...state.entries]
    }));
  },

  updateMemory: (id, updates) => {
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.id === id
          ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
          : entry
      )
    }));
  },

  deleteMemory: (id) => {
    set((state) => ({
      entries: state.entries.filter((entry) => entry.id !== id)
    }));
  },

  clearAllMemory: () => set({ entries: [] }),

  getFilteredEntries: () => {
    const { entries, searchQuery, selectedCategory } = get();
    return entries.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.key.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }
}));
