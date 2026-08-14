/**
 * Arcange AI Assistant — Backend Services
 * 
 * This module provides backend services that run within the Electron main process.
 * It handles: conversation persistence, workflow management, audit logging,
 * and serves as the bridge between the AI Engine and the Desktop Agent.
 */

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ---- Conversation Persistence ----

class ConversationStore {
  constructor(dataDir) {
    this.filePath = path.join(dataDir, 'conversations.json');
    this.conversations = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch (err) {
      console.error('[ConversationStore] Failed to load:', err);
    }
    return [];
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = this.filePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.conversations, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error('[ConversationStore] Failed to save:', err);
    }
  }

  getAll() {
    return this.conversations;
  }

  getById(id) {
    return this.conversations.find(c => c.id === id);
  }

  add(conversation) {
    this.conversations.unshift(conversation);
    this.save();
    return conversation;
  }

  update(id, updates) {
    const idx = this.conversations.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.conversations[idx] = { ...this.conversations[idx], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.conversations[idx];
    }
    return null;
  }

  delete(id) {
    this.conversations = this.conversations.filter(c => c.id !== id);
    this.save();
  }

  clear() {
    this.conversations = [];
    this.save();
  }
}

// ---- Workflow Manager ----

class WorkflowManager {
  constructor(dataDir) {
    this.filePath = path.join(dataDir, 'workflows.json');
    this.workflows = this.load();
    this.executionHistory = [];
    this.runningWorkflows = new Map();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch (err) {
      console.error('[WorkflowManager] Failed to load:', err);
    }
    return [];
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = this.filePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.workflows, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error('[WorkflowManager] Failed to save:', err);
    }
  }

  getAll() {
    return this.workflows;
  }

  create(workflow) {
    const wf = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      enabled: false,
      lastRun: null,
      createdAt: new Date().toISOString(),
      ...workflow,
    };
    this.workflows.push(wf);
    this.save();
    return wf;
  }

  update(id, updates) {
    const idx = this.workflows.findIndex(w => w.id === id);
    if (idx >= 0) {
      this.workflows[idx] = { ...this.workflows[idx], ...updates };
      this.save();
      return this.workflows[idx];
    }
    return null;
  }

  delete(id) {
    this.workflows = this.workflows.filter(w => w.id !== id);
    this.save();
  }

  toggle(id, enabled) {
    return this.update(id, { enabled });
  }

  getHistory() {
    return this.executionHistory;
  }

  addHistory(entry) {
    this.executionHistory.unshift({
      id: `hist_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    });
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(0, 100);
    }
  }

  isRunning(id) {
    return this.runningWorkflows.has(id);
  }

  setRunning(id, isRunning) {
    if (isRunning) {
      this.runningWorkflows.set(id, true);
    } else {
      this.runningWorkflows.delete(id);
    }
  }
}

// ---- Audit Logger ----

class AuditLogger {
  constructor(dataDir) {
    this.filePath = path.join(dataDir, 'audit-log.json');
    this.logs = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch (err) {
      console.error('[AuditLogger] Failed to load:', err);
    }
    return [];
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.logs.slice(-500), null, 2));
    } catch (err) {
      console.error('[AuditLogger] Failed to save:', err);
    }
  }

  log(action, details = {}) {
    const entry = {
      id: `audit_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      details,
    };
    this.logs.push(entry);
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500);
    }
    this.save();
    return entry;
  }

  getAll() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.save();
  }
}

// ---- Initialize and Register IPC ----

function initializeBackend(app) {
  const dataDir = path.join(app.getPath('userData'), 'arcange-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const conversationStore = new ConversationStore(dataDir);
  const workflowManager = new WorkflowManager(dataDir);
  const auditLogger = new AuditLogger(dataDir);

  // Conversation IPC
  ipcMain.handle('conversations:getAll', () => conversationStore.getAll());
  ipcMain.handle('conversations:get', (_, id) => conversationStore.getById(id));
  ipcMain.handle('conversations:add', (_, conv) => conversationStore.add(conv));
  ipcMain.handle('conversations:update', (_, id, updates) => conversationStore.update(id, updates));
  ipcMain.handle('conversations:delete', (_, id) => conversationStore.delete(id));
  ipcMain.handle('conversations:clear', () => conversationStore.clear());

  // Workflow IPC
  ipcMain.handle('workflows:getAll', () => workflowManager.getAll());
  ipcMain.handle('workflows:create', (_, wf) => workflowManager.create(wf));
  ipcMain.handle('workflows:update', (_, id, updates) => workflowManager.update(id, updates));
  ipcMain.handle('workflows:delete', (_, id) => workflowManager.delete(id));
  ipcMain.handle('workflows:toggle', (_, id, enabled) => workflowManager.toggle(id, enabled));
  ipcMain.handle('workflows:getHistory', () => workflowManager.getHistory());

  // Audit IPC
  ipcMain.handle('audit:getAll', () => auditLogger.getAll());
  ipcMain.handle('audit:clear', () => auditLogger.clear());
  ipcMain.handle('audit:log', (_, action, details) => auditLogger.log(action, details));

  return {
    conversationStore,
    workflowManager,
    auditLogger,
    dataDir,
  };
}

module.exports = {
  ConversationStore,
  WorkflowManager,
  AuditLogger,
  initializeBackend,
};
