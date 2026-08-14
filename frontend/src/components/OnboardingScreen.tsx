import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Bot, Code2, Globe, Zap, Database, BookOpen,
  Mic, Monitor, Settings, ArrowRight, ArrowLeft, Check,
  Key, Brain, Shield, Terminal
} from 'lucide-react';
import { cn } from '../lib/utils';

interface OnboardingScreenProps {
  onComplete: (settings: {
    provider: string;
    apiKey: string;
    enableVoice: boolean;
    enableMemory: boolean;
    enableDesktop: boolean;
  }) => void;
}

const SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to Arcange AI',
    subtitle: 'Your intelligent AI assistant for your computer',
    icon: Sparkles,
    description: 'Chat with AI, control your desktop, browse the web, write code, and automate workflows — all from one app.',
  },
  {
    id: 'features',
    title: 'What Arcange Can Do',
    subtitle: 'Seven powerful agents at your service',
    icon: Bot,
    features: [
      { icon: Bot, name: 'General AI', desc: 'Chat, answer questions, brainstorm' },
      { icon: Code2, name: 'Coding Agent', desc: 'Write, debug, and run code' },
      { icon: Globe, name: 'Browser Agent', desc: 'Navigate and scrape the web' },
      { icon: Monitor, name: 'Screen Vision', desc: 'Analyze what is on your screen' },
      { icon: Zap, name: 'Automation', desc: 'Build multi-step workflows' },
      { icon: Database, name: 'Memory', desc: 'Remember your preferences' },
      { icon: BookOpen, name: 'Knowledge Base', desc: 'Ingest documents for RAG' },
      { icon: Terminal, name: 'Desktop Control', desc: 'Mouse, keyboard, files, terminal' },
    ],
  },
  {
    id: 'provider',
    title: 'Connect Your AI Provider',
    subtitle: 'Choose your preferred model — you can change this anytime in Settings',
    icon: Key,
    providers: [
      { id: 'gemini', name: 'Google Gemini', desc: 'Free tier available, fast and capable', color: 'from-blue-500 to-cyan-500' },
      { id: 'openrouter', name: 'OpenRouter', desc: 'Access Claude, GPT-4, DeepSeek and more', color: 'from-purple-500 to-pink-500' },
      { id: 'ollama', name: 'Ollama (Local)', desc: 'Run models offline on your machine', color: 'from-emerald-500 to-green-600' },
      { id: 'skip', name: 'Skip for now', desc: 'Set up later in Settings', color: 'from-gray-500 to-gray-600' },
    ],
  },
  {
    id: 'apikey',
    title: 'Enter Your API Key',
    subtitle: 'Your key is stored locally and never sent anywhere except the provider',
    icon: Shield,
    note: 'Arcange never hardcodes or transmits your API keys. They are encrypted in local storage on your machine.',
  },
  {
    id: 'permissions',
    title: 'Choose What Arcange Can Access',
    subtitle: 'You can change these anytime in Settings',
    icon: Brain,
    toggles: [
      { id: 'enableVoice', icon: Mic, name: 'Voice Mode', desc: 'Speech-to-text and text-to-speech', default: true },
      { id: 'enableMemory', icon: Database, name: 'Memory', desc: 'Remember preferences across sessions', default: true },
      { id: 'enableDesktop', icon: Terminal, name: 'Desktop Automation', desc: 'File operations, terminal, mouse, keyboard', default: false },
    ],
  },
  {
    id: 'ready',
    title: 'You Are All Set',
    subtitle: 'Press Ctrl+K anytime to open the command palette',
    icon: Check,
    description: 'Try asking Arcange to open an app, search the web, write code, or just chat. Your assistant is ready.',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    enableVoice: true,
    enableMemory: true,
    enableDesktop: false,
  });

  const slide = SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete({
        provider: selectedProvider,
        apiKey,
        enableVoice: toggles.enableVoice,
        enableMemory: toggles.enableMemory,
        enableDesktop: toggles.enableDesktop,
      });
    } else {
      // Skip API key step if provider is "skip" or "ollama"
      if (slide.id === 'provider' && (selectedProvider === 'skip' || selectedProvider === 'ollama')) {
        setStep(step + 2);
      } else {
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => setStep(Math.max(0, step - 1));
  const handleSkip = () => onComplete({ provider: 'skip', apiKey: '', enableVoice: true, enableMemory: true, enableDesktop: false });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08080d] overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl" />

      <div className="relative w-full max-w-2xl mx-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="glass-panel rounded-3xl border border-white/10 shadow-2xl p-8 bg-[#0d0d14]/90 backdrop-blur-xl"
          >
            {/* Slide Content */}
            {slide.id === 'welcome' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <slide.icon className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">{slide.title}</h1>
                <p className="text-gray-400 text-lg">{slide.subtitle}</p>
                <p className="text-gray-500 text-sm mt-4 max-w-md mx-auto">{slide.description}</p>
              </div>
            )}

            {slide.id === 'features' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <slide.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{slide.title}</h2>
                    <p className="text-sm text-gray-400">{slide.subtitle}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {slide.features!.map((f: any) => {
                    const Icon = f.icon;
                    return (
                      <div key={f.name} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition">
                        <Icon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">{f.name}</p>
                          <p className="text-xs text-gray-400">{f.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {slide.id === 'provider' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <slide.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{slide.title}</h2>
                    <p className="text-sm text-gray-400">{slide.subtitle}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {slide.providers!.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProvider(p.id)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border transition text-left',
                        selectedProvider === p.id
                          ? 'border-blue-500/50 bg-blue-500/10 shadow-lg'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      )}
                    >
                      <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', p.color)}>
                        <Key className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.desc}</p>
                      </div>
                      {selectedProvider === p.id && (
                        <Check className="w-5 h-5 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {slide.id === 'apikey' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                    <slide.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{slide.title}</h2>
                    <p className="text-sm text-gray-400">{slide.subtitle}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="password"
                      placeholder={selectedProvider === 'gemini' ? 'AIza...' : 'sk-or-v1-...'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 font-mono"
                    />
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300">{slide.note}</p>
                  </div>
                  {selectedProvider === 'gemini' && (
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                      Get a free Gemini API key from Google AI Studio
                    </a>
                  )}
                  {selectedProvider === 'openrouter' && (
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300">
                      Get an OpenRouter API key
                    </a>
                  )}
                </div>
              </div>
            )}

            {slide.id === 'permissions' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <slide.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{slide.title}</h2>
                    <p className="text-sm text-gray-400">{slide.subtitle}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {slide.toggles!.map((t: any) => {
                    const Icon = t.icon;
                    const isEnabled = toggles[t.id];
                    return (
                      <div key={t.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <Icon className={cn('w-5 h-5', isEnabled ? 'text-blue-400' : 'text-gray-500')} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{t.name}</p>
                          <p className="text-xs text-gray-400">{t.desc}</p>
                        </div>
                        <button
                          onClick={() => setToggles({ ...toggles, [t.id]: !isEnabled })}
                          className={cn(
                            'relative w-11 h-6 rounded-full transition',
                            isEnabled ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-700'
                          )}
                        >
                          <motion.div
                            layout
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow', isEnabled ? 'left-5' : 'left-0.5')}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {slide.id === 'ready' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
                  <slide.icon className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">{slide.title}</h1>
                <p className="text-gray-400 text-lg mb-4">{slide.subtitle}</p>
                <p className="text-gray-500 text-sm max-w-md mx-auto">{slide.description}</p>
                <div className="flex items-center justify-center gap-4 mt-6">
                  <kbd className="px-3 py-1.5 text-sm font-mono text-gray-300 bg-white/5 rounded-lg border border-white/10">
                    Ctrl+K
                  </kbd>
                  <span className="text-xs text-gray-500">Command Palette</span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2">
                {SLIDES.map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === step ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-500' :
                      i < step ? 'w-1.5 bg-blue-500/40' : 'w-1.5 bg-white/10'
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                {!isLast && (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    Skip
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/20 transition flex items-center gap-1.5"
                >
                  {isLast ? 'Launch Arcange' : 'Continue'}
                  {!isLast && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
