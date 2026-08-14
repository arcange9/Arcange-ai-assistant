/**
 * IPC bridge to Electron (window.arcange.* calls with web fallbacks)
 */

declare global {
  interface Window {
    arcange?: {
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
      };
      system: {
        getSettings: () => Promise<any>;
        saveSettings: (settings: any) => Promise<boolean>;
        executeTerminalCommand: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
        takeScreenshot: () => Promise<string>;
      };
      files: {
        selectFile: (options?: any) => Promise<string[] | null>;
        readFile: (path: string) => Promise<string>;
        writeFile: (path: string, content: string) => Promise<boolean>;
      };
      browser: {
        navigate: (url: string) => Promise<{ title: string; content: string }>;
        captureView: () => Promise<string>;
      };
    };
  }
}

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.arcange);
};

export const api = {
  window: {
    minimize: () => {
      if (window.arcange?.window) {
        window.arcange.window.minimize();
      } else {
        console.log('[Web Fallback] Window minimize requested');
      }
    },
    maximize: () => {
      if (window.arcange?.window) {
        window.arcange.window.maximize();
      } else {
        console.log('[Web Fallback] Window maximize requested');
      }
    },
    close: () => {
      if (window.arcange?.window) {
        window.arcange.window.close();
      } else {
        console.log('[Web Fallback] Window close requested');
      }
    },
  },

  system: {
    getSettings: async () => {
      if (window.arcange?.system) {
        return await window.arcange.system.getSettings();
      }
      const local = localStorage.getItem('arcange_settings');
      return local ? JSON.parse(local) : null;
    },

    saveSettings: async (settings: any) => {
      if (window.arcange?.system) {
        return await window.arcange.system.saveSettings(settings);
      }
      localStorage.setItem('arcange_settings', JSON.stringify(settings));
      return true;
    },

    executeTerminalCommand: async (cmd: string) => {
      if (window.arcange?.system) {
        return await window.arcange.system.executeTerminalCommand(cmd);
      }
      // Web fallback mock terminal output
      return new Promise((resolve) => {
        setTimeout(() => {
          if (cmd.startsWith('ls') || cmd.startsWith('dir')) {
            resolve({ stdout: 'src/  package.json  vite.config.ts  README.md', stderr: '', exitCode: 0 });
          } else if (cmd.startsWith('node -v') || cmd.startsWith('node --version')) {
            resolve({ stdout: 'v20.14.0', stderr: '', exitCode: 0 });
          } else {
            resolve({ stdout: `Executed: ${cmd}\nCommand completed successfully.`, stderr: '', exitCode: 0 });
          }
        }, 400);
      });
    },

    takeScreenshot: async (): Promise<string> => {
      if (window.arcange?.system) {
        return await window.arcange.system.takeScreenshot();
      }
      // Return a simulated high-tech placeholder canvas/image data URL in web mode
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = '#6366f1';
        ctx.font = '28px sans-serif';
        ctx.fillText('Arcange Desktop Screen Capture Preview', 100, 100);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '18px monospace';
        ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 100, 150);
        ctx.fillText('Active Window: Visual Studio Code - arcange-ai-assistant', 100, 190);
      }
      return canvas.toDataURL('image/png');
    }
  },

  files: {
    selectFile: async (options?: any): Promise<string[] | null> => {
      if (window.arcange?.files) {
        return await window.arcange.files.selectFile(options);
      }
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = options?.multiple ?? false;
        input.onchange = (e: any) => {
          const files = Array.from(e.target.files || []).map((f: any) => f.name);
          resolve(files.length > 0 ? files : null);
        };
        input.click();
      });
    },

    readFile: async (path: string): Promise<string> => {
      if (window.arcange?.files) {
        return await window.arcange.files.readFile(path);
      }
      return `// Mock content for file: ${path}\nimport React from 'react';\n\nexport const SampleComponent = () => {\n  return <div>Hello Arcange</div>;\n};`;
    },

    writeFile: async (path: string, content: string): Promise<boolean> => {
      if (window.arcange?.files) {
        return await window.arcange.files.writeFile(path, content);
      }
      console.log(`[Web Fallback] Saved file ${path} (${content.length} bytes)`);
      return true;
    }
  },

  browser: {
    navigate: async (url: string) => {
      if (window.arcange?.browser) {
        return await window.arcange.browser.navigate(url);
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            title: `Page Title - ${url}`,
            content: `<!DOCTYPE html><html><body><h1>Automated Browser Content for ${url}</h1><p>Scraped heading, navigation, and interactive elements detected.</p></body></html>`
          });
        }, 800);
      });
    }
  }
};
