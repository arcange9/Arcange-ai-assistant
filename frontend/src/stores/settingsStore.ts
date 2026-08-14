import { create } from 'zustand';
import { Settings, ModelConfig, AIProvider, AgentType, Theme } from '../types';

interface SettingsStore extends Settings {
  setTheme: (theme: Theme) => void;
  setDefaultProvider: (provider: AIProvider) => void;
  setDefaultModelId: (modelId: string) => void;
  setApiKey: (provider: keyof Settings['apiKeys'], key: string) => void;
  updateModelConfig: (id: string, updates: Partial<ModelConfig>) => void;
  addModelConfig: (config: ModelConfig) => void;
  deleteModelConfig: (id: string) => void;
  updateVoiceSettings: (updates: Partial<Settings['voice']>) => void;
  updateDesktopSettings: (updates: Partial<Settings['desktop']>) => void;
  updateMemorySettings: (updates: Partial<Settings['memory']>) => void;
  setSelectedAgent: (agent: AgentType) => void;
  resetSettings: () => void;
  toggleTheme: () => void;
}

const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    modelId: 'gemini-1.5-flash',
    role: 'fast',
    maxTokens: 8192,
    temperature: 0.7,
    isDefault: true
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    modelId: 'gemini-1.5-pro',
    role: 'smart',
    maxTokens: 8192,
    temperature: 0.7
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet (OpenRouter)',
    provider: 'openrouter',
    modelId: 'anthropic/claude-3.5-sonnet',
    role: 'coding',
    maxTokens: 4096,
    temperature: 0.2
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (OpenRouter)',
    provider: 'openrouter',
    modelId: 'openai/gpt-4o',
    role: 'vision',
    maxTokens: 4096,
    temperature: 0.5
  }
];

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  defaultProvider: 'gemini',
  defaultModelId: 'gemini-1.5-flash',
  apiKeys: {
    gemini: '',
    openrouter: '',
    openai: '',
    anthropic: '',
    customEndpoint: ''
  },
  modelConfigs: DEFAULT_MODELS,
  voice: {
    enabled: true,
    autoSpeak: false,
    voiceId: 'default',
    pitch: 1.0,
    rate: 1.0
  },
  desktop: {
    autoStart: true,
    minimizeToTray: true,
    globalHotkey: 'CommandOrControl+Shift+A',
    allowTerminalExec: true,
    allowFileSystem: true,
    allowScreenCapture: true
  },
  memory: {
    autoExtract: true,
    maxEntries: 500,
    storageType: 'local'
  },
  selectedAgent: 'general'
};

// LocalStorage load helper
const loadInitialSettings = (): Settings => {
  try {
    const saved = localStorage.getItem('arcange_settings_v1');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load settings from storage', e);
  }
  return DEFAULT_SETTINGS;
};

const saveSettingsToStorage = (settings: Settings) => {
  try {
    localStorage.setItem('arcange_settings_v1', JSON.stringify(settings));
    if (window.arcange?.system?.saveSettings) {
      window.arcange.system.saveSettings(settings);
    }
  } catch (e) {
    console.error('Failed to persist settings', e);
  }
};

export const useSettingsStore = create<SettingsStore>((set, get) => {
  const initial = loadInitialSettings();

  const updateAndSave = (updater: (prev: Settings) => Partial<Settings>) => {
    set((state) => {
      const nextState = { ...state, ...updater(state) };
      // Omit functions when persisting
      const { setTheme, setDefaultProvider, setDefaultModelId, setApiKey, updateModelConfig, addModelConfig, deleteModelConfig, updateVoiceSettings, updateDesktopSettings, updateMemorySettings, setSelectedAgent, resetSettings, ...persistable } = nextState;
      saveSettingsToStorage(persistable as Settings);
      return nextState;
    });
  };

  return {
    ...initial,

    setTheme: (theme) => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      }
      updateAndSave(() => ({ theme }));
    },

    setDefaultProvider: (defaultProvider) => updateAndSave(() => ({ defaultProvider })),

    setDefaultModelId: (defaultModelId) => updateAndSave(() => ({ defaultModelId })),

    setApiKey: (provider, key) => updateAndSave((state) => ({
      apiKeys: {
        ...state.apiKeys,
        [provider]: key
      }
    })),

    updateModelConfig: (id, updates) => updateAndSave((state) => ({
      modelConfigs: state.modelConfigs.map((m) => (m.id === id ? { ...m, ...updates } : m))
    })),

    addModelConfig: (config) => updateAndSave((state) => ({
      modelConfigs: [...state.modelConfigs, config]
    })),

    deleteModelConfig: (id) => updateAndSave((state) => ({
      modelConfigs: state.modelConfigs.filter((m) => m.id !== id)
    })),

    updateVoiceSettings: (updates) => updateAndSave((state) => ({
      voice: { ...state.voice, ...updates }
    })),

    updateDesktopSettings: (updates) => updateAndSave((state) => ({
      desktop: { ...state.desktop, ...updates }
    })),

    updateMemorySettings: (updates) => updateAndSave((state) => ({
      memory: { ...state.memory, ...updates }
    })),

    setSelectedAgent: (selectedAgent) => updateAndSave(() => ({ selectedAgent })),

    toggleTheme: () => {
      const current = get().theme;
      const next = current === "dark" ? "light" : "dark";
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      updateAndSave(() => ({ theme: next }));
    },

    resetSettings: () => {
      saveSettingsToStorage(DEFAULT_SETTINGS);
      set({ ...DEFAULT_SETTINGS });
    }
  };
});
