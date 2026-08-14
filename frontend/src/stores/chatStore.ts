import { create } from 'zustand';
import { Conversation, Message, AgentType } from '../types';
import { generateId } from '../lib/utils';

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  streamingMessageId: string | null;
  
  // Actions
  setActiveConversation: (id: string | null) => void;
  addConversation: (title?: string, agentType?: AgentType, modelId?: string) => string;
  deleteConversation: (id: string) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  pinConversation: (id: string) => void;
  clearConversations: () => void;
  
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => Message;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  
  setIsStreaming: (isStreaming: boolean, streamingMessageId?: string | null) => void;
  getActiveConversation: () => Conversation | undefined;
}

const DEFAULT_CONVERSATION_ID = 'conv-welcome';

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: DEFAULT_CONVERSATION_ID,
    title: 'Welcome to Arcange AI',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    agentType: 'general',
    modelId: 'gemini-1.5-flash',
    pinned: true,
    messages: [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `👋 **Welcome to Arcange AI Assistant!**

I am your high-performance desktop AI sidekick equipped with screen analysis, browser automation, coding workspace, custom workflows, and deep context memory.

Here are a few things you can try:
1. Ask a question or request code generation
2. Switch to **Coding Workspace** to inspect project files and terminal
3. Open **Automation Panel** to run or build automated workflows
4. Use **Screen & Browser Agents** to inspect live web pages and application windows

How can I help you today?`,
        timestamp: new Date().toISOString(),
        agentType: 'general'
      }
    ]
  }
];

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: INITIAL_CONVERSATIONS,
  activeConversationId: DEFAULT_CONVERSATION_ID,
  isStreaming: false,
  streamingMessageId: null,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addConversation: (title = 'New Conversation', agentType = 'general', modelId = 'gemini-1.5-flash') => {
    const newConv: Conversation = {
      id: generateId(),
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agentType,
      modelId,
      messages: []
    };

    set((state) => ({
      conversations: [newConv, ...state.conversations],
      activeConversationId: newConv.id
    }));

    return newConv.id;
  },

  deleteConversation: (id) => {
    set((state) => {
      const filtered = state.conversations.filter((c) => c.id !== id);
      let nextActiveId = state.activeConversationId;
      if (state.activeConversationId === id) {
        nextActiveId = filtered.length > 0 ? filtered[0].id : null;
      }
      return {
        conversations: filtered,
        activeConversationId: nextActiveId
      };
    });
  },

  updateConversation: (id, updates) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      )
    }));
  },

  pinConversation: (id) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, pinned: !c.pinned } : c
      )
    }));
  },

  clearConversations: () => {
    set({ conversations: [], activeConversationId: null });
  },

  addMessage: (conversationId, messageData) => {
    const newMessage: Message = {
      ...messageData,
      id: generateId(),
      timestamp: new Date().toISOString()
    };

    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          // auto title update if it's the first user message
          let title = conv.title;
          if (conv.title === 'New Conversation' && messageData.role === 'user') {
            title = messageData.content.slice(0, 32) + (messageData.content.length > 32 ? '...' : '');
          }

          return {
            ...conv,
            title,
            updatedAt: new Date().toISOString(),
            messages: [...conv.messages, newMessage]
          };
        }
        return conv;
      })
    }));

    return newMessage;
  },

  updateMessage: (conversationId, messageId, updates) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: conv.messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            )
          };
        }
        return conv;
      })
    }));
  },

  deleteMessage: (conversationId, messageId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: conv.messages.filter((msg) => msg.id !== messageId)
          };
        }
        return conv;
      })
    }));
  },

  setIsStreaming: (isStreaming, streamingMessageId = null) => {
    set({ isStreaming, streamingMessageId });
  },

  getActiveConversation: () => {
    const state = get();
    return state.conversations.find((c) => c.id === state.activeConversationId);
  }
}));
