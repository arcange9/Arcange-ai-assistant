import React, { useState } from 'react';
import {
  MessageSquare,
  Bot,
  Zap,
  Database,
  BookOpen,
  Code2,
  Monitor,
  Globe,
  Settings,
  Plus,
  Trash2,
  Pin,
  Search,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { cn, formatRelativeTime } from '../lib/utils';

export type NavView = 'chat' | 'agents' | 'automation' | 'memory' | 'knowledge' | 'coding' | 'screen' | 'browser' | 'settings';

interface SidebarProps {
  activeView: NavView;
  setActiveView: (view: NavView) => void;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, collapsed = false }) => {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    addConversation,
    deleteConversation,
    pinConversation
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinned = filteredConversations.filter((c) => c.pinned);
  const unpinned = filteredConversations.filter((c) => !c.pinned);

  const mainNavItems = [
    { id: 'chat', label: 'Chat Assistant', icon: MessageSquare },
    { id: 'agents', label: 'AI Agents', icon: Bot, badge: '6' },
    { id: 'coding', label: 'Coding Workspace', icon: Code2 },
    { id: 'automation', label: 'Automation Hub', icon: Zap },
    { id: 'screen', label: 'Screen Analysis', icon: Monitor },
    { id: 'browser', label: 'Browser Agent', icon: Globe },
    { id: 'memory', label: 'Context Memory', icon: Database },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
  ];

  return (
    <aside
      className={cn(
        'h-full glass-panel flex flex-col border-r border-white/10 transition-all duration-300 select-none z-20',
        collapsed ? 'w-16' : 'w-72'
      )}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl arcange-gradient-bg flex items-center justify-center shadow-lg arcange-glow">
            <Sparkles className="w-5 h-5 text-white animate-pulse-slow" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-base arcange-gradient-text tracking-wide">
                ARCANGE AI
              </h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                Desktop Assistant
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="p-2 space-y-1 border-b border-white/10">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as NavView)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-arcange-600/30 to-purple-600/20 text-white border border-arcange-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-arcange-400' : 'text-gray-400')} />
              {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] bg-arcange-500/20 text-arcange-300 rounded-full border border-arcange-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conversations Section (Visible when Chat view selected or expand mode) */}
      {!collapsed && (
        <div className="flex-1 flex flex-col min-h-0 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Conversations
            </span>
            <button
              onClick={() => {
                setActiveView('chat');
                addConversation();
              }}
              className="flex items-center gap-1 text-xs text-arcange-400 hover:text-arcange-300 px-2 py-1 rounded-md bg-arcange-500/10 hover:bg-arcange-500/20 border border-arcange-500/30 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-arcange-500/50"
            />
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500">
                No conversations found
              </div>
            ) : (
              <>
                {pinned.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] text-gray-500 uppercase font-semibold px-2 mb-1 flex items-center gap-1">
                      <Pin className="w-3 h-3 text-arcange-400" /> Pinned
                    </div>
                    {pinned.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conv={conv}
                        isActive={activeView === 'chat' && activeConversationId === conv.id}
                        onSelect={() => {
                          setActiveView('chat');
                          setActiveConversation(conv.id);
                        }}
                        onPin={() => pinConversation(conv.id)}
                        onDelete={() => deleteConversation(conv.id)}
                      />
                    ))}
                  </div>
                )}

                {unpinned.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={activeView === 'chat' && activeConversationId === conv.id}
                    onSelect={() => {
                      setActiveView('chat');
                      setActiveConversation(conv.id);
                    }}
                    onPin={() => pinConversation(conv.id)}
                    onDelete={() => deleteConversation(conv.id)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer Settings Button */}
      <div className="p-3 border-t border-white/10 mt-auto">
        <button
          onClick={() => setActiveView('settings')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition',
            activeView === 'settings'
              ? 'bg-arcange-600/30 text-white border border-arcange-500/40'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Settings className="w-4 h-4 text-gray-400" />
          {!collapsed && <span>Settings & System</span>}
        </button>
      </div>
    </aside>
  );
};

interface ConversationItemProps {
  conv: any;
  isActive: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conv,
  isActive,
  onSelect,
  onPin,
  onDelete
}) => {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all duration-150',
        isActive
          ? 'bg-white/10 text-white border border-white/15'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      )}
    >
      <div className="flex flex-col min-w-0 flex-1 pr-2">
        <span className="font-medium truncate text-gray-200 group-hover:text-white">
          {conv.title}
        </span>
        <span className="text-[10px] text-gray-500 font-mono">
          {formatRelativeTime(conv.updatedAt)}
        </span>
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          className={cn(
            'p-1 rounded hover:bg-white/10 text-gray-400 hover:text-arcange-300',
            conv.pinned && 'opacity-100 text-arcange-400'
          )}
          title={conv.pinned ? 'Unpin' : 'Pin conversation'}
        >
          <Pin className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
          title="Delete conversation"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
