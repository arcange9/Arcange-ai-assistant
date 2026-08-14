/**
 * Arcange AI Assistant — Persistent Settings Store
 * Stores user settings in a JSON file in the app's userData directory.
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class Store {
  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'arcange-settings.json');
    this.defaults = {
      // Appearance
      theme: 'dark',

      // AI Providers
      providers: {
        gemini: {
          apiKey: '',
          model: 'gemini-1.5-flash',
        },
        openrouter: {
          apiKey: '',
          model: 'anthropic/claude-3.5-sonnet',
        },
        ollama: {
          baseUrl: 'http://localhost:11434',
          model: 'llama3',
        },
        lmstudio: {
          baseUrl: 'http://localhost:1234',
          model: 'local-model',
        },
      },

      // Model role assignments
      modelRoles: {
        fast: { provider: 'gemini', model: 'gemini-1.5-flash' },
        smart: { provider: 'gemini', model: 'gemini-1.5-pro' },
        coding: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
        vision: { provider: 'gemini', model: 'gemini-1.5-pro' },
      },

      // Model parameters
      modelParams: {
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: 'You are Arcange, an intelligent AI assistant for the computer. You help users with tasks, answer questions, and can control their Windows desktop when asked.',
      },

      // Voice settings
      voice: {
        enabled: false,
        ttsEnabled: true,
        ttsVoice: '',
        ttsRate: 200,
        ttsVolume: 0.9,
        wakeWord: 'Hey Arcange',
        wakeWordEnabled: false, // Architecture only — not yet functional
      },

      // Desktop permissions
      desktopPermissions: {
        enabled: false,
        screen: false,
        keyboard: false,
        mouse: false,
        terminal: false,
        files: false,
      },

      // Memory
      memory: {
        enabled: true,
      },

      // Automation
      automation: {
        autoExecute: false, // Require confirmation by default
      },

      // System
      autoStart: false, // Disabled by default
      closeToTray: true,
      minimizeToTray: false,
      globalHotkey: 'Ctrl+Shift+A',

      // Security
      security: {
        hideApiKeys: true,
        auditLogging: true,
      },
    };

    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const saved = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        // Deep merge with defaults
        return this.deepMerge(this.defaults, saved);
      }
    } catch (err) {
      console.error('[Store] Failed to load settings:', err);
    }
    return { ...this.defaults };
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // Atomic write
      const tmp = this.filePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error('[Store] Failed to save settings:', err);
    }
  }

  deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key]) &&
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  get(key, defaultValue = undefined) {
    const keys = key.split('.');
    let value = this.data;
    for (const k of keys) {
      if (value === undefined || value === null) return defaultValue;
      value = value[k];
    }
    return value !== undefined ? value : defaultValue;
  }

  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    let obj = this.data;
    for (const k of keys) {
      if (obj[k] === undefined) obj[k] = {};
      obj = obj[k];
    }
    obj[lastKey] = value;
    this.save();
  }

  getAll() {
    return this.data;
  }

  setAll(data) {
    this.data = this.deepMerge(this.defaults, data);
    this.save();
  }
}

module.exports = Store;
