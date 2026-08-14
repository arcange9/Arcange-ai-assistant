import React, { useState } from 'react';
import { Database, Search, Plus, Trash2, Brain, Filter } from 'lucide-react';
import { useMemoryStore } from '../stores/memoryStore';
import { cn } from '../lib/utils';
import { MemoryCategory } from '../types';

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  user_preference: 'User Preferences',
  project_fact: 'Projects',
  system_instruction: 'Instructions',
  entity: 'Entities',
  custom: 'Custom',
};

const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  user_preference: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  project_fact: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  system_instruction: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  entity: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  custom: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

export const MemoryPanel: React.FC = () => {
  const { entries, addMemory, deleteMemory, clearAllMemory, setSearchQuery, setSelectedCategory, searchQuery, selectedCategory } = useMemoryStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ key: '', value: '', category: 'custom' as MemoryCategory });

  const filtered = entries.filter((e) => {
    const matchSearch = !searchQuery ||
      e.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleAdd = () => {
    if (!newEntry.key.trim() || !newEntry.value.trim()) return;
    addMemory({
      key: newEntry.key,
      value: newEntry.value,
      category: newEntry.category,
      tags: [],
    });
    setNewEntry({ key: '', value: '', category: 'custom' });
    setShowAdd(false);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Context Memory</h2>
            <p className="text-xs text-gray-400">{entries.length} entries stored locally</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium hover:shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            Add Memory
          </button>
          {entries.length > 0 && (
            <button
              onClick={() => { if (confirm('Clear ALL memory? This cannot be undone.')) clearAllMemory(); }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/20 transition"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Memory key (e.g., favorite_editor)"
              value={newEntry.key}
              onChange={(e) => setNewEntry({ ...newEntry, key: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
            <select
              value={newEntry.category}
              onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value as MemoryCategory })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val} className="bg-gray-800">{label}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Memory value (e.g., VS Code with dark theme and Material Icon Theme)"
            value={newEntry.value}
            onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white">Cancel</button>
            <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500">Save</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search memory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as any)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="all" className="bg-gray-800">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val} className="bg-gray-800">{label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Database className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">{entries.length === 0 ? 'No memories yet' : 'No matches found'}</p>
            <p className="text-xs mt-1">{entries.length === 0 ? 'Add a memory entry to get started' : 'Try a different search'}</p>
          </div>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} className="group p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-white">{entry.key}</span>
                    <span className={cn('px-1.5 py-0.5 text-[10px] rounded border', CATEGORY_COLORS[entry.category])}>
                      {CATEGORY_LABELS[entry.category]}
                    </span>
                    {entry.importance && (
                      <span className={cn(
                        'px-1 py-0.5 text-[9px] rounded',
                        entry.importance === 'high' ? 'bg-red-500/20 text-red-300' :
                        entry.importance === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-gray-500/20 text-gray-300'
                      )}>
                        {entry.importance}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 break-words">{entry.value}</p>
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-400 font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteMemory(entry.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
