/**
 * Arcange AI Assistant — Preload Script
 * Secure bridge between the renderer (React) and main (Electron) processes.
 * Exposes window.arcange.* API matching the frontend's api.ts expectations.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('arcange', {
  // ---- Window Controls ----
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback) => {
      ipcRenderer.on('window:maximizeChanged', (_, isMaximized) => callback(isMaximized));
    },
  },

  // ---- App Info ----
  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
    getPlatform: () => ipcRenderer.invoke('app:platform'),
  },

  // ---- System (matches frontend api.ts) ----
  system: {
    getSettings: () => ipcRenderer.invoke('store:getAll'),
    saveSettings: (settings) => ipcRenderer.invoke('store:set', 'settings', settings),
    executeTerminalCommand: (cmd) => ipcRenderer.invoke('desktop:invoke', 'terminal.execute', { command: cmd }),
    takeScreenshot: () => ipcRenderer.invoke('desktop:invoke', 'screen.capture', {}),
  },

  // ---- Files (matches frontend api.ts) ----
  files: {
    selectFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    readFile: (path) => ipcRenderer.invoke('desktop:invoke', 'filesystem.read', { path }),
    writeFile: (path, content) => ipcRenderer.invoke('desktop:invoke', 'filesystem.write', { path, content }),
  },

  // ---- Browser (matches frontend api.ts) ----
  browser: {
    navigate: (url) => ipcRenderer.invoke('browser:invoke', 'navigate', { url }),
    captureView: () => ipcRenderer.invoke('browser:invoke', 'screenshot', {}),
    invoke: (method, params) => ipcRenderer.invoke('browser:invoke', method, params || {}),
    close: () => ipcRenderer.invoke('browser:close'),
  },

  // ---- Settings Store ----
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    getAll: () => ipcRenderer.invoke('store:getAll'),
  },

  // ---- File Dialogs ----
  dialog: {
    openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
    saveFile: (defaultPath) => ipcRenderer.invoke('dialog:saveFile', defaultPath),
  },

  // ---- AI Engine ----
  ai: {
    chat: (messages, config) => ipcRenderer.invoke('ai:chat', messages, config),
    streamChat: (messages, config) => {
      const streamId = `stream_${Date.now()}_${Math.random()}`;
      ipcRenderer.send('ai:streamChat', { streamId, messages, config });
      return {
        onChunk: (callback) => ipcRenderer.on(`ai:chunk:${streamId}`, (_, chunk) => callback(chunk)),
        onDone: (callback) => ipcRenderer.once(`ai:done:${streamId}`, (_, response) => callback(response)),
        onError: (callback) => ipcRenderer.once(`ai:error:${streamId}`, (_, error) => callback(error)),
        stop: () => ipcRenderer.send(`ai:stop:${streamId}`),
      };
    },
    listModels: (providerId, config) => ipcRenderer.invoke('ai:listModels', providerId, config),
  },

  // ---- Desktop Agent ----
  desktop: {
    invoke: (method, params) => ipcRenderer.invoke('desktop:invoke', method, params),
    getStatus: () => ipcRenderer.invoke('desktop:getStatus'),
    restart: () => ipcRenderer.invoke('desktop:restart'),
  },

  // ---- Voice ----
  voice: {
    startListening: () => ipcRenderer.invoke('voice:startListening'),
    stopListening: () => ipcRenderer.invoke('voice:stopListening'),
    speak: (text) => ipcRenderer.invoke('voice:speak', text),
    stopSpeaking: () => ipcRenderer.invoke('voice:stopSpeaking'),
    getStatus: () => ipcRenderer.invoke('voice:getStatus'),
  },

  // ---- Memory ----
  memory: {
    getAll: () => ipcRenderer.invoke('memory:getAll'),
    add: (category, content) => ipcRenderer.invoke('memory:add', category, content),
    delete: (id) => ipcRenderer.invoke('memory:delete', id),
    clearAll: () => ipcRenderer.invoke('memory:clearAll'),
    search: (query) => ipcRenderer.invoke('memory:search', query),
  },

  // ---- Conversations ----
  conversations: {
    getAll: () => ipcRenderer.invoke('conversations:getAll'),
    get: (id) => ipcRenderer.invoke('conversations:get', id),
    add: (conv) => ipcRenderer.invoke('conversations:add', conv),
    update: (id, updates) => ipcRenderer.invoke('conversations:update', id, updates),
    delete: (id) => ipcRenderer.invoke('conversations:delete', id),
    clear: () => ipcRenderer.invoke('conversations:clear'),
  },

  // ---- Workflows ----
  workflows: {
    getAll: () => ipcRenderer.invoke('workflows:getAll'),
    create: (wf) => ipcRenderer.invoke('workflows:create', wf),
    update: (id, updates) => ipcRenderer.invoke('workflows:update', id, updates),
    delete: (id) => ipcRenderer.invoke('workflows:delete', id),
    toggle: (id, enabled) => ipcRenderer.invoke('workflows:toggle', id, enabled),
    getHistory: () => ipcRenderer.invoke('workflows:getHistory'),
    run: (id) => ipcRenderer.invoke('workflows:run', id),
    stop: (id) => ipcRenderer.invoke('workflows:stop', id),
  },

  // ---- RAG / Knowledge Base ----
  rag: {
    ingest: (filePath) => ipcRenderer.invoke('rag:ingest', filePath),
    query: (question) => ipcRenderer.invoke('rag:query', question),
    listDocuments: () => ipcRenderer.invoke('rag:listDocuments'),
    deleteDocument: (docId) => ipcRenderer.invoke('rag:deleteDocument', docId),
    clearAll: () => ipcRenderer.invoke('rag:clearAll'),
    getStatus: () => ipcRenderer.invoke('rag:getStatus'),
  },

  // ---- Activity Monitor ----
  activity: {
    onEvent: (callback) => ipcRenderer.on('activity:event', (_, event) => callback(event)),
  },

  // ---- Permission System ----
  permission: {
    onRequest: (callback) => ipcRenderer.on('permission:request', (_, request) => callback(request)),
    respond: (requestId, granted) => ipcRenderer.send('permission:respond', requestId, granted),
  },

  // ---- Autostart ----
  autostart: {
    get: () => ipcRenderer.invoke('autostart:get'),
    set: (enabled) => ipcRenderer.invoke('autostart:set', enabled),
  },

  // ---- Tray ----
  tray: {
    onAction: (callback) => ipcRenderer.on('tray:action', (_, action) => callback(action)),
  },

  // ---- Audit Log ----
  audit: {
    getAll: () => ipcRenderer.invoke('audit:getAll'),
    clear: () => ipcRenderer.invoke('audit:clear'),
  },
});
