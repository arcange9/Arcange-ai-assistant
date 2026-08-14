import React, { useState } from 'react';
import { Activity, Square, CheckCircle2, AlertTriangle, Clock, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { formatTime, cn } from '../lib/utils';

export const ActivityMonitor: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { activities, isRunning, stopExecution, clearActivities } = useAgentStore();

  const activeCount = activities.filter((a) => a.status === 'running').length;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Floating Pill Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'glass-panel rounded-2xl px-4 py-2.5 flex items-center gap-3 cursor-pointer border border-white/15 shadow-2xl hover:border-arcange-500/40 transition-all',
          isRunning && 'border-arcange-500/50 shadow-arcange-500/20'
        )}
      >
        <div className="relative flex items-center justify-center">
          <Activity className={cn('w-4 h-4', isRunning ? 'text-arcange-400 animate-spin' : 'text-gray-400')} />
          {isRunning && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-arcange-400 animate-ping" />
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-200 flex items-center gap-2">
            <span>Activity Engine</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.2 bg-arcange-500/30 text-arcange-300 text-[10px] rounded-full border border-arcange-500/40 font-mono">
                {activeCount} active
              </span>
            )}
          </span>
        </div>

        {isRunning && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              stopExecution();
            }}
            className="p-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition flex items-center gap-1 text-[11px] font-semibold"
            title="Emergency Stop"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </button>
        )}

        <button className="text-gray-400 hover:text-white ml-1">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Log Drawer */}
      {isExpanded && (
        <div className="mt-2 w-96 max-h-96 glass-panel rounded-2xl border border-white/15 shadow-2xl p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Agent Execution Log
            </span>
            <button
              onClick={clearActivities}
              className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-72">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                No recent background events
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-gray-200">
                      {act.status === 'running' && <Activity className="w-3.5 h-3.5 text-arcange-400 animate-spin" />}
                      {act.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {act.status === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                      {act.status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{act.title}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {formatTime(act.timestamp)}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 pl-5 leading-relaxed">
                    {act.description}
                  </p>

                  {act.agentType && (
                    <div className="pl-5 pt-1">
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-mono">
                        {act.agentType}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
