import { ToolResult, ToolDefinition } from '../types.js';
import { PermissionManager } from './permissions.js';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type ToolHandler = (params: Record<string, any>) => Promise<any>;

export class ToolExecutor {
  private customHandlers: Map<string, ToolHandler> = new Map();
  private permissionManager: PermissionManager;
  private timeoutMs: number;

  constructor(permissionManager?: PermissionManager, timeoutMs: number = 30000) {
    this.permissionManager = permissionManager || new PermissionManager();
    this.timeoutMs = timeoutMs;
  }

  public registerToolHandler(toolName: string, handler: ToolHandler): void {
    this.customHandlers.set(toolName, handler);
  }

  public async executeTool(
    toolName: string,
    params: Record<string, any> = {},
    toolCallId?: string
  ): Promise<ToolResult> {
    const startTime = Date.now();

    // Check permissions
    const permission = this.permissionManager.checkPermission(toolName, params);
    if (permission.requiresConfirmation) {
      return {
        toolCallId,
        toolName,
        success: false,
        error: `Permission required for action '${toolName}': ${permission.reason} (Risk: ${permission.riskLevel})`,
        executionTimeMs: Date.now() - startTime
      };
    }

    try {
      // Execute with timeout wrapper
      const executionPromise = this.dispatchTool(toolName, params);
      const data = await this.withTimeout(executionPromise, this.timeoutMs);

      return {
        toolCallId,
        toolName,
        success: true,
        data,
        executionTimeMs: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        toolCallId,
        toolName,
        success: false,
        error: err.message || String(err),
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  private async dispatchTool(toolName: string, params: Record<string, any>): Promise<any> {
    // 1. Check custom handler
    if (this.customHandlers.has(toolName)) {
      const handler = this.customHandlers.get(toolName)!;
      return await handler(params);
    }

    // 2. Standard Built-in Tool Handlers
    switch (toolName) {
      // File tools
      case 'file_read':
        return await this.handleFileRead(params);
      case 'file_write':
        return await this.handleFileWrite(params);
      case 'file_list':
        return await this.handleFileList(params);
      case 'file_delete':
        return await this.handleFileDelete(params);
      case 'file_exists':
        return await this.handleFileExists(params);

      // System command tool
      case 'execute_command':
        return await this.handleExecuteCommand(params);

      // Desktop agent bridge
      case 'desktop_click':
      case 'desktop_type':
      case 'desktop_screenshot':
      case 'desktop_exec_python':
        return await this.handleDesktopBridge(toolName, params);

      // Browser agent bridge
      case 'browser_navigate':
      case 'browser_click':
      case 'browser_type':
      case 'browser_extract':
      case 'browser_screenshot':
        return await this.handleBrowserBridge(toolName, params);

      default:
        throw new Error(`Unknown tool: '${toolName}'. No registered handler found.`);
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${ms}ms`));
      }, ms);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (err) {
      clearTimeout(timeoutId!);
      throw err;
    }
  }

  // --- File Handlers ---
  private async handleFileRead(params: Record<string, any>): Promise<string> {
    const filePath = params.path || params.filePath;
    if (!filePath) throw new Error('Parameter "path" is required for file_read');
    return await fs.promises.readFile(filePath, 'utf-8');
  }

  private async handleFileWrite(params: Record<string, any>): Promise<{ bytesWritten: number; path: string }> {
    const filePath = params.path || params.filePath;
    const content = params.content ?? '';
    if (!filePath) throw new Error('Parameter "path" is required for file_write');

    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return { bytesWritten: Buffer.byteLength(content, 'utf-8'), path: filePath };
  }

  private async handleFileList(params: Record<string, any>): Promise<string[]> {
    const dirPath = params.path || params.dirPath || '.';
    return await fs.promises.readdir(dirPath);
  }

  private async handleFileDelete(params: Record<string, any>): Promise<{ deleted: boolean; path: string }> {
    const filePath = params.path || params.filePath;
    if (!filePath) throw new Error('Parameter "path" is required for file_delete');
    await fs.promises.unlink(filePath);
    return { deleted: true, path: filePath };
  }

  private async handleFileExists(params: Record<string, any>): Promise<{ exists: boolean; path: string }> {
    const filePath = params.path || params.filePath;
    if (!filePath) throw new Error('Parameter "path" is required for file_exists');
    const exists = fs.existsSync(filePath);
    return { exists, path: filePath };
  }

  // --- Command Handler ---
  private async handleExecuteCommand(params: Record<string, any>): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const command = params.command;
    if (!command) throw new Error('Parameter "command" is required for execute_command');
    const cwd = params.cwd || process.cwd();

    const { stdout, stderr } = await execAsync(command, { cwd, timeout: this.timeoutMs });
    return { stdout, stderr, exitCode: 0 };
  }

  // --- Bridge Handlers ---
  private async handleDesktopBridge(toolName: string, params: Record<string, any>): Promise<any> {
    // If running in IPC/Electron environment, dispatch to desktop bridge IPC
    if ((globalThis as any).electronBridge?.executeDesktopTool) {
      return await (globalThis as any).electronBridge.executeDesktopTool(toolName, params);
    }
    return { status: 'mock_executed', action: toolName, params };
  }

  private async handleBrowserBridge(toolName: string, params: Record<string, any>): Promise<any> {
    // If running in browser/playwright environment bridge
    if ((globalThis as any).electronBridge?.executeBrowserTool) {
      return await (globalThis as any).electronBridge.executeBrowserTool(toolName, params);
    }
    return { status: 'mock_executed', action: toolName, params };
  }
}
