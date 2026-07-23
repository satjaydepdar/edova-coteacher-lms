import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function ProgressTracker({ value = 0, max = 100, label, showPercentage = true, color = 'blue', size = 'md' }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' };
  const gradients = {
    blue: 'from-blue-500 via-purple-500 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
    orange: 'from-orange-500 to-pink-500',
    rainbow: 'from-blue-500 via-purple-500 via-pink-500 to-orange-500',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-xs text-gray-400 font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-xs font-bold text-gray-300">{pct}%</span>
          )}
        </div>
      )}
      <div className={clsx('w-full bg-gray-800 rounded-full overflow-hidden', heights[size])}>
        <motion.div
          className={clsx('h-full rounded-full bg-gradient-to-r', gradients[color])}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
