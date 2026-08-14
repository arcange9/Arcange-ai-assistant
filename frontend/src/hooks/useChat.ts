import { useRef, useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useAgentStore } from '../stores/agentStore';
import { streamChatCompletion } from '../lib/ai-client';
import { Attachment } from '../types';

export function useChat() {
  const {
    conversations,
    activeConversationId,
    addConversation,
    addMessage,
    updateMessage,
    setIsStreaming,
    getActiveConversation
  } = useChatStore();

  const { defaultProvider, defaultModelId, apiKeys, selectedAgent } = useSettingsStore();
  const { addActivity, updateActivity } = useAgentStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, attachments: Attachment[] = []) => {
      if (!content.trim() && attachments.length === 0) return;

      let convId = activeConversationId;
      if (!convId) {
        convId = addConversation('New Chat', selectedAgent, defaultModelId);
      }

      // Add user message
      addMessage(convId, {
        role: 'user',
        content,
        agentType: selectedAgent,
        attachments
      });

      // Add empty assistant message for streaming
      const assistantMsg = addMessage(convId, {
        role: 'assistant',
        content: '',
        agentType: selectedAgent,
        isStreaming: true
      });

      setIsStreaming(true, assistantMsg.id);

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      const actId = addActivity({
        type: 'agent_start',
        status: 'running',
        title: `AI Generation (${selectedAgent})`,
        description: `Processing prompt with provider ${defaultProvider}`,
        agentType: selectedAgent
      });

      const conv = getActiveConversation();
      const currentMessages = conv ? [...conv.messages] : [];

      const apiKey = apiKeys[defaultProvider as keyof typeof apiKeys] || '';

      let accumulatedText = '';

      await streamChatCompletion({
        messages: currentMessages,
        provider: defaultProvider,
        modelId: defaultModelId,
        apiKey,
        signal: abortControllerRef.current.signal,
        onChunk: (chunk) => {
          accumulatedText += chunk;
          updateMessage(convId!, assistantMsg.id, {
            content: accumulatedText,
            isStreaming: true
          });
        },
        onError: (err) => {
          updateMessage(convId!, assistantMsg.id, {
            content: accumulatedText + `\n\n⚠️ *Error during stream generation: ${err.message}*`,
            isStreaming: false,
            error: true
          });
          updateActivity(actId, {
            status: 'error',
            description: `Failed: ${err.message}`
          });
          setIsStreaming(false, null);
        },
        onComplete: (fullText) => {
          updateMessage(convId!, assistantMsg.id, {
            content: fullText,
            isStreaming: false
          });
          updateActivity(actId, {
            status: 'success',
            description: 'Response stream completed successfully'
          });
          setIsStreaming(false, null);
        }
      });
    },
    [
      activeConversationId,
      addConversation,
      addMessage,
      updateMessage,
      setIsStreaming,
      getActiveConversation,
      defaultProvider,
      defaultModelId,
      apiKeys,
      selectedAgent,
      addActivity,
      updateActivity
    ]
  );

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false, null);
  }, [setIsStreaming]);

  const regenerate = useCallback(
    async (messageId: string) => {
      const conv = getActiveConversation();
      if (!conv) return;

      const msgIndex = conv.messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      // Get history up to the previous message
      const targetMsg = conv.messages[msgIndex];
      if (targetMsg.role !== 'assistant') return;

      // Update message to empty and streaming state
      updateMessage(conv.id, messageId, {
        content: '',
        isStreaming: true,
        error: false
      });

      setIsStreaming(true, messageId);
      abortControllerRef.current = new AbortController();

      const apiKey = apiKeys[defaultProvider as keyof typeof apiKeys] || '';
      const historyToPrompt = conv.messages.slice(0, msgIndex);

      let accumulatedText = '';

      await streamChatCompletion({
        messages: historyToPrompt,
        provider: defaultProvider,
        modelId: defaultModelId,
        apiKey,
        signal: abortControllerRef.current.signal,
        onChunk: (chunk) => {
          accumulatedText += chunk;
          updateMessage(conv.id, messageId, {
            content: accumulatedText,
            isStreaming: true
          });
        },
        onError: (err) => {
          updateMessage(conv.id, messageId, {
            content: accumulatedText + `\n\n⚠️ *Regeneration failed: ${err.message}*`,
            isStreaming: false,
            error: true
          });
          setIsStreaming(false, null);
        },
        onComplete: (fullText) => {
          updateMessage(conv.id, messageId, {
            content: fullText,
            isStreaming: false
          });
          setIsStreaming(false, null);
        }
      });
    },
    [getActiveConversation, updateMessage, setIsStreaming, defaultProvider, defaultModelId, apiKeys]
  );

  return {
    sendMessage,
    stopGeneration,
    regenerate,
    activeConversation: getActiveConversation()
  };
}
