import React, { useState, useRef, useEffect } from 'react';
import { Cpu, ChevronDown, Check, Zap, Brain, Code, Eye, Sliders } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { ModelConfig, ModelRole } from '../types';
import { cn } from '../lib/utils';

export const ModelSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { modelConfigs, defaultModelId, setDefaultModelId, updateModelConfig } = useSettingsStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeModel = modelConfigs.find((m) => m.id === defaultModelId) || modelConfigs[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleIcon = (role: ModelRole) => {
    switch (role) {
      case 'fast':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'smart':
        return <Brain className="w-3.5 h-3.5 text-purple-400" />;
      case 'coding':
        return <Code className="w-3.5 h-3.5 text-blue-400" />;
      case 'vision':
        return <Eye className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-arcange-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-200 transition"
      >
        <Cpu className="w-3.5 h-3.5 text-arcange-400" />
        <span className="font-semibold">{activeModel?.name || 'Select Model'}</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 uppercase tracking-wider text-gray-400 font-mono">
          {activeModel?.provider}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 glass-panel rounded-2xl border border-white/15 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>Select Active LLM</span>
            <Sliders className="w-3.5 h-3.5" />
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {modelConfigs.map((model) => {
              const isSelected = model.id === defaultModelId;
              return (
                <div
                  key={model.id}
                  onClick={() => {
                    setDefaultModelId(model.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'p-2.5 rounded-xl cursor-pointer border transition flex flex-col gap-1',
                    isSelected
                      ? 'bg-arcange-500/15 border-arcange-500/40 text-white'
                      : 'border-white/5 hover:bg-white/5 text-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-xs">
                      {getRoleIcon(model.role)}
                      <span>{model.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-arcange-400" />}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pl-5">
                    <span>Role: {model.role.toUpperCase()}</span>
                    <span>Max: {model.maxTokens} tokens</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Temperature Slider for Active Model */}
          {activeModel && (
            <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Temperature ({activeModel.temperature})</span>
                <span className="text-[10px] text-gray-500 font-mono">
                  {activeModel.temperature < 0.4 ? 'Precise' : activeModel.temperature > 0.8 ? 'Creative' : 'Balanced'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={activeModel.temperature}
                onChange={(e) =>
                  updateModelConfig(activeModel.id, { temperature: parseFloat(e.target.value) })
                }
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-arcange-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
