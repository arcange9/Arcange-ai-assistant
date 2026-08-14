import { create } from 'zustand';
import { Workflow, WorkflowStep } from '../types';
import { generateId } from '../lib/utils';

interface WorkflowStore {
  workflows: Workflow[];
  activeWorkflowId: string | null;
  isRunningWorkflow: boolean;
  
  // Actions
  setActiveWorkflow: (id: string | null) => void;
  createWorkflow: (workflow: Omit<Workflow, 'id' | 'createdAt'>) => string;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  toggleWorkflowEnabled: (id: string) => void;
  
  addStep: (workflowId: string, step: Omit<WorkflowStep, 'id'>) => void;
  updateStep: (workflowId: string, stepId: string, updates: Partial<WorkflowStep>) => void;
  deleteStep: (workflowId: string, stepId: string) => void;
  
  runWorkflow: (id: string) => Promise<void>;
  stopWorkflow: (id: string) => void;
}

const SAMPLE_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-daily-digest',
    name: 'Daily Workspace & System Summary',
    description: 'Summarizes recent terminal activity, file updates, and creates a clean status note.',
    trigger: 'schedule',
    schedule: '0 9 * * *',
    enabled: true,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: 'idle',
    steps: [
      {
        id: 's1',
        type: 'action',
        name: 'Scan Project Directory',
        config: { action: 'list_files', path: '.' }
      },
      {
        id: 's2',
        type: 'agent_prompt',
        name: 'Generate Brief Summary',
        config: { prompt: 'Summarize key files modified in the past 24 hours.' }
      }
    ]
  },
  {
    id: 'wf-code-review',
    name: 'Automated Pull Request Code Review',
    description: 'Inspects modified files, runs linter checks, and drafts inline review suggestions.',
    trigger: 'manual',
    enabled: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'idle',
    steps: [
      {
        id: 's1',
        type: 'action',
        name: 'Git Diff Scanner',
        config: { command: 'git diff HEAD~1' }
      },
      {
        id: 's2',
        type: 'agent_prompt',
        name: 'Analyze Security & Bugs',
        config: { prompt: 'Find potential security issues and syntax errors in diff.' }
      }
    ]
  }
];

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: SAMPLE_WORKFLOWS,
  activeWorkflowId: 'wf-daily-digest',
  isRunningWorkflow: false,

  setActiveWorkflow: (id) => set({ activeWorkflowId: id }),

  createWorkflow: (data) => {
    const id = generateId();
    const newWf: Workflow = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      status: 'idle'
    };

    set((state) => ({
      workflows: [newWf, ...state.workflows],
      activeWorkflowId: id
    }));

    return id;
  },

  updateWorkflow: (id, updates) => {
    set((state) => ({
      workflows: state.workflows.map((wf) =>
        wf.id === id ? { ...wf, ...updates } : wf
      )
    }));
  },

  deleteWorkflow: (id) => {
    set((state) => ({
      workflows: state.workflows.filter((wf) => wf.id !== id),
      activeWorkflowId: state.activeWorkflowId === id ? null : state.activeWorkflowId
    }));
  },

  toggleWorkflowEnabled: (id) => {
    set((state) => ({
      workflows: state.workflows.map((wf) =>
        wf.id === id ? { ...wf, enabled: !wf.enabled } : wf
      )
    }));
  },

  addStep: (workflowId, stepData) => {
    const stepId = generateId();
    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id === workflowId) {
          return {
            ...wf,
            steps: [...wf.steps, { ...stepData, id: stepId }]
          };
        }
        return wf;
      })
    }));
  },

  updateStep: (workflowId, stepId, updates) => {
    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id === workflowId) {
          return {
            ...wf,
            steps: wf.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
          };
        }
        return wf;
      })
    }));
  },

  deleteStep: (workflowId, stepId) => {
    set((state) => ({
      workflows: state.workflows.map((wf) => {
        if (wf.id === workflowId) {
          return {
            ...wf,
            steps: wf.steps.filter((s) => s.id !== stepId)
          };
        }
        return wf;
      })
    }));
  },

  runWorkflow: async (id) => {
    const wf = get().workflows.find((w) => w.id === id);
    if (!wf) return;

    set((state) => ({
      isRunningWorkflow: true,
      workflows: state.workflows.map((w) =>
        w.id === id ? { ...w, status: 'running' } : w
      )
    }));

    // Simulate step execution loop
    for (let i = 0; i < wf.steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    set((state) => ({
      isRunningWorkflow: false,
      workflows: state.workflows.map((w) =>
        w.id === id
          ? {
              ...w,
              status: 'success',
              lastRun: new Date().toISOString()
            }
          : w
      )
    }));
  },

  stopWorkflow: (id) => {
    set((state) => ({
      isRunningWorkflow: false,
      workflows: state.workflows.map((w) =>
        w.id === id ? { ...w, status: 'idle' } : w
      )
    }));
  }
}));
