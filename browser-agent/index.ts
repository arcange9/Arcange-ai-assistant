import type { Browser, BrowserContext, Page, LaunchOptions } from 'playwright';

export interface BrowserAgentOptions {
  headless?: boolean;
  defaultTimeout?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  downloadsPath?: string;
}

export interface ExtractLinksResult {
  text: string;
  href: string;
}

export interface ExtractImagesResult {
  alt: string;
  src: string;
}

export interface StructuredPageData {
  title: string;
  url: string;
  text: string;
  links: ExtractLinksResult[];
  images: ExtractImagesResult[];
  tables: string[][][];
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  url: string;
  error?: string;
}

export class BrowserAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private activePage: Page | null = null;
  private options: Required<BrowserAgentOptions>;

  constructor(options: BrowserAgentOptions = {}) {
    this.options = {
      headless: options.headless ?? true,
      defaultTimeout: options.defaultTimeout ?? 30000,
      viewport: options.viewport ?? { width: 1280, height: 800 },
      userAgent:
        options.userAgent ??
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      downloadsPath: options.downloadsPath ?? './downloads',
    };
  }

  /**
   * Ensure browser instance and context are initialized
   */
  private async ensureInitialized(): Promise<{ context: BrowserContext; page: Page }> {
    if (!this.browser || !this.browser.isConnected()) {
      let playwright: any;
      try {
        playwright = await import('playwright');
      } catch (err) {
        try {
          playwright = await import('playwright-core');
        } catch {
          throw new Error('Playwright is not installed. Please install "playwright" or "playwright-core".');
        }
      }

      const launchOptions: LaunchOptions = {
        headless: this.options.headless,
      };

      this.browser = await playwright.chromium.launch(launchOptions);
    }

    if (!this.context) {
      this.context = await this.browser.newContext({
        viewport: this.options.viewport,
        userAgent: this.options.userAgent,
        acceptDownloads: true,
      });
      this.context.setDefaultTimeout(this.options.defaultTimeout);
    }

    if (!this.activePage || this.activePage.isClosed()) {
      const pages = this.context.pages();
      if (pages.length > 0 && !pages[0].isClosed()) {
        this.activePage = pages[0];
      } else {
        this.activePage = await this.context.newPage();
      }
      this.activePage.setDefaultTimeout(this.options.defaultTimeout);
    }

    return { context: this.context, page: this.activePage };
  }

  /**
   * Launch browser and open an optional URL
   */
  public async open(url?: string): Promise<{ success: boolean; url: string; title: string }> {
    const { page } = await this.ensureInitialized();
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.options.defaultTimeout });
    }
    const currentUrl = page.url();
    const title = await page.title();
    return { success: true, url: currentUrl, title };
  }

  /**
   * Navigate active page to specified URL
   */
  public async navigate(url: string): Promise<{ success: boolean; url: string; title: string }> {
    const { page } = await this.ensureInitialized();
    const targetUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: this.options.defaultTimeout });
    return {
      success: true,
      url: page.url(),
      title: await page.title(),
    };
  }

  /**
   * Search query on Google, Bing, or DuckDuckGo
   */
  public async search(
    query: string,
    engine: 'google' | 'bing' | 'duckduckgo' = 'google'
  ): Promise<{ success: boolean; url: string; title: string }> {
    const encoded = encodeURIComponent(query);
    let searchUrl = '';

    switch (engine) {
      case 'bing':
        searchUrl = `https://www.bing.com/search?q=${encoded}`;
        break;
      case 'duckduckgo':
        searchUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
        break;
      case 'google':
      default:
        searchUrl = `https://www.google.com/search?q=${encoded}`;
        break;
    }

    return this.navigate(searchUrl);
  }

  /**
   * Click element specified by selector with retry and error recovery
   */
  public async click(selector: string, maxRetries = 3): Promise<{ success: boolean; selector: string }> {
    const { page } = await this.ensureInitialized();
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        const element = page.locator(selector).first();
        await element.scrollIntoViewIfNeeded({ timeout: 3000 });
        await element.click({ timeout: 5000 });
        return { success: true, selector };
      } catch (err) {
        lastError = err;
        try {
          // Fallback force click or JavaScript click
          await page.evaluate((sel) => {
            const el = document.querySelector(sel) as HTMLElement;
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.click();
            }
          }, selector);
          return { success: true, selector };
        } catch (jsErr) {
          lastError = jsErr;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw new Error(`Failed to click element "${selector}" after ${maxRetries} attempts: ${lastError?.message || lastError}`);
  }

  /**
   * Type text into input element specified by selector
   */
  public async type(selector: string, text: string): Promise<{ success: boolean; selector: string; text: string }> {
    const { page } = await this.ensureInitialized();
    await page.waitForSelector(selector, { state: 'visible', timeout: this.options.defaultTimeout });
    const element = page.locator(selector).first();
    await element.scrollIntoViewIfNeeded();
    await element.clear();
    await element.fill(text);
    return { success: true, selector, text };
  }

  /**
   * Scroll active page in specified direction
   */
  public async scroll(
    direction: 'up' | 'down' | 'top' | 'bottom',
    amount = 500
  ): Promise<{ success: boolean; direction: string; scrollPosition: number }> {
    const { page } = await this.ensureInitialized();

    const scrollPos = await page.evaluate(
      ({ dir, amt }) => {
        if (dir === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (dir === 'bottom') {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        } else if (dir === 'up') {
          window.scrollBy({ top: -amt, behavior: 'smooth' });
        } else if (dir === 'down') {
          window.scrollBy({ top: amt, behavior: 'smooth' });
        }
        return window.scrollY;
      },
      { dir: direction, amt: amount }
    );

    return { success: true, direction, scrollPosition: scrollPos };
  }

  /**
   * Capture page screenshot and return base64
   */
  public async screenshot(fullPage = false): Promise<{ base64: string; mimeType: string }> {
    const { page } = await this.ensureInitialized();
    const buffer = await page.screenshot({ fullPage, type: 'png' });
    const base64 = buffer.toString('base64');
    return {
      base64: `data:image/png;base64,${base64}`,
      mimeType: 'image/png',
    };
  }

  /**
   * Extract structured data from active page or selector
   */
  public async extract(selector_or_instruction?: string): Promise<StructuredPageData> {
    const { page } = await this.ensureInitialized();

    const data = await page.evaluate((sel) => {
      let rootNode: Element = document.body;
      if (sel) {
        const found = document.querySelector(sel);
        if (found) rootNode = found;
      }

      // Title & URL
      const title = document.title;
      const url = window.location.href;

      // Visible text
      const text = (rootNode as HTMLElement).innerText || rootNode.textContent || '';

      // Extract links
      const linkElements = Array.from(rootNode.querySelectorAll('a[href]'));
      const links = linkElements
        .map((a) => ({
          text: (a.textContent || '').trim(),
          href: (a as HTMLAnchorElement).href,
        }))
        .filter((l) => l.href.startsWith('http'));

      // Extract images
      const imgElements = Array.from(rootNode.querySelectorAll('img[src]'));
      const images = imgElements.map((img) => ({
        alt: (img as HTMLImageElement).alt || '',
        src: (img as HTMLImageElement).src,
      }));

      // Extract tables
      const tableElements = Array.from(rootNode.querySelectorAll('table'));
      const tables = tableElements.map((table) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        return rows.map((row) => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          return cells.map((cell) => (cell.textContent || '').trim());
        });
      });

      return { title, url, text: text.trim(), links, images, tables };
    }, selector_or_instruction);

    return data;
  }

  /**
   * Download file from URL
   */
  public async download(url: string, destinationPath?: string): Promise<DownloadResult> {
    const { page } = await this.ensureInitialized();
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: this.options.defaultTimeout }),
        page.evaluate((downloadUrl) => {
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = '';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, url),
      ]);

      const suggestedFilename = download.suggestedFilename();
      const targetDir = destinationPath || this.options.downloadsPath;
      await fs.mkdir(targetDir, { recursive: true });
      const targetFilePath = path.join(targetDir, suggestedFilename);

      await download.saveAs(targetFilePath);
      const stats = await fs.stat(targetFilePath);

      return {
        success: true,
        filePath: targetFilePath,
        fileName: suggestedFilename,
        fileSize: stats.size,
        url,
      };
    } catch (err: any) {
      return {
        success: false,
        url,
        error: err.message || String(err),
      };
    }
  }

  /**
   * Get all active pages
   */
  public getPages(): Page[] {
    return this.context ? this.context.pages() : [];
  }

  /**
   * Switch active page by index
   */
  public async switchPage(index: number): Promise<Page> {
    const pages = this.getPages();
    if (index < 0 || index >= pages.length) {
      throw new Error(`Page index ${index} out of bounds (total pages: ${pages.length})`);
    }
    this.activePage = pages[index];
    await this.activePage.bringToFront();
    return this.activePage;
  }

  /**
   * Create a new tab page
   */
  public async newPage(url?: string): Promise<Page> {
    const { context } = await this.ensureInitialized();
    const page = await context.newPage();
    this.activePage = page;
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    }
    return page;
  }

  /**
   * Close browser and browser context
   */
  public async close(): Promise<void> {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
    this.activePage = null;
  }
}

export default BrowserAgent;
