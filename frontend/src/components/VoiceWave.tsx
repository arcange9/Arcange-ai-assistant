import React from 'react';
import { motion } from 'framer-motion';

/**
 * VoiceWave - Animated audio waveform visualization for voice mode.
 * Displays animated bars that simulate voice input/output levels.
 */
interface VoiceWaveProps {
  isActive: boolean;
  variant?: 'input' | 'output';
  height?: number;
}

export const VoiceWave: React.FC<VoiceWaveProps> = ({
  isActive,
  variant = 'input',
  height = 40,
}) => {
  const barCount = 24;
  const colors = variant === 'input'
    ? ['from-blue-400 to-cyan-400']
    : ['from-purple-400 to-pink-400'];

  return (
    <div className="flex items-center justify-center gap-1" style={{ height }}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className={cn('w-1 rounded-full bg-gradient-to-t', colors[0])}
          animate={
            isActive
              ? {
                  height: [
                    `${20 + Math.random() * 20}%`,
                    `${50 + Math.random() * 50}%`,
                    `${20 + Math.random() * 30}%`,
                  ],
                  opacity: [0.6, 1, 0.6],
                }
              : { height: '15%', opacity: 0.3 }
          }
          transition={{
            duration: 0.4 + (i % 3) * 0.1,
            repeat: isActive ? Infinity : 0,
            delay: i * 0.02,
            ease: 'easeInOut',
          }}
          style={{ height: isActive ? undefined : '15%' }}
        />
      ))}
    </div>
  );
};

// Inline cn to avoid import issues
function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
