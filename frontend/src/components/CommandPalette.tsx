import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MessageSquare, Bot, Zap, Database, BookOpen, Code2,
  Monitor, Globe, Settings, Sparkles, Sun, Moon, Mic, Download,
  Trash2, Plus, ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Command {
  id: string;
  label: string;
  category: string;
  icon: any;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  onNewChat: () => void;
  onClearChat: () => void;
  onToggleTheme: () => void;
  onExportChat: () => void;
  onVoiceMode: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open, onClose, onNavigate, onNewChat, onClearChat, onToggleTheme, onExportChat, onVoiceMode
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: 'new-chat', label: 'New Chat', category: 'Chat', icon: Plus, shortcut: 'Ctrl+N', action: () => { onNewChat(); onClose(); } },
    { id: 'clear-chat', label: 'Clear Current Chat', category: 'Chat', icon: Trash2, action: () => { onClearChat(); onClose(); } },
    { id: 'export-chat', label: 'Export Conversation', category: 'Chat', icon: Download, action: () => { onExportChat(); onClose(); } },
    { id: 'voice-mode', label: 'Start Voice Mode', category: 'Voice', icon: Mic, shortcut: 'Ctrl+Shift+V', action: () => { onVoiceMode(); onClose(); } },
    { id: 'nav-chat', label: 'Go to Chat', category: 'Navigation', icon: MessageSquare, action: () => { onNavigate('chat'); onClose(); } },
    { id: 'nav-agents', label: 'Go to AI Agents', category: 'Navigation', icon: Bot, action: () => { onNavigate('chat'); onClose(); } },
    { id: 'nav-coding', label: 'Go to Coding Workspace', category: 'Navigation', icon: Code2, action: () => { onNavigate('coding'); onClose(); } },
    { id: 'nav-automation', label: 'Go to Automation Hub', category: 'Navigation', icon: Zap, action: () => { onNavigate('automation'); onClose(); } },
    { id: 'nav-screen', label: 'Go to Screen Analysis', category: 'Navigation', icon: Monitor, action: () => { onNavigate('screen'); onClose(); } },
    { id: 'nav-browser', label: 'Go to Browser Agent', category: 'Navigation', icon: Globe, action: () => { onNavigate('browser'); onClose(); } },
    { id: 'nav-memory', label: 'Go to Memory', category: 'Navigation', icon: Database, action: () => { onNavigate('memory'); onClose(); } },
    { id: 'nav-knowledge', label: 'Go to Knowledge Base', category: 'Navigation', icon: BookOpen, action: () => { onNavigate('knowledge'); onClose(); } },
    { id: 'nav-settings', label: 'Go to Settings', category: 'Navigation', icon: Settings, action: () => { onNavigate('settings'); onClose(); } },
    { id: 'toggle-theme', label: 'Toggle Theme', category: 'Settings', icon: Sun, action: () => { onToggleTheme(); onClose(); } },
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[selectedIndex]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Group filtered commands by category
  const categories = Array.from(new Set(filtered.map(c => c.category)));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl mx-4"
          >
            <div className="glass-panel rounded-2xl border border-white/15 shadow-2xl overflow-hidden bg-[#0d0d14]">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type a command or search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                />
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white/5 rounded border border-white/10">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto p-2">
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">
                    No commands found for "{query}"
                  </div>
                ) : (
                  categories.map(cat => (
                    <div key={cat} className="mb-2">
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 py-1">
                        {cat}
                      </div>
                      {filtered.filter(c => c.category === cat).map((cmd) => {
                        const globalIndex = filtered.indexOf(cmd);
                        const Icon = cmd.icon;
                        const isSelected = globalIndex === selectedIndex;
                        return (
                          <button
                            key={cmd.id}
                            onClick={cmd.action}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
                              isSelected
                                ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/20 text-white border border-blue-500/30'
                                : 'text-gray-300 hover:bg-white/5'
                            )}
                          >
                            <Icon className={cn('w-4 h-4 shrink-0', isSelected ? 'text-blue-400' : 'text-gray-400')} />
                            <span className="flex-1 text-left">{cmd.label}</span>
                            {cmd.shortcut && (
                              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-500 bg-white/5 rounded border border-white/10">
                                {cmd.shortcut}
                              </kbd>
                            )}
                            {isSelected && <ArrowRight className="w-3.5 h-3.5 text-blue-400" />}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-[10px] text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10 font-mono">↵</kbd>
                    Select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Arcange AI Assistant
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
