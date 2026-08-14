/**
 * Arcange AI Assistant — Desktop App Shell
 * 
 * This module provides the main desktop application shell that orchestrates
 * the Electron window, AI Engine, and Desktop Agent.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initializeBackend } = require('../../backend');

// Will be populated after initialization
let mainWindow = null;
let backend = null;

function createMainWindow() {
  const isDev = process.env.NODE_ENV === 'development';
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    title: 'Arcange AI Assistant',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
  });

  // Show window when ready (prevents flicker)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createMainWindow,
  getMainWindow,
  initializeBackend,
};
