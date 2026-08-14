import { AIProvider, TaskPlan, TaskStep, ToolDefinition, ToolResult } from '../types.js';
import { TaskPlanner } from '../planner/planner.js';
import { ToolExecutor } from './tool-executor.js';
import { PermissionManager, PermissionRequest } from './permissions.js';

export interface AgentLoopCallbacks {
  onPlanCreated?: (plan: TaskPlan) => void;
  onStepStart?: (step: TaskStep) => void;
  onStepComplete?: (step: TaskStep, result: ToolResult) => void;
  onStepFailed?: (step: TaskStep, error: string) => void;
  onProgress?: (progress: { completedSteps: number; totalSteps: number; currentStep?: TaskStep }) => void;
  onConfirmRequired?: (permissionRequest: PermissionRequest) => Promise<boolean>;
  onComplete?: (finalResponse: string, plan: TaskPlan) => void;
  onError?: (error: Error, plan?: TaskPlan) => void;
}

export interface AgentLoopOptions {
  maxIterations?: number;
  availableTools?: ToolDefinition[];
  context?: string;
  callbacks?: AgentLoopCallbacks;
}

export class AgentLoop {
  private provider: AIProvider;
  private planner: TaskPlanner;
  private executor: ToolExecutor;
  private permissionManager: PermissionManager;
  private isStopped: boolean = false;

  constructor(
    provider: AIProvider,
    executor?: ToolExecutor,
    permissionManager?: PermissionManager
  ) {
    this.provider = provider;
    this.planner = new TaskPlanner(provider);
    this.permissionManager = permissionManager || new PermissionManager();
    this.executor = executor || new ToolExecutor(this.permissionManager);
  }

  public stop(): void {
    this.isStopped = true;
  }

  public async run(
    taskRequest: string,
    options: AgentLoopOptions = {}
  ): Promise<{ response: string; plan: TaskPlan }> {
    this.isStopped = false;
    const maxIterations = options.maxIterations ?? 20;
    const tools = options.availableTools || [];
    const callbacks = options.callbacks || {};

    // 1. Understand & Plan
    let plan: TaskPlan;
    try {
      plan = await this.planner.createPlan(taskRequest, tools, options.context);
      plan.status = 'in_progress';
      if (callbacks.onPlanCreated) {
        callbacks.onPlanCreated(plan);
      }
    } catch (err: any) {
      const error = new Error(`Planning failed: ${err.message}`);
      if (callbacks.onError) callbacks.onError(error);
      throw error;
    }

    let iterations = 0;
    let completedStepsCount = 0;

    // 2. Loop Execution
    while (iterations < maxIterations && !this.isStopped) {
      iterations++;

      // Find next pending step whose dependencies are satisfied
      const nextStepIndex = plan.steps.findIndex(step => {
        if (step.status !== 'pending') return false;
        if (!step.dependsOn || step.dependsOn.length === 0) return true;
        return step.dependsOn.every(depId => {
          const dep = plan.steps.find(s => s.id === depId);
          return dep && dep.status === 'completed';
        });
      });

      if (nextStepIndex === -1) {
        // No pending executable step left
        break;
      }

      const currentStep = plan.steps[nextStepIndex];
      currentStep.status = 'in_progress';
      plan.updatedTime = Date.now();

      if (callbacks.onStepStart) callbacks.onStepStart(currentStep);
      if (callbacks.onProgress) {
        callbacks.onProgress({
          completedSteps: completedStepsCount,
          totalSteps: plan.steps.length,
          currentStep
        });
      }

      // Check permissions if tool specified
      if (currentStep.tool) {
        const perm = this.permissionManager.checkPermission(currentStep.tool, currentStep.params);
        if (perm.requiresConfirmation && callbacks.onConfirmRequired) {
          const confirmed = await callbacks.onConfirmRequired(perm);
          if (!confirmed) {
            currentStep.status = 'failed';
            currentStep.error = 'User denied permission for action';
            if (callbacks.onStepFailed) callbacks.onStepFailed(currentStep, currentStep.error);

            // Replan after user rejection
            plan = await this.planner.replan(
              plan,
              currentStep.id,
              'User rejected permission execution',
              tools
            );
            continue;
          }
        }
      }

      // 3. Execute Step
      let toolResult: ToolResult;
      if (currentStep.tool) {
        toolResult = await this.executor.executeTool(
          currentStep.tool,
          currentStep.params || {},
          currentStep.id
        );
      } else {
        // Pure reasoning/AI step
        const reasoningResponse = await this.provider.chat({
          messages: [
            { role: 'user', content: `Task Goal: ${plan.userGoal}\nStep: ${currentStep.description}` }
          ]
        });
        toolResult = {
          toolCallId: currentStep.id,
          toolName: 'reasoning',
          success: true,
          data: reasoningResponse.content
        };
      }

      currentStep.result = toolResult;

      // 4. Observe & Handle Step Outcome
      if (toolResult.success) {
        currentStep.status = 'completed';
        completedStepsCount++;
        if (callbacks.onStepComplete) callbacks.onStepComplete(currentStep, toolResult);
      } else {
        currentStep.status = 'failed';
        currentStep.error = toolResult.error || 'Execution failed';
        if (callbacks.onStepFailed) callbacks.onStepFailed(currentStep, currentStep.error);

        // 5. Replan on step failure
        try {
          plan = await this.planner.replan(
            plan,
            currentStep.id,
            toolResult.error || 'Execution failed',
            tools
          );
        } catch (replanError: any) {
          console.warn('[AgentLoop] Replanning failed:', replanError.message);
        }
      }

      if (callbacks.onProgress) {
        callbacks.onProgress({
          completedSteps: completedStepsCount,
          totalSteps: plan.steps.length
        });
      }
    }

    if (this.isStopped) {
      plan.status = 'cancelled';
      const cancelError = new Error('Task execution was cancelled by stop signal.');
      if (callbacks.onError) callbacks.onError(cancelError, plan);
      throw cancelError;
    }

    const allCompleted = plan.steps.every(s => s.status === 'completed' || s.status === 'skipped');
    plan.status = allCompleted ? 'completed' : 'failed';
    plan.updatedTime = Date.now();

    // 6. Generate final response summarizing accomplishments
    const finalPrompt = [
      `User Goal: "${taskRequest}"`,
      `Executed Steps Result: ${JSON.stringify(
        plan.steps.map(s => ({
          description: s.description,
          status: s.status,
          result: s.result?.data || s.result?.error
        })),
        null,
        2
      )}`,
      'Provide a clear, concise, user-friendly final summary of the outcome.'
    ].join('\n\n');

    let finalResponseText = '';
    try {
      const summaryResp = await this.provider.chat({
        messages: [{ role: 'user', content: finalPrompt }]
      });
      finalResponseText = summaryResp.content;
    } catch (e: any) {
      finalResponseText = `Task finished with status: ${plan.status}.`;
    }

    if (callbacks.onComplete) {
      callbacks.onComplete(finalResponseText, plan);
    }

    return { response: finalResponseText, plan };
  }
}
