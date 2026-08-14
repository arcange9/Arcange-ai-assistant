import React from 'react';
import { Code2, Globe, FolderTree, Camera, Zap } from 'lucide-react';

interface SuggestionCardsProps {
  onSelectPrompt: (text: string) => void;
}

const SUGGESTIONS = [
  {
    icon: Code2,
    title: 'Create a Project',
    prompt: 'Open VS Code, create a folder called ArcangeProject on my Desktop, create a Python file with a simple AI chatbot, and run it.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: Globe,
    title: 'Web Research',
    prompt: 'Search the web for the latest computer architecture tutorials and summarize the top 3 results.',
    gradient: 'from-purple-500/20 to-pink-500/20',
    iconColor: 'text-purple-400',
  },
  {
    icon: FolderTree,
    title: 'Organize Files',
    prompt: 'Scan my Desktop and Documents folders, then organize files into categorized subfolders by type.',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Camera,
    title: 'Analyze Screen',
    prompt: 'Take a screenshot of my current screen and analyze what applications are open and what I\'m working on.',
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
  },
  {
    icon: Zap,
    title: 'Start Automation',
    prompt: 'Create an automation workflow called "Start my coding session" that opens VS Code, my project folder, Chrome with documentation, and starts the dev server.',
    gradient: 'from-rose-500/20 to-red-500/20',
    iconColor: 'text-rose-400',
  },
];

export const SuggestionCards: React.FC<SuggestionCardsProps> = ({ onSelectPrompt }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl">
      {SUGGESTIONS.map((s, i) => {
        const Icon = s.icon;
        return (
          <button
            key={i}
            onClick={() => onSelectPrompt(s.prompt)}
            className={`group relative overflow-hidden rounded-xl p-4 bg-gradient-to-br ${s.gradient} border border-white/10 hover:border-white/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg text-left`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-white mb-1">{s.title}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {s.prompt}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
