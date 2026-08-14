import React, { useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { ModelSelector } from './ModelSelector';
import { AgentSelector } from './AgentSelector';
import { MessageBubble } from './MessageBubble';
import { SuggestionCards } from './SuggestionCards';
import { ChatInput } from './ChatInput';
import { useChat } from '../hooks/useChat';
import { exportConversation } from '../lib/export';
import { Sparkles, Trash2, Download, Command } from 'lucide-react';

export const ChatPanel: React.FC = () => {
  const { getActiveConversation, isStreaming } = useChatStore();
  const { sendMessage, stopGeneration, regenerate } = useChat();
  const { selectedAgent, setSelectedAgent } = useSettingsStore();

  const conversation = getActiveConversation();
  const messages = conversation?.messages || [];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isStreaming]);

  const handleExport = () => {
    if (conversation) exportConversation(conversation.id, 'markdown');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0c10] relative overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-white/10 glass-panel px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <AgentSelector selectedAgent={selectedAgent} onSelectAgent={setSelectedAgent} />
          <span className="text-gray-600">|</span>
          <ModelSelector />
        </div>

        <div className="flex items-center gap-2">
          <kbd className="hidden md:flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-gray-500 bg-white/5 rounded border border-white/10">
            <Command className="w-2.5 h-2.5" />K
          </kbd>

          {messages.length > 0 && (
            <>
              <button
                onClick={handleExport}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition flex items-center gap-1.5"
                title="Export conversation as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear current conversation history?')) {
                    useChatStore.getState().deleteConversation(conversation?.id || '');
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition flex items-center gap-1.5"
                title="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Message List or Welcome Cards */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-4xl mx-auto h-full flex flex-col justify-center items-center">
            <SuggestionCards onSelectPrompt={(prompt) => sendMessage(prompt)} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRegenerate={() => regenerate(msg.id)}
              />
            ))}

            {isStreaming && (
              <div className="flex items-center gap-3 text-xs text-arcange-400 bg-arcange-500/10 border border-arcange-500/20 px-3 py-2 rounded-xl w-fit animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Arcange AI is thinking and drafting response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-white/10 glass-panel">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSendMessage={sendMessage}
            onStop={stopGeneration}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </div>
  );
};
