import React, { useState, useRef } from 'react';
import { BookOpen, Upload, FileText, Search, Trash2, File, FileCode, FileType, Image } from 'lucide-react';
import { cn, formatBytes, formatRelativeTime } from '../lib/utils';

interface KnowledgeDoc {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
  chunkCount: number;
  status: 'processing' | 'indexed' | 'error';
  contentSnippet?: string;
}

const SUPPORTED_TYPES = ['.pdf', '.docx', '.txt', '.csv', '.md', '.png', '.jpg', '.jpeg'];
const ACCEPTED = '.pdf,.docx,.txt,.csv,.md,.png,.jpg,.jpeg';

const SAMPLE_DOCS: KnowledgeDoc[] = [
  { id: 'doc1', filename: 'arcange-architecture.pdf', size: 245000, mimeType: 'application/pdf', createdAt: new Date(Date.now() - 3600000).toISOString(), chunkCount: 42, status: 'indexed', contentSnippet: 'Arcange AI Assistant architecture overview: Electron, React, Python Desktop Agent...' },
  { id: 'doc2', filename: 'api-reference.md', size: 12000, mimeType: 'text/markdown', createdAt: new Date(Date.now() - 7200000).toISOString(), chunkCount: 8, status: 'indexed', contentSnippet: 'API reference for Arcange AI providers: Gemini, OpenRouter, Ollama...' },
];

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg'].includes(ext || '')) return Image;
  if (['md'].includes(ext || '')) return FileCode;
  if (['csv'].includes(ext || '')) return FileType;
  return FileText;
}

export const KnowledgePanel: React.FC = () => {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(SAMPLE_DOCS);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<string>('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const doc: KnowledgeDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
        chunkCount: 0,
        status: 'processing',
      };
      setDocs((prev) => [doc, ...prev]);
      // Simulate processing
      setTimeout(() => {
        setDocs((prev) => prev.map((d) =>
          d.id === doc.id ? { ...d, status: 'indexed', chunkCount: Math.floor(file.size / 800) + 1 } : d
        ));
      }, 2000);
    });
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setIsQuerying(true);
    setQueryResult('');
    // Simulate RAG query
    setTimeout(() => {
      setQueryResult(`Based on your uploaded documents, here's what I found regarding "${query}":\n\nThe knowledge base contains ${docs.filter(d => d.status === 'indexed').length} indexed documents with a total of ${docs.reduce((s, d) => s + d.chunkCount, 0)} chunks. The most relevant context was retrieved from "${docs[0]?.filename}" which mentions similar concepts.\n\nTo enable full RAG retrieval with embeddings, configure your Gemini or OpenRouter API key in Settings > AI Providers.`);
      setIsQuerying(false);
    }, 1500);
  };

  const deleteDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const filtered = docs.filter((d) => !search || d.filename.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Knowledge Base (RAG)</h2>
          <p className="text-xs text-gray-400">Upload documents for retrieval-augmented generation</p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'mb-6 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition',
          dragging ? 'border-blue-500 bg-blue-500/10' : 'border-white/15 hover:border-white/25 bg-white/5'
        )}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-white font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-gray-400 mt-1">Supports: {SUPPORTED_TYPES.join(', ')}</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Query section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-2">Query Knowledge Base</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask a question about your documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
          <button
            onClick={handleQuery}
            disabled={isQuerying}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium hover:shadow-lg transition disabled:opacity-50"
          >
            {isQuerying ? 'Searching...' : 'Search'}
          </button>
        </div>
        {queryResult && (
          <div className="mt-3 p-4 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {queryResult}
          </div>
        )}
      </div>

      {/* Search filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      {/* Document list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No documents found</div>
        ) : (
          filtered.map((doc) => {
            const Icon = getFileIcon(doc.filename);
            return (
              <div key={doc.id} className="group flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium truncate">{doc.filename}</span>
                    <span className={cn(
                      'px-1.5 py-0.5 text-[10px] rounded',
                      doc.status === 'indexed' ? 'bg-emerald-500/20 text-emerald-300' :
                      doc.status === 'processing' ? 'bg-amber-500/20 text-amber-300 animate-pulse' :
                      'bg-red-500/20 text-red-300'
                    )}>
                      {doc.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>{formatBytes(doc.size)}</span>
                    <span>{doc.chunkCount} chunks</span>
                    <span>{formatRelativeTime(doc.createdAt)}</span>
                  </div>
                  {doc.contentSnippet && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{doc.contentSnippet}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteDoc(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
