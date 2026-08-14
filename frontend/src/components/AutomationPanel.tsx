import React, { useState } from 'react';
import {
  Zap, Plus, Play, Square, Clock, CheckCircle, XCircle,
  Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useWorkflowStore } from '../stores/workflowStore';
import { cn, formatRelativeTime } from '../lib/utils';

export const AutomationPanel: React.FC = () => {
  const { workflows, createWorkflow, deleteWorkflow, runWorkflow, stopWorkflow, isRunningWorkflow, toggleWorkflowEnabled } = useWorkflowStore();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', steps: [{ type: 'action' as const, name: '', config: {} as Record<string, any> }] });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createWorkflow({
      name: form.name,
      description: form.description,
      trigger: 'manual',
      enabled: true,
      steps: form.steps.map((s, i) => ({ ...s, id: `step_${i}` })),
    });
    setForm({ name: '', description: '', steps: [{ type: 'action', name: '', config: {} }] });
    setShowCreate(false);
  };

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { type: 'action', name: '', config: {} }] });
  };

  const removeStep = (index: number) => {
    setForm({ ...form, steps: form.steps.filter((_, i) => i !== index) });
  };

  const updateStep = (index: number, updates: any) => {
    const steps = [...form.steps];
    steps[index] = { ...steps[index], ...updates };
    setForm({ ...form, steps });
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Automation Hub</h2>
            <p className="text-xs text-gray-400">{workflows.length} workflows</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-medium hover:shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Workflow name (e.g., Start coding session)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
            <input
              type="text"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">Steps</p>
            {form.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-300 text-xs flex items-center justify-center">{i + 1}</span>
                <select
                  value={step.type}
                  onChange={(e) => updateStep(i, { type: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="action" className="bg-gray-800">Action</option>
                  <option value="agent_prompt" className="bg-gray-800">AI Prompt</option>
                  <option value="wait" className="bg-gray-800">Wait</option>
                  <option value="web_request" className="bg-gray-800">Web Request</option>
                </select>
                <input
                  type="text"
                  placeholder="Step description (e.g., Open VS Code)"
                  value={step.name}
                  onChange={(e) => updateStep(i, { name: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                />
                {form.steps.length > 1 && (
                  <button onClick={() => removeStep(i)} className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addStep} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-1">
              <Plus className="w-3 h-3" /> Add step
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white">Cancel</button>
            <button onClick={handleCreate} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-500">Create</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {workflows.length === 0 && !showCreate ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Zap className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No workflows yet</p>
            <p className="text-xs mt-1">Create a workflow to automate repetitive tasks</p>
          </div>
        ) : (
          workflows.map((wf: any) => (
            <div key={wf.id} className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{wf.name}</h3>
                    <span className={cn(
                      'px-1.5 py-0.5 text-[10px] rounded',
                      wf.status === 'running' ? 'bg-emerald-500/20 text-emerald-300 animate-pulse' :
                      wf.status === 'success' ? 'bg-blue-500/20 text-blue-300' :
                      wf.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                      'bg-gray-500/20 text-gray-400'
                    )}>
                      {wf.status || 'idle'}
                    </span>
                    {wf.trigger === 'schedule' && (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-500/20 text-purple-300">
                        {wf.schedule || 'scheduled'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{wf.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {wf.status === 'running' ? (
                    <button onClick={() => stopWorkflow(wf.id)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Stop">
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => runWorkflow(wf.id)} disabled={isRunningWorkflow} className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50" title="Run">
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => toggleWorkflowEnabled(wf.id)} className={cn('p-1.5 rounded-lg transition', wf.enabled ? 'text-emerald-400' : 'text-gray-500')} title={wf.enabled ? 'Disable' : 'Enable'}>
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteWorkflow(wf.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {wf.steps && wf.steps.length > 0 && (
                    <button onClick={() => setExpandedId(expandedId === wf.id ? null : wf.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-white" title="Toggle steps">
                      {expandedId === wf.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {expandedId === wf.id && wf.steps && (
                <div className="mt-3 space-y-1 pl-2 border-l-2 border-amber-500/20">
                  {wf.steps.map((step: any, i: number) => (
                    <div key={step.id || i} className="flex items-center gap-2 py-1 text-xs">
                      <span className="w-5 h-5 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono text-[10px]">{i + 1}</span>
                      <span className="text-gray-300">{step.name || step.type}</span>
                      <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-white/5 rounded">{step.type}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                {wf.lastRun && <span>Last run: {formatRelativeTime(wf.lastRun)}</span>}
                <span>{wf.steps?.length || 0} steps</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
