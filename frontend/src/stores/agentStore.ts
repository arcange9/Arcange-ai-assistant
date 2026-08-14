import { create } from 'zustand';
import { ActivityEvent, AgentType, PermissionRequest } from '../types';
import { generateId } from '../lib/utils';

interface AgentStore {
  activities: ActivityEvent[];
  isRunning: boolean;
  currentAgent: AgentType;
  pendingPermission: PermissionRequest | null;
  
  // Actions
  addActivity: (activity: Omit<ActivityEvent, 'id' | 'timestamp'>) => string;
  updateActivity: (id: string, updates: Partial<ActivityEvent>) => void;
  clearActivities: () => void;
  setCurrentAgent: (agent: AgentType) => void;
  stopExecution: () => void;
  
  requestPermission: (req: Omit<PermissionRequest, 'id' | 'timestamp' | 'status'>) => Promise<boolean>;
  resolvePermission: (id: string, granted: boolean) => void;
}

let permissionResolver: ((value: boolean) => void) | null = null;

const INITIAL_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'act-1',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    type: 'agent_start',
    status: 'success',
    title: 'Arcange Initialization',
    description: 'Loaded desktop agent engine and background local bridge.',
    agentType: 'general'
  }
];

export const useAgentStore = create<AgentStore>((set, get) => ({
  activities: INITIAL_ACTIVITIES,
  isRunning: false,
  currentAgent: 'general',
  pendingPermission: null,

  addActivity: (data) => {
    const id = generateId();
    const newActivity: ActivityEvent = {
      ...data,
      id,
      timestamp: new Date().toISOString()
    };

    set((state) => ({
      activities: [newActivity, ...state.activities].slice(0, 100), // keep latest 100
      isRunning: data.status === 'running' || state.isRunning
    }));

    return id;
  },

  updateActivity: (id, updates) => {
    set((state) => {
      const updated = state.activities.map((act) =>
        act.id === id ? { ...act, ...updates } : act
      );
      const hasRunning = updated.some((a) => a.status === 'running');
      return {
        activities: updated,
        isRunning: hasRunning
      };
    });
  },

  clearActivities: () => set({ activities: [], isRunning: false }),

  setCurrentAgent: (agent) => set({ currentAgent: agent }),

  stopExecution: () => {
    set((state) => ({
      isRunning: false,
      activities: state.activities.map((act) =>
        act.status === 'running'
          ? { ...act, status: 'error', description: act.description + ' (Terminated by user)' }
          : act
      )
    }));
  },

  requestPermission: (req) => {
    return new Promise<boolean>((resolve) => {
      const permReq: PermissionRequest = {
        ...req,
        id: generateId(),
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      permissionResolver = resolve;
      set({ pendingPermission: permReq });
    });
  },

  resolvePermission: (id, granted) => {
    if (permissionResolver) {
      permissionResolver(granted);
      permissionResolver = null;
    }
    set({ pendingPermission: null });
  }
}));
