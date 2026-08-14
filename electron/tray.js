/**
 * Arcange AI Assistant — System Tray
 */

const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

function createTray(mainWindow, store) {
  // Load icon or create a simple placeholder
  let icon;
  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    // Create a minimal 16x16 tray icon programmatically
    icon = nativeImage.createEmpty();
  }

  // Resize for tray
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 16, height: 16 });
  }

  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('Arcange AI Assistant');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Assistant',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Voice Mode',
      type: 'checkbox',
      checked: store.get('voice.enabled', false),
      click: (menuItem) => {
        store.set('voice.enabled', menuItem.checked);
        if (mainWindow) {
          mainWindow.webContents.send('tray:action', {
            type: 'voice',
            enabled: menuItem.checked,
          });
        }
      },
    },
    {
      label: 'Pause Automation',
      type: 'checkbox',
      checked: !store.get('automation.autoExecute', false),
      click: (menuItem) => {
        store.set('automation.autoExecute', !menuItem.checked);
        if (mainWindow) {
          mainWindow.webContents.send('tray:action', {
            type: 'automation',
            paused: menuItem.checked,
          });
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('tray:action', { type: 'settings' });
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        require('electron').app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click on tray icon shows the window
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Right-click shows context menu (default behavior, but explicit)
  tray.on('right-click', () => {
    tray.popUpContextMenu(contextMenu);
  });

  return tray;
}

module.exports = { createTray };
