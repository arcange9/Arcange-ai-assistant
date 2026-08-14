/**
 * Arcange AI Assistant — IPC Handlers
 * Registers all IPC channels between the main process and renderer.
 */

const { ipcMain, dialog, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

function registerIpcHandlers({ mainWindow, store, desktopAgent, backend }) {
  // ---- Window Controls ----
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      // Notify renderer
      mainWindow.webContents.send('window:maximizeChanged', mainWindow.isMaximized());
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  // ---- App Info ----
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:platform', () => process.platform);

  // ---- Settings Store ----
  ipcMain.handle('store:get', (_, key) => store.get(key));
  ipcMain.handle('store:set', (_, key, value) => {
    store.set(key, value);
    return true;
  });
  ipcMain.handle('store:getAll', () => store.getAll());

  // ---- File Dialogs ----
  ipcMain.handle('dialog:openFile', (_, filters = []) => {
    const result = dialog.showOpenDialogSync(mainWindow, {
      properties: ['openFile'],
      filters: filters.length > 0 ? filters : [
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result ? result : null;
  });

  ipcMain.handle('dialog:saveFile', (_, defaultPath = '') => {
    const result = dialog.showSaveDialogSync(mainWindow, {
      defaultPath,
    });
    return result || null;
  });

  // ---- Autostart ----
  ipcMain.handle('autostart:get', () => {
    return store.get('autoStart', false);
  });

  ipcMain.handle('autostart:set', (_, enabled) => {
    store.set('autoStart', enabled);
    app.setLoginItemSettings({ openAtLogin: enabled });
    return true;
  });

  // ---- AI Engine (placeholder — AI engine runs in main process) ----
  ipcMain.handle('ai:chat', async (_, messages, config) => {
    // This will be wired to the AI engine module
    try {
      const provider = config?.provider || store.get('modelRoles.smart.provider');
      const model = config?.model || store.get('modelRoles.smart.model');
      // Dynamic import of AI engine
      // In production, this calls the actual provider
      throw new Error('AI engine not yet wired — use the frontend ai-client.ts for direct API calls');
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('ai:listModels', async (_, providerId, config) => {
    try {
      // Fetch models from the provider's API
      if (providerId === 'gemini') {
        const apiKey = config?.apiKey || store.get('providers.gemini.apiKey');
        if (!apiKey) return { error: 'No API key configured' };
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        const data = await response.json();
        const models = (data.models || [])
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => ({ id: m.name.replace('models/', ''), name: m.displayName }));
        return { models };
      } else if (providerId === 'openrouter') {
        const apiKey = config?.apiKey || store.get('providers.openrouter.apiKey');
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        });
        const data = await response.json();
        const models = (data.data || []).map(m => ({
          id: m.id,
          name: m.name,
          contextLength: m.context_length,
        }));
        return { models };
      } else if (providerId === 'ollama') {
        const baseUrl = config?.baseUrl || store.get('providers.ollama.baseUrl', 'http://localhost:11434');
        const response = await fetch(`${baseUrl}/api/tags`);
        const data = await response.json();
        const models = (data.models || []).map(m => ({
          id: m.name,
          name: m.name,
          size: m.size,
        }));
        return { models };
      }
      return { models: [] };
    } catch (err) {
      return { error: err.message, models: [] };
    }
  });

  // ---- Desktop Agent ----
  ipcMain.handle('desktop:invoke', async (_, method, params) => {
    const agent = desktopAgent();
    if (!agent || !agent.isRunning()) {
      return { error: 'Desktop agent is not running' };
    }
    try {
      const result = await agent.sendCommand(method, params);
      return result;
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('desktop:getStatus', () => {
    const agent = desktopAgent();
    return {
      running: agent?.isRunning() ?? false,
    };
  });

  ipcMain.handle('desktop:restart', async () => {
    const agent = desktopAgent();
    if (agent) {
      agent.stop();
    }
    // Re-import and restart
    const { DesktopAgentBridge } = require('./desktop-agent-bridge');
    const agentPath = path.join(__dirname, '..', 'desktop-agent', 'main.py');
    const newAgent = new DesktopAgentBridge(agentPath);
    newAgent.start();
    return { started: true };
  });

  // ---- Conversations ----
  if (backend) {
    ipcMain.handle('conversations:getAll', () => backend.conversationStore.getAll());
    ipcMain.handle('conversations:get', (_, id) => backend.conversationStore.getById(id));
    ipcMain.handle('conversations:add', (_, conv) => backend.conversationStore.add(conv));
    ipcMain.handle('conversations:update', (_, id, updates) => backend.conversationStore.update(id, updates));
    ipcMain.handle('conversations:delete', (_, id) => backend.conversationStore.delete(id));
    ipcMain.handle('conversations:clear', () => backend.conversationStore.clear());

    ipcMain.handle('workflows:getAll', () => backend.workflowManager.getAll());
    ipcMain.handle('workflows:create', (_, wf) => backend.workflowManager.create(wf));
    ipcMain.handle('workflows:update', (_, id, updates) => backend.workflowManager.update(id, updates));
    ipcMain.handle('workflows:delete', (_, id) => backend.workflowManager.delete(id));
    ipcMain.handle('workflows:toggle', (_, id, enabled) => backend.workflowManager.toggle(id, enabled));
    ipcMain.handle('workflows:getHistory', () => backend.workflowManager.getHistory());

    ipcMain.handle('audit:getAll', () => backend.auditLogger.getAll());
    ipcMain.handle('audit:clear', () => backend.auditLogger.clear());
  }
}

module.exports = { registerIpcHandlers };
