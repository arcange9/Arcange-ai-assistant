import * as fs from 'fs';
import * as path from 'path';

export class PersistManager {
  /**
   * Save data asynchronously to a JSON file using an atomic write (write to temp file then rename).
   */
  public static async saveToFile<T>(filePath: string, data: T): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });

      const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const serialized = JSON.stringify(data, null, 2);

      await fs.promises.writeFile(tempPath, serialized, 'utf-8');
      await fs.promises.rename(tempPath, filePath);
    } catch (error: any) {
      console.error(`[PersistManager] Error saving to file (${filePath}):`, error.message);
      throw error;
    }
  }

  /**
   * Load data asynchronously from a JSON file, with fallback to default value if missing/corrupted.
   */
  public static async loadFromFile<T>(filePath: string, defaultValue: T): Promise<T> {
    try {
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error: any) {
      console.warn(`[PersistManager] Error loading file (${filePath}), returning default value:`, error.message);
      return defaultValue;
    }
  }

  /**
   * Synchronous save using atomic write.
   */
  public static saveToFileSync<T>(filePath: string, data: T): void {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tempPath = `${filePath}.tmp.${Date.now()}`;
      const serialized = JSON.stringify(data, null, 2);

      fs.writeFileSync(tempPath, serialized, 'utf-8');
      fs.renameSync(tempPath, filePath);
    } catch (error: any) {
      console.error(`[PersistManager] Error saving sync (${filePath}):`, error.message);
      throw error;
    }
  }

  /**
   * Synchronous load with fallback.
   */
  public static loadFromFileSync<T>(filePath: string, defaultValue: T): T {
    try {
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error: any) {
      console.warn(`[PersistManager] Error loading sync (${filePath}):`, error.message);
      return defaultValue;
    }
  }
}
