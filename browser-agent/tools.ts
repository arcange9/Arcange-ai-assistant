import { BrowserAgent } from './index';

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const browserTools: AgentToolDefinition[] = [
  {
    name: 'browser_open',
    description: 'Launch the Playwright browser agent and optionally navigate to an initial URL.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Optional initial URL to navigate to upon opening.',
        },
        headless: {
          type: 'boolean',
          description: 'Whether to run browser in headless mode (default true).',
        },
      },
    },
  },
  {
    name: 'browser_navigate',
    description: 'Navigate the browser to a specific Web URL.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target URL to navigate to (e.g. https://example.com).',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'browser_search',
    description: 'Perform a web search using a search engine (Google, Bing, or DuckDuckGo).',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string.',
        },
        engine: {
          type: 'string',
          enum: ['google', 'bing', 'duckduckgo'],
          description: 'Search engine to use (default: google).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'browser_click',
    description: 'Click an interactive element on the current web page matching a CSS selector.',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS or text selector targeting the element to click.',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'browser_type',
    description: 'Type text into an input field or textarea matching a CSS selector.',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector targeting the input element.',
        },
        text: {
          type: 'string',
          description: 'Text string to type into the targeted field.',
        },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'browser_scroll',
    description: 'Scroll the active browser page in a specified direction.',
    parameters: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['up', 'down', 'top', 'bottom'],
          description: 'Direction to scroll.',
        },
        amount: {
          type: 'number',
          description: 'Scroll offset in pixels for up/down directions (default: 500).',
        },
      },
      required: ['direction'],
    },
  },
  {
    name: 'browser_screenshot',
    description: 'Capture a screenshot of the active browser page as a base64 encoded image string.',
    parameters: {
      type: 'object',
      properties: {
        fullPage: {
          type: 'boolean',
          description: 'Whether to capture the entire scrollable page (default false).',
        },
      },
    },
  },
  {
    name: 'browser_extract',
    description: 'Extract structured text, links, images, and tables from the page or specific selector.',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector to target specific section for extraction.',
        },
        instruction: {
          type: 'string',
          description: 'Optional instruction guide for extraction emphasis.',
        },
      },
    },
  },
  {
    name: 'browser_download',
    description: 'Download a file from a URL to the local filesystem.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Direct download URL of the file.',
        },
        destination: {
          type: 'string',
          description: 'Optional local directory path to store the downloaded file.',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'browser_close',
    description: 'Close the browser agent session and release browser resources.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

export class BrowserToolExecutor {
  private agent: BrowserAgent;

  constructor(agent?: BrowserAgent) {
    this.agent = agent || new BrowserAgent();
  }

  public getAgent(): BrowserAgent {
    return this.agent;
  }

  public async execute(toolName: string, args: Record<string, any> = {}): Promise<any> {
    switch (toolName) {
      case 'browser_open':
        if (args.headless !== undefined) {
          this.agent = new BrowserAgent({ headless: args.headless });
        }
        return await this.agent.open(args.url);

      case 'browser_navigate':
        return await this.agent.navigate(args.url);

      case 'browser_search':
        return await this.agent.search(args.query, args.engine);

      case 'browser_click':
        return await this.agent.click(args.selector);

      case 'browser_type':
        return await this.agent.type(args.selector, args.text);

      case 'browser_scroll':
        return await this.agent.scroll(args.direction, args.amount);

      case 'browser_screenshot':
        return await this.agent.screenshot(args.fullPage);

      case 'browser_extract':
        return await this.agent.extract(args.selector || args.instruction);

      case 'browser_download':
        return await this.agent.download(args.url, args.destination);

      case 'browser_close':
        await this.agent.close();
        return { success: true, message: 'Browser agent closed' };

      default:
        throw new Error(`Unknown browser tool: ${toolName}`);
    }
  }
}

export async function executeBrowserTool(
  agent: BrowserAgent,
  toolName: string,
  args: Record<string, any> = {}
): Promise<any> {
  const executor = new BrowserToolExecutor(agent);
  return await executor.execute(toolName, args);
}
