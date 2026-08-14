import { useChatStore } from '../stores/chatStore';
import { Message } from '../types';

/**
 * Export conversation to various formats (Markdown, JSON, TXT)
 */
export function exportConversation(conversationId: string, format: 'markdown' | 'json' | 'txt' = 'markdown'): void {
  const store = useChatStore.getState();
  const conv = store.conversations.find(c => c.id === conversationId);
  if (!conv) return;

  let content = '';
  let filename = `${conv.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`;
  let mimeType = 'text/plain';

  if (format === 'json') {
    content = JSON.stringify({
      title: conv.title,
      createdAt: conv.createdAt,
      messages: conv.messages,
    }, null, 2);
    filename += '.json';
    mimeType = 'application/json';
  } else if (format === 'markdown') {
    content = `# ${conv.title}\n\n`;
    content += `*Exported from Arcange AI Assistant on ${new Date().toLocaleString()}*\n\n`;
    content += `---\n\n`;
    conv.messages.forEach((msg: Message) => {
      const role = msg.role === 'user' ? '👤 **You**' : '🤖 **Arcange**';
      content += `### ${role}\n${new Date(msg.timestamp).toLocaleString()}\n\n${msg.content}\n\n`;
      if (msg.attachments && msg.attachments.length > 0) {
        content += `*Attachments: ${msg.attachments.map(a => a.name).join(', ')}*\n\n`;
      }
      content += `---\n\n`;
    });
    filename += '.md';
    mimeType = 'text/markdown';
  } else {
    content = `Arcange AI Assistant - Conversation Export\n`;
    content += `Title: ${conv.title}\n`;
    content += `Date: ${new Date(conv.createdAt).toLocaleString()}\n`;
    content += `${'='.repeat(60)}\n\n`;
    conv.messages.forEach((msg: Message) => {
      const role = msg.role === 'user' ? 'YOU' : 'ARCANGE';
      content += `[${role}] ${new Date(msg.timestamp).toLocaleTimeString()}\n${msg.content}\n\n`;
      content += `${'-'.repeat(40)}\n\n`;
    });
    filename += '.txt';
  }

  // Create and trigger download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
