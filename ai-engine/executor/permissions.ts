export interface PermissionRequest {
  action: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
  params?: Record<string, any>;
  requiresConfirmation: boolean;
}

export const DANGEROUS_ACTIONS: Record<string, { riskLevel: 'low' | 'medium' | 'high'; reason: string }> = {
  delete_file: {
    riskLevel: 'high',
    reason: 'Deleting files from disk is permanent and irreversible.'
  },
  delete_directory: {
    riskLevel: 'high',
    reason: 'Recursively deleting directories will lose all contained files.'
  },
  execute_command: {
    riskLevel: 'high',
    reason: 'Executing arbitrary shell/terminal commands can modify system settings or execute unverified binaries.'
  },
  install_software: {
    riskLevel: 'high',
    reason: 'Installing software package or dependencies modifies system state.'
  },
  system_settings: {
    riskLevel: 'medium',
    reason: 'Modifying system preferences or environment variables.'
  },
  move_files: {
    riskLevel: 'medium',
    reason: 'Bulk moving or replacing files can alter filesystem structure.'
  },
  desktop_click: {
    riskLevel: 'low',
    reason: 'Simulating desktop mouse click.'
  },
  desktop_type: {
    riskLevel: 'medium',
    reason: 'Simulating desktop keyboard typing.'
  },
  desktop_exec_python: {
    riskLevel: 'high',
    reason: 'Running arbitrary Python automation script on local machine.'
  }
};

export class PermissionManager {
  private allowedActions: Set<string> = new Set();
  private isAutoConfirmEnabled: boolean = false;

  constructor(autoConfirm: boolean = false) {
    this.isAutoConfirmEnabled = autoConfirm;
  }

  public setAutoConfirm(enabled: boolean): void {
    this.isAutoConfirmEnabled = enabled;
  }

  public allowAction(action: string): void {
    this.allowedActions.add(action);
  }

  public revokeAction(action: string): void {
    this.allowedActions.delete(action);
  }

  public checkPermission(action: string, params?: Record<string, any>): PermissionRequest {
    const config = DANGEROUS_ACTIONS[action];

    if (!config) {
      return {
        action,
        riskLevel: 'low',
        reason: 'Action is safe and unmonitored.',
        params,
        requiresConfirmation: false
      };
    }

    if (this.isAutoConfirmEnabled || this.allowedActions.has(action)) {
      return {
        action,
        riskLevel: config.riskLevel,
        reason: config.reason,
        params,
        requiresConfirmation: false
      };
    }

    // High and medium risk actions require explicit confirmation unless previously authorized
    const requiresConfirmation = config.riskLevel === 'high' || config.riskLevel === 'medium';

    return {
      action,
      riskLevel: config.riskLevel,
      reason: config.reason,
      params,
      requiresConfirmation
    };
  }
}
