import { AgentDefinition, AgentType } from '../types.js';
import { AGENT_SYSTEM_PROMPTS } from '../planner/prompts.js';

export const AGENT_DEFINITIONS: Record<AgentType, AgentDefinition> = {
  general: {
    id: 'agent_general',
    name: 'General Assistant',
    type: 'general',
    systemPrompt: AGENT_SYSTEM_PROMPTS.general,
    modelRole: 'smart',
    availableTools: [
      'file_read', 'file_write', 'file_list', 'file_exists',
      'execute_command',
      'desktop_click', 'desktop_type', 'desktop_screenshot',
      'browser_navigate', 'browser_click', 'browser_type', 'browser_extract',
      'memory_save', 'memory_search'
    ],
    icon: 'Bot',
    description: 'Versatile AI assistant for everyday tasks, desktop operation, and general problem solving.'
  },

  coding: {
    id: 'agent_coding',
    name: 'Coding Assistant',
    type: 'coding',
    systemPrompt: AGENT_SYSTEM_PROMPTS.coding,
    modelRole: 'coding',
    availableTools: [
      'file_read', 'file_write', 'file_list', 'file_delete', 'file_exists',
      'execute_command'
    ],
    icon: 'Code',
    description: 'Specialized in writing code, debugging, refactoring, and executing terminal development tools.'
  },

  desktop: {
    id: 'agent_desktop',
    name: 'Desktop Agent',
    type: 'desktop',
    systemPrompt: AGENT_SYSTEM_PROMPTS.desktop,
    modelRole: 'fast',
    availableTools: [
      'desktop_click', 'desktop_type', 'desktop_screenshot', 'desktop_exec_python'
    ],
    icon: 'Monitor',
    description: 'Directly interacts with desktop GUI apps, mouse clicks, keyboard entry, and screen capture.'
  },

  browser: {
    id: 'agent_browser',
    name: 'Browser Agent',
    type: 'browser',
    systemPrompt: AGENT_SYSTEM_PROMPTS.browser,
    modelRole: 'smart',
    availableTools: [
      'browser_navigate', 'browser_click', 'browser_type', 'browser_extract', 'browser_screenshot'
    ],
    icon: 'Globe',
    description: 'Automates web browsing, web scraping, form submission, and web application navigation.'
  },

  research: {
    id: 'agent_research',
    name: 'Research Agent',
    type: 'research',
    systemPrompt: AGENT_SYSTEM_PROMPTS.research,
    modelRole: 'smart',
    availableTools: [
      'browser_navigate', 'browser_extract', 'browser_screenshot',
      'file_write', 'memory_save', 'memory_search'
    ],
    icon: 'Search',
    description: 'Gathers multi-source web info, synthesizes notes, generates summaries, and saves research data.'
  },

  file: {
    id: 'agent_file',
    name: 'File Manager Agent',
    type: 'file',
    systemPrompt: AGENT_SYSTEM_PROMPTS.file,
    modelRole: 'fast',
    availableTools: [
      'file_read', 'file_write', 'file_list', 'file_delete', 'file_exists'
    ],
    icon: 'Folder',
    description: 'Handles local file operations, document parsing, bulk file manipulation, and file organization.'
  },

  automation: {
    id: 'agent_automation',
    name: 'Automation Workflow Agent',
    type: 'automation',
    systemPrompt: AGENT_SYSTEM_PROMPTS.automation,
    modelRole: 'fast',
    availableTools: [
      'execute_command', 'file_read', 'file_write',
      'desktop_click', 'browser_navigate'
    ],
    icon: 'Zap',
    description: 'Builds and executes automated multi-step desktop & web workflows.'
  }
};

export function getAgentDefinition(typeOrId: AgentType | string): AgentDefinition {
  if (typeOrId in AGENT_DEFINITIONS) {
    return AGENT_DEFINITIONS[typeOrId as AgentType];
  }

  const found = Object.values(AGENT_DEFINITIONS).find(
    agent => agent.id === typeOrId || agent.type === typeOrId
  );

  return found || AGENT_DEFINITIONS.general;
}

export function getAllAgents(): AgentDefinition[] {
  return Object.values(AGENT_DEFINITIONS);
}
