/**
 * Arcange AI Assistant — Desktop Agent Bridge
 * Manages the Python Desktop Agent process and JSON-RPC communication.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class DesktopAgentBridge {
  constructor(agentPath) {
    this.agentPath = agentPath;
    this.process = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.restarts = 0;
    this.maxRestarts = 3;
    this.buffer = '';
  }

  start() {
    if (this.process) {
      console.warn('[DesktopAgent] Already running');
      return;
    }

    // Check if Python is available
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    try {
      this.process = spawn(pythonCmd, [this.agentPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(this.agentPath),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      });

      // Handle stdout (JSON-RPC responses)
      this.process.stdout.on('data', (data) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      // Log stderr
      this.process.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[DesktopAgent] ${msg}`);
      });

      // Handle process exit
      this.process.on('close', (code) => {
        console.log(`[DesktopAgent] Process exited with code ${code}`);
        this.process = null;

        // Reject all pending requests
        for (const [id, { reject }] of this.pendingRequests) {
          reject(new Error('Desktop agent closed'));
        }
        this.pendingRequests.clear();

        // Auto-restart if crashed and we haven't exceeded max restarts
        if (code !== 0 && this.restarts < this.maxRestarts) {
          this.restarts++;
          console.log(`[DesktopAgent] Auto-restarting (${this.restarts}/${this.maxRestarts})...`);
          setTimeout(() => this.start(), 1000);
        }
      });

      // Handle errors
      this.process.on('error', (err) => {
        console.error('[DesktopAgent] Process error:', err);
        this.process = null;
      });

      console.log('[DesktopAgent] Started successfully');
    } catch (err) {
      console.error('[DesktopAgent] Failed to start:', err);
    }
  }

  stop() {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    // Clear pending requests
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new Error('Desktop agent stopped'));
    }
    this.pendingRequests.clear();
  }

  isRunning() {
    return this.process !== null && !this.process.killed;
  }

  processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // Keep incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        this.handleMessage(msg);
      } catch (err) {
        console.error('[DesktopAgent] Failed to parse:', line, err);
      }
    }
  }

  handleMessage(msg) {
    if (msg.id !== undefined && this.pendingRequests.has(msg.id)) {
      const { resolve, reject } = this.pendingRequests.get(msg.id);
      this.pendingRequests.delete(msg.id);

      if (msg.error) {
        reject(new Error(msg.error.message || 'Unknown error'));
      } else {
        resolve(msg.result);
      }
    } else if (msg.method) {
      // Notification or event from the agent (e.g., permission request)
      console.log('[DesktopAgent] Event:', msg.method, msg.params);
    }
  }

  sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isRunning()) {
        reject(new Error('Desktop agent is not running'));
        return;
      }

      const id = ++this.requestId;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      // Timeout
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timed out'));
        }
      }, params.timeout || 30000);

      this.process.stdin.write(JSON.stringify(request) + '\n');

      // Clear timeout on resolution
      const originalResolve = resolve;
      const originalReject = reject;
      this.pendingRequests.set(id, {
        resolve: (val) => { clearTimeout(timeout); originalResolve(val); },
        reject: (err) => { clearTimeout(timeout); originalReject(err); },
      });
    });
  }
}

module.exports = { DesktopAgentBridge };
