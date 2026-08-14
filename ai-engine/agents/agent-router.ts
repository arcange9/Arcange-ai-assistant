import { AgentDefinition, AgentType, ToolDefinition } from '../types.js';
import { AGENT_DEFINITIONS, getAgentDefinition } from './agent-definitions.js';

export interface RouteResult {
  agent: AgentDefinition;
  confidence: number;
  reason: string;
  suggestedTools: string[];
}

export class AgentRouter {
  private customToolRegistry: Map<string, ToolDefinition> = new Map();

  constructor(tools: ToolDefinition[] = []) {
    for (const tool of tools) {
      this.customToolRegistry.set(tool.name, tool);
    }
  }

  public registerTool(tool: ToolDefinition): void {
    this.customToolRegistry.set(tool.name, tool);
  }

  public routeRequest(userMessage: string, selectedAgentId?: string | AgentType): RouteResult {
    // 1. Explicit Agent Selection
    if (selectedAgentId && selectedAgentId !== 'auto') {
      const agent = getAgentDefinition(selectedAgentId);
      return {
        agent,
        confidence: 1.0,
        reason: `Explicitly selected agent: '${agent.name}'`,
        suggestedTools: agent.availableTools
      };
    }

    // 2. Keyword & Intent Auto-Detection
    const msgLower = userMessage.toLowerCase();

    // Coding intent
    if (/\b(code|function|python|javascript|typescript|react|html|css|bug|fix|refactor|git|commit|build|npm|terminal)\b/.test(msgLower)) {
      return {
        agent: AGENT_DEFINITIONS.coding,
        confidence: 0.85,
        reason: 'Detected software development / coding intent.',
        suggestedTools: AGENT_DEFINITIONS.coding.availableTools
      };
    }

    // Browser intent
    if (/\b(website|url|http|https|browse|scrape|extract page|login page|fill form|click link)\b/.test(msgLower)) {
      return {
        agent: AGENT_DEFINITIONS.browser,
        confidence: 0.85,
        reason: 'Detected web browsing / web navigation intent.',
        suggestedTools: AGENT_DEFINITIONS.browser.availableTools
      };
    }

    // Research intent
    if (/\b(research|search web|find articles|summarize paper|latest news|gather info)\b/.test(msgLower)) {
      return {
        agent: AGENT_DEFINITIONS.research,
        confidence: 0.80,
        reason: 'Detected research / web investigation intent.',
        suggestedTools: AGENT_DEFINITIONS.research.availableTools
      };
    }

    // File intent
    if (/\b(file|folder|directory|csv|json|pdf|txt|rename|delete file|read file|write file)\b/.test(msgLower)) {
      return {
        agent: AGENT_DEFINITIONS.file,
        confidence: 0.80,
        reason: 'Detected local filesystem / document operation intent.',
        suggestedTools: AGENT_DEFINITIONS.file.availableTools
      };
    }

    // Desktop intent
    if (/\b(desktop|gui|screen|window|mouse|keyboard|click button|type text|take screenshot)\b/.test(msgLower)) {
      return {
        agent: AGENT_DEFINITIONS.desktop,
        confidence: 0.80,
        reason: 'Detected desktop GUI automation intent.',
        suggestedTools: AGENT_DEFINITIONS.desktop.availableTools
      };
    }

    // Automation intent
    if (/\b(automate|workflow|schedule|repeat|cron|pipeline)\b/.test(msgLower)) {
      return {
        agent: AGENT_DEFINITIONS.automation,
        confidence: 0.75,
        reason: 'Detected workflow automation intent.',
        suggestedTools: AGENT_DEFINITIONS.automation.availableTools
      };
    }

    // Default Fallback
    return {
      agent: AGENT_DEFINITIONS.general,
      confidence: 0.60,
      reason: 'General assistant fallback for open-ended conversation.',
      suggestedTools: AGENT_DEFINITIONS.general.availableTools
    };
  }
}
