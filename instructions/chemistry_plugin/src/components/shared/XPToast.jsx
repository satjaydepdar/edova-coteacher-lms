import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLearning } from '../../context/LearningContext';

export default function XPToast() {
  const { state } = useLearning();
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (state._lastXP && state._lastXP.amount > 0) {
      const id = Date.now();
      setToasts(prev => [...prev, { id, amount: state._lastXP.amount }]);
      
      // Auto remove after 2.5s
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 2500);
    }
  }, [state._lastXP]);

  return (
    <div className="fixed bottom-24 right-8 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="bg-white px-5 py-3 rounded-full shadow-lg border-2 border-amber-400 flex items-center gap-2"
          >
            <span className="text-xl">⭐</span>
            <span className="font-black text-amber-500 text-lg">+{toast.amount} XP</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
