import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar, type NavView } from './components/Sidebar';
import { TitleBar } from './components/TitleBar';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { MemoryPanel } from './components/MemoryPanel';
import { KnowledgePanel } from './components/KnowledgePanel';
import { CodingPanel } from './components/CodingPanel';
import { AutomationPanel } from './components/AutomationPanel';
import { ScreenAnalysisPanel } from './components/ScreenAnalysisPanel';
import { BrowserAgentPanel } from './components/BrowserAgentPanel';
import { ActivityMonitor } from './components/ActivityMonitor';
import { PermissionDialog } from './components/PermissionDialog';
import { CommandPalette } from './components/CommandPalette';
import { OnboardingScreen } from './components/OnboardingScreen';
import { useSettingsStore } from './stores/settingsStore';
import { useAgentStore } from './stores/agentStore';
import { useChatStore } from './stores/chatStore';
import { exportConversation } from './lib/export';

const ONBOARDING_KEY = 'arcange_onboarded_v1';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<NavView>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [permissionRequest, setPermissionRequest] = useState<any>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { theme, toggleTheme, setTheme, setApiKey, setDefaultProvider, updateVoiceSettings, updateMemorySettings, updateDesktopSettings } = useSettingsStore();
  const { pendingPermission, resolvePermission } = useAgentStore();
  const { addConversation, getActiveConversation, deleteConversation } = useChatStore();

  // Check if onboarding has been completed
  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      setShowOnboarding(true);
    }
  }, []);

  // Apply theme to root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, [theme]);

  // Wire permission requests
  useEffect(() => {
    if (pendingPermission) {
      setPermissionRequest(pendingPermission);
    }
  }, [pendingPermission]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        setActiveView('chat');
        addConversation();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        setActiveView('chat');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addConversation, toggleTheme]);

  const handleOnboardingComplete = (settings: any) => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(settings));
    if (settings.provider !== 'skip') {
      setDefaultProvider(settings.provider);
      if (settings.apiKey && (settings.provider === 'gemini' || settings.provider === 'openrouter')) {
        setApiKey(settings.provider, settings.apiKey);
      }
    }
    updateVoiceSettings({ enabled: settings.enableVoice });
    updateMemorySettings({ autoExtract: settings.enableMemory });
    updateDesktopSettings({
      allowFileSystem: settings.enableDesktop,
      allowTerminalExec: settings.enableDesktop,
      allowScreenCapture: settings.enableDesktop,
    });
    setShowOnboarding(false);
  };

  const renderView = () => {
    switch (activeView) {
      case 'chat':
      case 'agents':
        return <ChatPanel />;
      case 'settings':
        return <SettingsPanel />;
      case 'memory':
        return <MemoryPanel />;
      case 'knowledge':
        return <KnowledgePanel />;
      case 'coding':
        return <CodingPanel />;
      case 'automation':
        return <AutomationPanel />;
      case 'screen':
        return <ScreenAnalysisPanel />;
      case 'browser':
        return <BrowserAgentPanel />;
      default:
        return <ChatPanel />;
    }
  };

  const handleExportChat = () => {
    const conv = getActiveConversation();
    if (conv) exportConversation(conv.id, 'markdown');
  };

  const handleClearChat = () => {
    const conv = getActiveConversation();
    if (conv && confirm('Clear current conversation history?')) {
      deleteConversation(conv.id);
    }
  };

  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      <TitleBar
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onToggleActivity={() => {}}
        activityCount={0}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar activeView={activeView} setActiveView={setActiveView} collapsed={sidebarCollapsed} />

        <main className="flex-1 min-w-0 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(view) => setActiveView(view as NavView)}
        onNewChat={() => { setActiveView('chat'); addConversation(); }}
        onClearChat={handleClearChat}
        onToggleTheme={toggleTheme}
        onExportChat={handleExportChat}
        onVoiceMode={() => setActiveView('chat')}
      />

      <ActivityMonitor />

      <PermissionDialog
        request={permissionRequest}
        onRespond={(granted) => {
          if (permissionRequest) {
            resolvePermission(permissionRequest.id, granted);
            setPermissionRequest(null);
          }
        }}
      />
    </div>
  );
};

export default App;
