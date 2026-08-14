import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface PermissionDialogProps {
  request: {
    id: string;
    title: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    details?: Record<string, any>;
  } | null;
  onRespond: (granted: boolean) => void;
}

const RISK_CONFIG = {
  low: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Low Risk' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Medium Risk' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'High Risk' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Critical Risk' },
};

export const PermissionDialog: React.FC<PermissionDialogProps> = ({ request, onRespond }) => {
  if (!request) return null;

  const risk = RISK_CONFIG[request.riskLevel] || RISK_CONFIG.medium;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md mx-4"
        >
          <div className={cn('rounded-2xl glass-panel border-2', risk.border, 'bg-[#0d0d14]')}>
            {/* Header */}
            <div className={cn('flex items-center gap-3 p-5 border-b border-white/10', risk.bg)}>
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', risk.bg)}>
                <AlertTriangle className={cn('w-5 h-5', risk.color)} />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-white">Arcange wants permission</h2>
                <span className={cn('text-xs font-medium', risk.color)}>{risk.label}</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Action:</p>
                <p className="text-sm text-white font-medium">{request.title}</p>
              </div>

              <p className="text-sm text-gray-300">{request.description}</p>

              {/* Details */}
              {request.details && Object.keys(request.details).length > 0 && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-400 mb-2">Details:</p>
                  <div className="space-y-1">
                    {Object.entries(request.details).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{key}:</span>
                        <span className="text-white font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Shield className="w-3.5 h-3.5 text-gray-500" />
                Arcange will never perform this action without your explicit permission.
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 p-5 border-t border-white/10">
              <button
                onClick={() => onRespond(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm font-medium hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => onRespond(true)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition',
                  request.riskLevel === 'critical' || request.riskLevel === 'high'
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:shadow-lg'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg'
                )}
              >
                <Check className="w-4 h-4" />
                Allow
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
