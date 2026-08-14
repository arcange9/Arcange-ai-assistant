import React, { useState, useCallback } from 'react';
import {
  Globe, Search, MousePointer, Keyboard, Download, Camera,
  Loader2, ArrowRight, Scroll, FileText, Link as LinkIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

interface BrowserAction {
  id: string;
  type: string;
  description: string;
  result?: string;
  timestamp: string;
}

export const BrowserAgentPanel: React.FC = () => {
  const [url, setUrl] = useState('');
  const [pageContent, setPageContent] = useState<{ title: string; content: string } | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLog, setActionLog] = useState<BrowserAction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clickSelector, setClickSelector] = useState('');
  const [typeText, setTypeText] = useState('');

  const logAction = (type: string, description: string, result?: string) => {
    setActionLog((prev) => [{
      id: `act_${Date.now()}`,
      type,
      description,
      result,
      timestamp: new Date().toISOString(),
    }, ...prev].slice(0, 20));
  };

  const navigate = useCallback(async () => {
    let targetUrl = url.trim();
    if (!targetUrl) return;
    if (!targetUrl.startsWith('http')) {
      targetUrl = `https://${targetUrl}`;
      setUrl(targetUrl);
    }
    setIsLoading(true);
    logAction('navigate', `Navigating to ${targetUrl}`);
    try {
      const result: any = await api.browser.navigate(targetUrl);
      setPageContent(result);
      logAction('navigate', `Loaded: ${result.title}`, 'Success');
    } catch (err: any) {
      logAction('navigate', `Failed to navigate: ${err.message}`, 'Error');
    }
    setIsLoading(false);
  }, [url]);

  const search = useCallback(async () => {
    if (!searchQuery.trim()) return;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    setIsLoading(true);
    logAction('search', `Searching for: "${searchQuery}"`);
    try {
      const result: any = await api.browser.navigate(searchUrl);
      setPageContent(result);
      logAction('search', `Search completed`, 'Results loaded');
    } catch (err: any) {
      logAction('search', `Search failed: ${err.message}`, 'Error');
    }
    setIsLoading(false);
  }, [searchQuery]);

  const captureScreenshot = useCallback(async () => {
    setIsLoading(true);
    logAction('screenshot', 'Capturing browser screenshot');
    try {
      const dataUrl = await api.system.takeScreenshot();
      setScreenshot(dataUrl);
      logAction('screenshot', 'Screenshot captured', 'Success');
    } catch (err: any) {
      logAction('screenshot', `Failed: ${err.message}`, 'Error');
    }
    setIsLoading(false);
  }, []);

  const extractContent = useCallback(async () => {
    if (!pageContent) return;
    logAction('extract', 'Extracting page content', pageContent.content.slice(0, 100) + '...');
  }, [pageContent]);

  const performClick = useCallback(() => {
    if (!clickSelector.trim()) return;
    logAction('click', `Clicking element: "${clickSelector}"`, 'Simulated');
    setClickSelector('');
  }, [clickSelector]);

  const performType = useCallback(() => {
    if (!typeText.trim()) return;
    logAction('type', `Typing "${typeText}" into focused field`, 'Simulated');
    setTypeText('');
  }, [typeText]);

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Browser Agent</h2>
          <p className="text-xs text-gray-400">Automate web browsing with Playwright</p>
        </div>
      </div>

      {/* URL navigation */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
          <Globe className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Enter URL or search..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate()}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
        </div>
        <button
          onClick={navigate}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium hover:shadow-lg transition disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Go
        </button>
      </div>

      {/* Action toolbar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Search */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-medium text-white">Search</span>
          </div>
          <input
            type="text"
            placeholder="Search query..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="w-full bg-white/5 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none mb-2"
          />
          <button onClick={search} disabled={isLoading} className="w-full text-xs text-cyan-400 hover:text-cyan-300">
            Search Google
          </button>
        </div>

        {/* Click */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <MousePointer className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-medium text-white">Click</span>
          </div>
          <input
            type="text"
            placeholder="CSS selector..."
            value={clickSelector}
            onChange={(e) => setClickSelector(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performClick()}
            className="w-full bg-white/5 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none mb-2 font-mono"
          />
          <button onClick={performClick} className="w-full text-xs text-purple-400 hover:text-purple-300">
            Click Element
          </button>
        </div>

        {/* Type */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-white">Type</span>
          </div>
          <input
            type="text"
            placeholder="Text to type..."
            value={typeText}
            onChange={(e) => setTypeText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performType()}
            className="w-full bg-white/5 rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none mb-2"
          />
          <button onClick={performType} className="w-full text-xs text-emerald-400 hover:text-emerald-300">
            Type Text
          </button>
        </div>

        {/* Screenshot */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-white">Capture</span>
          </div>
          <div className="text-xs text-gray-500 mb-2">Take a screenshot of the current page</div>
          <button onClick={captureScreenshot} disabled={isLoading} className="w-full text-xs text-amber-400 hover:text-amber-300">
            Screenshot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Browser Preview</h3>
          <div className="aspect-video rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
            {screenshot ? (
              <img src={screenshot} alt="Browser capture" className="w-full h-full object-contain" />
            ) : pageContent ? (
              <div className="p-4 text-sm text-gray-400 max-h-full overflow-y-auto">
                <p className="font-medium text-white mb-2">{pageContent.title}</p>
                <p className="text-xs">{pageContent.content}</p>
              </div>
            ) : (
              <div className="text-gray-500 text-sm flex flex-col items-center">
                <Globe className="w-12 h-12 mb-2 opacity-30" />
                No page loaded
              </div>
            )}
          </div>
          {pageContent && (
            <button onClick={extractContent} className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Extract page content
            </button>
          )}
        </div>

        {/* Action log */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Action History</h3>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {actionLog.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No actions yet</div>
            ) : (
              actionLog.map((action) => (
                <div key={action.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5 text-xs">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                    action.result === 'Error' ? 'bg-red-400' :
                    action.result === 'Success' || action.result ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  )} />
                  <div className="flex-1 min-w-0">
                    <span className="text-white">{action.description}</span>
                    {action.result && action.result !== 'Error' && (
                      <span className="text-gray-400 ml-2 text-[10px]">{action.result}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
