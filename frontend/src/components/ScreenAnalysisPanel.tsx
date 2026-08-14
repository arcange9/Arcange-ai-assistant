import React, { useState, useCallback } from 'react';
import { Monitor, Camera, Scan, Eye, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useSettingsStore } from '../stores/settingsStore';
import { streamChatCompletion } from '../lib/ai-client';

export const ScreenAnalysisPanel: React.FC = () => {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { desktop, apiKeys, defaultProvider, modelConfigs } = useSettingsStore();
  const hasScreenPermission = desktop.allowScreenCapture;

  const captureScreen = useCallback(async () => {
    if (!hasScreenPermission) {
      setError('Screen capture permission is not enabled. Enable it in Settings &gt; Desktop.');
      return;
    }
    setIsCapturing(true);
    setError(null);
    try {
      const dataUrl = await api.system.takeScreenshot();
      setScreenshot(dataUrl);
      setAnalysis('');
    } catch (err: any) {
      setError(`Failed to capture screen: ${err.message}`);
    }
    setIsCapturing(false);
  }, [hasScreenPermission]);

  const analyzeScreen = useCallback(async () => {
    if (!screenshot) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysis('');

    const visionModel = modelConfigs.find((m) => m.role === 'vision');
    const apiKey = (apiKeys as any)[visionModel?.provider || defaultProvider] || apiKeys.gemini || '';
    const provider = visionModel?.provider || defaultProvider;
    const modelId = visionModel?.modelId || 'gemini-1.5-pro';

    let accumulated = '';
    await streamChatCompletion({
      messages: [{
        id: 'screen-analysis',
        role: 'user',
        content: 'Analyze this screenshot of my screen. Describe what applications are open, what UI elements are visible, and what I appear to be working on. Identify any buttons, menus, or interactive elements.',
        timestamp: new Date().toISOString(),
      }],
      provider: provider as any,
      modelId,
      apiKey,
      onChunk: (chunk) => {
        accumulated += chunk;
        setAnalysis(accumulated);
      },
      onError: (err) => {
        setError(`Analysis failed: ${err.message}. Make sure you have a vision-capable model configured.`);
        setIsAnalyzing(false);
      },
      onComplete: () => {
        setIsAnalyzing(false);
      },
    });
  }, [screenshot, apiKeys, defaultProvider, modelConfigs]);

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Monitor className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Screen Analysis</h2>
          <p className="text-xs text-gray-400">Capture and analyze your screen with AI vision</p>
        </div>
      </div>

      {/* Permission notice */}
      {!hasScreenPermission && (
        <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200 font-medium">Screen capture requires your permission</p>
            <p className="text-xs text-amber-300/70 mt-1">
              Screen capture is never performed in the background. You must explicitly click "Capture Screen" each time.
              Enable screen permission in Settings &gt; Desktop to use this feature.
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={captureScreen}
          disabled={isCapturing || !hasScreenPermission}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:shadow-lg transition disabled:opacity-50"
        >
          {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {isCapturing ? 'Capturing...' : 'Capture Screen'}
        </button>
        <button
          onClick={analyzeScreen}
          disabled={!screenshot || isAnalyzing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm font-medium hover:bg-white/10 transition disabled:opacity-50"
        >
          {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
          {isAnalyzing ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Screenshot preview */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-400" />
            Screenshot
          </h3>
          <div className="aspect-video rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
            {screenshot ? (
              <img src={screenshot} alt="Screen capture" className="w-full h-full object-contain" />
            ) : (
              <div className="text-gray-500 text-sm flex flex-col items-center">
                <Monitor className="w-12 h-12 mb-2 opacity-30" />
                No screenshot captured yet
              </div>
            )}
          </div>
        </div>

        {/* Analysis results */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            AI Analysis
          </h3>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 min-h-[240px] max-h-[400px] overflow-y-auto">
            {isAnalyzing && !analysis ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing screen content with vision AI...
              </div>
            ) : analysis ? (
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis}</div>
            ) : (
              <p className="text-gray-500 text-sm">
                Capture a screenshot and click "Analyze" to get an AI description of what's on your screen.
                Arcange will identify applications, UI elements, text, and your current activity.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
