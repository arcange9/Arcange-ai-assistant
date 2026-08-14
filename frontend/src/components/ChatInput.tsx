import React, { useState, useRef, KeyboardEvent } from 'react';
import { Send, Square, Paperclip, Mic, MicOff, X, Image as ImageIcon, FileText } from 'lucide-react';
import { useVoice } from '../hooks/useVoice';
import { Attachment } from '../types';
import { api } from '../lib/api';
import { cn, formatBytes } from '../lib/utils';

interface ChatInputProps {
  onSendMessage: (content: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onStop, isStreaming }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isRecording, startRecording, stopRecording } = useVoice();

  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(input, attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileAttach = async () => {
    const selected = await api.files.selectFile({ multiple: true });
    if (selected && selected.length > 0) {
      const newAttachments: Attachment[] = selected.map((filePath) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: filePath.split('/').pop() || filePath,
        size: Math.floor(Math.random() * 500000) + 1024,
        type: filePath.endsWith('.png') || filePath.endsWith('.jpg') ? 'image/png' : 'text/plain',
        path: filePath
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleVoice = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording((transcriptText) => {
        setInput((prev) => (prev ? `${prev} ${transcriptText}` : transcriptText));
      });
    }
  };

  return (
    <div className="relative glass-card rounded-2xl p-2 border border-white/10 shadow-xl focus-within:border-arcange-500/50 transition-all">
      {/* Attachment Chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-2 pb-1 border-b border-white/5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 bg-white/10 text-xs px-2.5 py-1 rounded-lg border border-white/10 text-gray-200"
            >
              {att.type.startsWith('image') ? (
                <ImageIcon className="w-3.5 h-3.5 text-arcange-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span className="truncate max-w-[140px] font-medium">{att.name}</span>
              <span className="text-[10px] text-gray-400">({formatBytes(att.size)})</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="hover:text-red-400 p-0.5 rounded text-gray-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Textarea */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
        }}
        onKeyDown={handleKeyDown}
        placeholder={
          isRecording ? 'Listening for voice input...' : 'Ask Arcange anything, write code, run commands...'
        }
        className="w-full bg-transparent text-sm text-white placeholder-gray-500 px-3 py-2 border-0 focus:outline-none focus:ring-0 resize-none max-h-44"
      />

      {/* Action Toolbar */}
      <div className="flex items-center justify-between px-2 pt-1 border-t border-white/5 text-gray-400">
        <div className="flex items-center gap-1">
          <button
            onClick={handleFileAttach}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
            title="Attach files or screenshots"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            onClick={toggleVoice}
            className={cn(
              'p-1.5 rounded-lg transition flex items-center gap-1.5 text-xs font-medium',
              isRecording
                ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/30'
                : 'hover:bg-white/10 text-gray-400 hover:text-white'
            )}
            title={isRecording ? 'Stop Recording' : 'Voice Dictation'}
          >
            {isRecording ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
            {isRecording && <span>Recording...</span>}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">
            Shift + Enter for new line
          </span>

          {isStreaming ? (
            <button
              onClick={onStop}
              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition flex items-center gap-1 text-xs font-medium"
              title="Stop Generation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() && attachments.length === 0}
              className={cn(
                'p-2 rounded-xl transition flex items-center justify-center',
                input.trim() || attachments.length > 0
                  ? 'arcange-gradient-bg text-white shadow-lg arcange-glow hover:opacity-90'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              )}
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
