import React from 'react';
import { Bot, Code2, Globe, Zap, Monitor, Search } from 'lucide-react';
import { AgentType } from '../types';
import { cn } from '../lib/utils';

interface AgentSelectorProps {
  selectedAgent: AgentType;
  onSelectAgent: (agent: AgentType) => void;
}

export const AGENT_OPTIONS: { id: AgentType; name: string; icon: any; color: string; desc: string }[] = [
  { id: 'general', name: 'General AI', icon: Bot, color: 'text-purple-400', desc: 'Versatile general assistant' },
  { id: 'coding', name: 'Coding Engineer', icon: Code2, color: 'text-blue-400', desc: 'Code drafting, debugging & terminal' },
  { id: 'browser', name: 'Browser Agent', icon: Globe, color: 'text-emerald-400', desc: 'Web scraping & navigation' },
  { id: 'automation', name: 'Automation Engine', icon: Zap, color: 'text-amber-400', desc: 'Multi-step workflow triggers' },
  { id: 'screen', name: 'Screen Vision', icon: Monitor, color: 'text-pink-400', desc: 'Live window & screen analysis' },
  { id: 'research', name: 'Deep Research', icon: Search, color: 'text-cyan-400', desc: 'Document & web synthesis' },
];

export const AgentSelector: React.FC<AgentSelectorProps> = ({ selectedAgent, onSelectAgent }) => {
  const current = AGENT_OPTIONS.find((a) => a.id === selectedAgent) || AGENT_OPTIONS[0];
  const Icon = current.icon;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
      {AGENT_OPTIONS.map((agent) => {
        const AgentIcon = agent.icon;
        const isSelected = agent.id === selectedAgent;

        return (
          <button
            key={agent.id}
            onClick={() => onSelectAgent(agent.id)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all shrink-0',
              isSelected
                ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            )}
            title={agent.desc}
          >
            <AgentIcon className={cn('w-3.5 h-3.5', isSelected ? agent.color : 'text-gray-400')} />
            <span>{agent.name}</span>
          </button>
        );
      })}
    </div>
  );
};
