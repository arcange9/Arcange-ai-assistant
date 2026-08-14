import { AIProvider, TaskPlan, TaskStep, ToolDefinition } from '../types.js';
import { PLANNER_SYSTEM_PROMPT, REPLANNING_SYSTEM_PROMPT, formatToolsPrompt } from './prompts.js';

export class TaskPlanner {
  private provider: AIProvider;
  private defaultModel?: string;

  constructor(provider: AIProvider, defaultModel?: string) {
    this.provider = provider;
    this.defaultModel = defaultModel;
  }

  public async createPlan(
    userRequest: string,
    availableTools: ToolDefinition[] = [],
    context?: string
  ): Promise<TaskPlan> {
    const toolsText = formatToolsPrompt(availableTools);
    const userPrompt = [
      `User Goal: "${userRequest}"`,
      context ? `Context: ${context}` : '',
      toolsText,
      'Create a step-by-step execution plan in JSON format.'
    ].filter(Boolean).join('\n\n');

    const response = await this.provider.chat({
      model: this.defaultModel,
      systemInstruction: PLANNER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.2
    });

    return this.parsePlanResponse(response.content, userRequest);
  }

  public async replan(
    currentPlan: TaskPlan,
    failedStepId: string,
    observation: string,
    availableTools: ToolDefinition[] = []
  ): Promise<TaskPlan> {
    const toolsText = formatToolsPrompt(availableTools);
    const userPrompt = [
      `Original Goal: "${currentPlan.userGoal}"`,
      `Current Plan State: ${JSON.stringify(currentPlan, null, 2)}`,
      `Failed Step ID: ${failedStepId}`,
      `Observation / Error: ${observation}`,
      toolsText,
      'Generate an updated plan starting from the remaining/revised steps in JSON format.'
    ].join('\n\n');

    const response = await this.provider.chat({
      model: this.defaultModel,
      systemInstruction: REPLANNING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.2
    });

    const updatedPlan = this.parsePlanResponse(response.content, currentPlan.userGoal);
    updatedPlan.id = currentPlan.id;
    return updatedPlan;
  }

  private parsePlanResponse(rawContent: string, userGoal: string): TaskPlan {
    let cleanJson = rawContent.trim();

    // Strip markdown code fences if present
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(cleanJson);
      const now = Date.now();

      const steps: TaskStep[] = Array.isArray(parsed.steps) ? parsed.steps.map((s: any, idx: number) => ({
        id: s.id || `step_${idx + 1}`,
        description: s.description || `Step ${idx + 1}`,
        tool: s.tool || undefined,
        params: s.params || {},
        dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn : [],
        status: s.status || 'pending'
      })) : [];

      if (steps.length === 0) {
        steps.push({
          id: 'step_1',
          description: `Direct response to: ${userGoal}`,
          status: 'pending'
        });
      }

      return {
        id: `plan_${Date.now()}`,
        userGoal: parsed.userGoal || userGoal,
        steps,
        status: 'created',
        createdTime: now,
        updatedTime: now
      };
    } catch (e: any) {
      console.warn('[TaskPlanner] Failed to parse plan JSON, fallback single step plan:', e.message);
      const now = Date.now();
      return {
        id: `plan_fallback_${now}`,
        userGoal,
        steps: [
          {
            id: 'step_1',
            description: `Execute request: ${userGoal}`,
            status: 'pending'
          }
        ],
        status: 'created',
        createdTime: now,
        updatedTime: now
      };
    }
  }
}
