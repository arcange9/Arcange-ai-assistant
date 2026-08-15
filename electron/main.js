/**
 * Arcange AI Assistant — Electron Main Process
 * Entry point for the desktop application.
 */

const { app, BrowserWindow, globalShortcut, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Window state management
let mainWindow = null;
let isQuitting = false;
let tray = null;

// --- Settings Store ---
const Store = require('./store');
const store = new Store();

// --- IPC Handlers ---
const { registerIpcHandlers } = require('./ipc-handlers');

// --- Backend Services ---
let backend = null;

// --- Tray ---
const { createTray } = require('./tray');

// --- Desktop Agent Bridge ---
const { DesktopAgentBridge } = require('./desktop-agent-bridge');
let desktopAgent = null;

/**
 * Create the main application window
 */
function createMainWindow() {
  const isDev = process.env.NODE_ENV === 'development';

  // If window already exists, just show it
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    title: 'Arcange AI Assistant',
    frame: false, // Custom title bar
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: getIconPath(),
  });

  // Show when ready (prevents flicker)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Fallback: show window after 3 seconds even if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('[Arcange] ready-to-show did not fire, showing window as fallback');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 3000);

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const frontendPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    console.log('[Arcange] Loading frontend from:', frontendPath);
    
    // Check if the file exists before loading
    if (!fs.existsSync(frontendPath)) {
      console.error('[Arcange] Frontend file not found:', frontendPath);
      // Show an error page as fallback
      mainWindow.loadURL('data:text/html,<html><body style="background:#0a0a0f;color:#fff;font-family:Arial;padding:40px;"><h1>Arcange AI Assistant</h1><p>Failed to load the interface. The frontend files are missing.</p><p>Please reinstall the application.</p></body></html>');
      mainWindow.show();
      return mainWindow;
    }
    
    mainWindow.loadFile(frontendPath).catch(err => {
      console.error('[Arcange] Failed to load frontend:', err);
      mainWindow.loadURL('data:text/html,<html><body style="background:#0a0a0f;color:#fff;font-family:Arial;padding:40px;"><h1>Arcange AI Assistant</h1><p>Failed to load the interface.</p><p>Error: ' + encodeURIComponent(err.message) + '</p></body></html>');
      mainWindow.show();
    });
  }

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Window control events
  mainWindow.on('minimize', () => {
    if (store.get('minimizeToTray', false)) {
      event?.preventDefault?.();
      mainWindow.hide();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && store.get('closeToTray', true)) {
      event.preventDefault();
      mainWindow.hide();
      return;
    }
    mainWindow = null;
  });

  // Register global hotkey
  registerGlobalHotkey();

  return mainWindow;
}

/**
 * Get the icon path (with fallback)
 */
function getIconPath() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  if (fs.existsSync(iconPath)) {
    return iconPath;
  }
  return undefined;
}

/**
 * Register the global hotkey
 */
function registerGlobalHotkey() {
  // Unregister any existing
  globalShortcut.unregisterAll();

  const hotkey = store.get('globalHotkey', 'Ctrl+Shift+A');
  try {
    const ret = globalShortcut.register(hotkey, () => {
      if (mainWindow) {
        if (mainWindow.isVisible() && mainWindow.isFocused()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        createMainWindow();
      }
    });

    if (!ret) {
      console.error('[Arcange] Failed to register global hotkey:', hotkey);
    }
  } catch (err) {
    console.error('[Arcange] Global hotkey error:', err);
  }
}

/**
 * Single instance lock
 */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// App ready
app.whenReady().then(() => {
  // Initialize backend services (wrapped in try-catch so window still shows if it fails)
  try {
    const { initializeBackend } = require('../../backend');
    backend = initializeBackend(app);
    console.log('[Arcange] Backend initialized successfully');
  } catch (err) {
    console.error('[Arcange] Failed to initialize backend (non-fatal):', err.message);
    backend = null;
  }

  // Create the main window FIRST so it shows immediately
  createMainWindow();

  // Create system tray (wrapped in try-catch)
  try {
    tray = createTray(mainWindow, store);
    console.log('[Arcange] Tray created');
  } catch (err) {
    console.error('[Arcange] Failed to create tray (non-fatal):', err.message);
  }

  // Register IPC handlers (wrapped in try-catch)
  try {
    registerIpcHandlers({ mainWindow, store, desktopAgent: () => desktopAgent, backend });
    console.log('[Arcange] IPC handlers registered');
  } catch (err) {
    console.error('[Arcange] Failed to register IPC handlers (non-fatal):', err.message);
  }

  // Start desktop agent (if enabled)
  try {
    const desktopSettings = store.get('desktopPermissions', {});
    if (desktopSettings.enabled) {
      startDesktopAgent();
    }
  } catch (err) {
    console.error('[Arcange] Desktop agent error (non-fatal):', err.message);
  }

  // Auto-start with Windows
  try {
    const autoStart = store.get('autoStart', false);
    app.setLoginItemSettings({
      openAtLogin: autoStart,
    });
  } catch (err) {
    console.error('[Arcange] Auto-start config error (non-fatal):', err.message);
  }

  console.log('[Arcange] Application started successfully');
});

// Quit when all windows closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (!tray) {
      app.quit();
    }
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Cleanup on quit
app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  if (desktopAgent) {
    desktopAgent.stop();
  }
});

/**
 * Start the Python Desktop Agent
 */
function startDesktopAgent() {
  try {
    const agentPath = path.join(__dirname, '..', 'desktop-agent', 'main.py');
    if (!fs.existsSync(agentPath)) {
      console.warn('[Arcange] Desktop agent not found at:', agentPath);
      return;
    }

    desktopAgent = new DesktopAgentBridge(agentPath);
    desktopAgent.start();

    console.log('[Arcange] Desktop agent started');
  } catch (err) {
    console.error('[Arcange] Failed to start desktop agent:', err);
  }
}

// Export for IPC handlers
module.exports = {
  getMainWindow: () => mainWindow,
  getStore: () => store,
  getDesktopAgent: () => desktopAgent,
  restartDesktopAgent: startDesktopAgent,
};
