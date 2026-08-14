import React, { useState } from 'react';
import {
  Key, Mic, Monitor, Palette, Database, Shield, Eye, EyeOff,
  Save, Check, Zap, Volume2, Sun, Moon, Laptop, Trash2, AlertTriangle
} from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { cn } from '../lib/utils';

type Tab = 'ai' | 'voice' | 'desktop' | 'appearance' | 'memory' | 'security';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'ai', label: 'AI Providers', icon: Key },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'memory', label: 'Memory', icon: Database },
  { id: 'security', label: 'Security', icon: Shield },
];

export const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const store = useSettingsStore();

  return (
    <div className="h-full flex">
      {/* Tab sidebar */}
      <div className="w-56 border-r border-white/10 p-3 space-y-1 shrink-0">
        <h2 className="text-lg font-bold text-white mb-4 px-2">Settings</h2>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/20 text-white border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'ai' && <AISettings />}
        {activeTab === 'voice' && <VoiceSettings />}
        {activeTab === 'desktop' && <DesktopSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'memory' && <MemorySettingsPanel />}
        {activeTab === 'security' && <SecuritySettings />}
      </div>
    </div>
  );
};

// --- AI Settings ---
const AISettings: React.FC = () => {
  const store = useSettingsStore();
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOrKey, setShowOrKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <h3 className="text-base font-semibold text-white mb-1">Google AI Studio (Gemini)</h3>
        <p className="text-xs text-gray-400 mb-4">Enter your Gemini API key from Google AI Studio.</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Gemini API Key</label>
            <div className="relative">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={store.apiKeys.gemini || ''}
                onChange={(e) => store.setApiKey('gemini', e.target.value)}
                placeholder="AIza..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-2 top-2.5 text-gray-400 hover:text-white"
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="pt-4 border-t border-white/10">
        <h3 className="text-base font-semibold text-white mb-1">OpenRouter</h3>
        <p className="text-xs text-gray-400 mb-4">Access models from Anthropic, OpenAI, Google, DeepSeek, Qwen, Meta, Mistral, xAI.</p>
        <div>
          <label className="text-xs text-gray-400 block mb-1.5">OpenRouter API Key</label>
          <div className="relative">
            <input
              type={showOrKey ? 'text' : 'password'}
              value={store.apiKeys.openrouter || ''}
              onChange={(e) => store.setApiKey('openrouter', e.target.value)}
              placeholder="sk-or-..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={() => setShowOrKey(!showOrKey)}
              className="absolute right-2 top-2.5 text-gray-400 hover:text-white"
            >
              {showOrKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </section>

      <section className="pt-4 border-t border-white/10">
        <h3 className="text-base font-semibold text-white mb-4">Model Role Assignment</h3>
        <div className="space-y-3">
          {(['fast', 'smart', 'coding', 'vision'] as const).map((role) => {
            const model = store.modelConfigs.find((m) => m.role === role);
            return (
              <div key={role} className="flex items-center gap-3">
                <span className="text-sm text-gray-400 w-20 capitalize">{role}</span>
                <select
                  value={model?.id || ''}
                  onChange={(e) => {
                    const selected = store.modelConfigs.find((m) => m.id === e.target.value);
                    if (selected) store.updateModelConfig(selected.id, { role });
                  }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  {store.modelConfigs.map((m) => (
                    <option key={m.id} value={m.id} className="bg-gray-800">
                      {m.name} ({m.provider})
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pt-4 border-t border-white/10">
        <h3 className="text-base font-semibold text-white mb-4">Model Parameters</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Temperature</label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={store.modelConfigs[0]?.temperature ?? 0.7}
              onChange={(e) => store.updateModelConfig(store.modelConfigs[0].id, { temperature: parseFloat(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Max Tokens</label>
            <input
              type="number"
              min="256"
              max="32768"
              step="256"
              value={store.modelConfigs[0]?.maxTokens ?? 4096}
              onChange={(e) => store.updateModelConfig(store.modelConfigs[0].id, { maxTokens: parseInt(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </section>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium hover:shadow-lg transition"
      >
        {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
};

// --- Voice Settings ---
const VoiceSettings: React.FC = () => {
  const store = useSettingsStore();
  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <h3 className="text-base font-semibold text-white mb-1">Voice Configuration</h3>
        <p className="text-xs text-gray-400 mb-4">Configure speech-to-text and text-to-speech.</p>
        <div className="space-y-4">
          <ToggleRow
            label="Enable Voice Mode"
            desc="Allow voice input and audio responses"
            checked={store.voice.enabled}
            onChange={(v) => store.updateVoiceSettings({ enabled: v })}
          />
          <ToggleRow
            label="Auto-Speak Responses"
            desc="Automatically read AI responses aloud"
            checked={store.voice.autoSpeak}
            onChange={(v) => store.updateVoiceSettings({ autoSpeak: v })}
          />
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">TTS Voice</label>
            <select
              value={store.voice.voiceId}
              onChange={(e) => store.updateVoiceSettings({ voiceId: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="default" className="bg-gray-800">Default System Voice</option>
              <option value="en-US-AriaNeural" className="bg-gray-800">Aria (US Female)</option>
              <option value="en-US-GuyNeural" className="bg-gray-800">Guy (US Male)</option>
              <option value="en-GB-SoniaNeural" className="bg-gray-800">Sonia (UK Female)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Speech Rate</label>
              <input
                type="range" min="0.5" max="2" step="0.1"
                value={store.voice.rate}
                onChange={(e) => store.updateVoiceSettings({ rate: parseFloat(e.target.value) })}
                className="w-full accent-blue-500"
              />
              <span className="text-xs text-gray-400">{store.voice.rate.toFixed(1)}x</span>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Pitch</label>
              <input
                type="range" min="0.5" max="2" step="0.1"
                value={store.voice.pitch}
                onChange={(e) => store.updateVoiceSettings({ pitch: parseFloat(e.target.value) })}
                className="w-full accent-blue-500"
              />
              <span className="text-xs text-gray-400">{store.voice.pitch.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Volume2 className="w-4 h-4 text-amber-400" />
          <h3 className="text-base font-semibold text-white">Wake Word Detection</h3>
        </div>
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-200">
            Wake word "Hey Arcange" is architecturally prepared but not yet functional.
            This feature requires a local wake-word engine (e.g., Porcupine or OpenWakeWord)
            which will be integrated in a future release.
          </p>
        </div>
      </section>
    </div>
  );
};

// --- Desktop Settings ---
const DesktopSettings: React.FC = () => {
  const store = useSettingsStore();
  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <h3 className="text-base font-semibold text-white mb-1">Desktop Automation Permissions</h3>
        <p className="text-xs text-gray-400 mb-4">Control what Arcange can access on your computer. All permissions are disabled by default for safety.</p>
        <div className="space-y-4">
          <ToggleRow
            label="Start with Windows"
            desc="Launch Arcange automatically when Windows starts"
            checked={store.desktop.autoStart}
            onChange={(v) => store.updateDesktopSettings({ autoStart: v })}
          />
          <ToggleRow
            label="Minimize to Tray"
            desc="Send to system tray instead of closing"
            checked={store.desktop.minimizeToTray}
            onChange={(v) => store.updateDesktopSettings({ minimizeToTray: v })}
          />
          <ToggleRow
            label="Screen Capture"
            desc="Allow Arcange to take screenshots and analyze your screen"
            checked={store.desktop.allowScreenCapture}
            onChange={(v) => store.updateDesktopSettings({ allowScreenCapture: v })}
          />
          <ToggleRow
            label="File System Access"
            desc="Allow reading, writing, and managing files"
            checked={store.desktop.allowFileSystem}
            onChange={(v) => store.updateDesktopSettings({ allowFileSystem: v })}
          />
          <ToggleRow
            label="Terminal Execution"
            desc="Allow running terminal commands (requires confirmation for dangerous commands)"
            checked={store.desktop.allowTerminalExec}
            onChange={(v) => store.updateDesktopSettings({ allowTerminalExec: v })}
          />
        </div>
      </section>

      <section className="pt-4 border-t border-white/10">
        <h3 className="text-base font-semibold text-white mb-3">Global Hotkey</h3>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={store.desktop.globalHotkey}
            onChange={(e) => store.updateDesktopSettings({ globalHotkey: e.target.value })}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50"
            placeholder="CommandOrControl+Shift+A"
          />
          <span className="text-xs text-gray-400">Click to edit</span>
        </div>
      </section>
    </div>
  );
};

// --- Appearance Settings ---
const AppearanceSettings: React.FC = () => {
  const store = useSettingsStore();
  const themes: { id: 'dark' | 'light' | 'system'; label: string; icon: any }[] = [
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'system', label: 'System', icon: Laptop },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <h3 className="text-base font-semibold text-white mb-1">Theme</h3>
        <p className="text-xs text-gray-400 mb-4">Choose your preferred appearance.</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((t) => {
            const Icon = t.icon;
            const isActive = store.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => store.setTheme(t.id)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border transition',
                  isActive
                    ? 'bg-gradient-to-br from-blue-600/30 to-purple-600/20 border-blue-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

// --- Memory Settings ---
const MemorySettingsPanel: React.FC = () => {
  const store = useSettingsStore();
  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <h3 className="text-base font-semibold text-white mb-1">Memory Configuration</h3>
        <p className="text-xs text-gray-400 mb-4">Control how Arcange stores and uses memory.</p>
        <div className="space-y-4">
          <ToggleRow
            label="Auto-Extract Memory"
            desc="Automatically save important facts from conversations"
            checked={store.memory.autoExtract}
            onChange={(v) => store.updateMemorySettings({ autoExtract: v })}
          />
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Max Entries</label>
            <input
              type="number"
              min="50"
              max="5000"
              step="50"
              value={store.memory.maxEntries}
              onChange={(e) => store.updateMemorySettings({ maxEntries: parseInt(e.target.value) })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Storage Type</label>
            <select
              value={store.memory.storageType}
              onChange={(e) => store.updateMemorySettings({ storageType: e.target.value as 'local' | 'synced' })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="local" className="bg-gray-800">Local (This device only)</option>
              <option value="synced" className="bg-gray-800">Synced (Cross-device)</option>
            </select>
          </div>
        </div>
      </section>

      <section className="pt-4 border-t border-white/10">
        <h3 className="text-base font-semibold text-white mb-3">Danger Zone</h3>
        <button
          onClick={() => { if (confirm('Clear ALL memory entries? This cannot be undone.')) store.resetSettings(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition"
        >
          <Trash2 className="w-4 h-4" />
          Clear All Memory
        </button>
      </section>
    </div>
  );
};

// --- Security Settings ---
const SecuritySettings: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  React.useEffect(() => {
    // Load audit logs if available
    setAuditLogs([]);
  }, []);

  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <h3 className="text-base font-semibold text-white mb-1">Security</h3>
        <p className="text-xs text-gray-400 mb-4">API keys are stored locally and never transmitted.</p>
        <div className="space-y-4">
          <ToggleRow label="Hide API Keys" desc="Mask API keys in the UI" checked={true} onChange={() => {}} />
          <ToggleRow label="Audit Logging" desc="Log all file, terminal, and automation actions" checked={true} onChange={() => {}} />
        </div>
      </section>

      <section className="pt-4 border-t border-white/10">
        <h3 className="text-base font-semibold text-white mb-3">Audit Log</h3>
        {auditLogs.length === 0 ? (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center text-sm text-gray-400">
            No audit entries yet. Actions will be logged here.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {auditLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/5 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white">{log.action}</span>
                  <span className="text-gray-400 ml-2">{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// --- Reusable Toggle ---
const ToggleRow: React.FC<{ label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, desc, checked, onChange }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
    <div>
      <p className="text-sm text-white font-medium">{label}</p>
      <p className="text-xs text-gray-400">{desc}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition shrink-0',
        checked ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-white/10'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-md',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  </div>
);
