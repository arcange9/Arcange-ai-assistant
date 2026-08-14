import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy, Sparkles, Activity, PanelLeft } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface TitleBarProps {
  onToggleSidebar: () => void;
  onToggleActivity: () => void;
  activityCount: number;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onToggleSidebar, onToggleActivity, activityCount }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      if (window.arcange?.window) {
        const maximized = await window.arcange.window.isMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();
  }, []);

  const handleMinimize = () => api.window.minimize();
  const handleMaximize = () => {
    api.window.maximize();
    setTimeout(async () => {
      if (window.arcange?.window) {
        setIsMaximized(await window.arcange.window.isMaximized());
      }
    }, 100);
  };
  const handleClose = () => api.window.close();

  return (
    <div className="h-10 flex items-center justify-between px-3 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/10 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Left: Logo + sidebar toggle */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white"
          title="Toggle sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Arcange AI Assistant
          </span>
        </div>
      </div>

      {/* Right: Activity + window controls */}
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={onToggleActivity}
          className="relative p-1.5 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white"
          title="Activity Monitor"
        >
          <Activity className="w-4 h-4" />
          {activityCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <button
          onClick={handleMinimize}
          className="p-2 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="p-2 rounded-lg hover:bg-white/10 transition text-gray-400 hover:text-white"
          title="Maximize"
        >
          {isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-red-500/20 transition text-gray-400 hover:text-red-400"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
