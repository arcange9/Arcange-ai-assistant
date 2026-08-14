import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Sparkles, User, AlertCircle, Wrench } from 'lucide-react';
import { cn, formatTime } from '../lib/utils';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.error;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-lg shrink-0 flex items-center justify-center shadow-md',
        isUser
          ? 'bg-gradient-to-br from-gray-600 to-gray-700'
          : 'bg-gradient-to-br from-blue-500 to-purple-600'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {/* Header */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">{isUser ? 'You' : 'Arcange'}</span>
          <span>{formatTime(message.timestamp)}</span>
          {message.model && !isUser && (
            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] font-mono text-gray-400">
              {message.model}
            </span>
          )}
        </div>

        {/* Message body */}
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-gradient-to-br from-blue-600/30 to-purple-600/20 border border-blue-500/30 text-white'
            : isError
              ? 'bg-red-500/10 border border-red-500/30 text-red-100'
              : 'glass-panel border border-white/10 text-gray-100'
        )}>
          {message.isStreaming && message.content === '' ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="relative group/code my-3">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e2e] rounded-t-lg border border-white/10">
                          <span className="text-xs text-gray-400 font-mono">{match[1]}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(String(children));
                            }}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: '0 0 8px 8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderTop: 'none',
                          }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm font-mono text-blue-300" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse rounded-sm align-middle" />
              )}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-xs border border-white/10">
                  {att.type.startsWith('image/') && att.url ? (
                    <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                      <span className="text-[10px] uppercase">{att.name.split('.').pop()}</span>
                    </div>
                  )}
                  <span className="truncate max-w-[120px]">{att.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tool calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.toolCalls.map((tc) => (
                <div key={tc.id} className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 rounded text-xs border border-amber-500/20">
                  <Wrench className="w-3 h-3 text-amber-400" />
                  <span className="font-mono">{tc.name}</span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[10px]',
                    tc.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                    tc.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                    'bg-amber-500/20 text-amber-300'
                  )}>
                    {tc.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex items-center gap-2 mt-2 text-xs text-red-300">
              <AlertCircle className="w-3.5 h-3.5" />
              Error occurred during generation
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isUser && !message.isStreaming && message.content && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:text-white hover:bg-white/5 transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:text-white hover:bg-white/5 transition"
              >
                Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
