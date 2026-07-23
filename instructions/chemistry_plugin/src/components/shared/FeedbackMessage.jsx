import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { scaleIn } from '../../utils/animations';
import clsx from 'clsx';

const VARIANTS = {
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    sub: 'text-emerald-600',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    sub: 'text-red-600',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    sub: 'text-amber-600',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    sub: 'text-blue-600',
    iconColor: 'text-blue-500',
  },
};

export default function FeedbackMessage({ type = 'info', message, subtitle, show = true }) {
  if (!message) return null;
  const config = VARIANTS[type] || VARIANTS.info;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={clsx(
            'flex items-start gap-3 px-4 py-3 rounded-2xl border-2',
            config.bg,
            config.border,
          )}
        >
          <Icon size={18} className={clsx('flex-shrink-0 mt-0.5', config.iconColor)} />
          <div>
            <p className={clsx('text-sm font-semibold', config.text)}>{message}</p>
            {subtitle && <p className={clsx('text-xs mt-0.5', config.sub)}>{subtitle}</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
