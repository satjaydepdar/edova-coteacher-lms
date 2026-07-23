import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLearning } from '../../context/LearningContext';
import { BADGES } from '../../utils/constants';

export default function BadgeUnlock() {
  const { state, dispatch } = useLearning();
  const [activeBadge, setActiveBadge] = useState(null);

  useEffect(() => {
    if (state._newBadge) {
      setActiveBadge(BADGES[state._newBadge]);
      
      // Auto close after 4s
      setTimeout(() => {
        setActiveBadge(null);
        dispatch({ type: 'CLEAR_NEW_BADGE' });
      }, 4000);
    }
  }, [state._newBadge, dispatch]);

  return (
    <AnimatePresence>
      {activeBadge && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-indigo-500 flex items-center gap-4 w-[320px]">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-3xl border-2 border-indigo-200 shadow-inner">
              {activeBadge.emoji}
            </div>
            <div>
              <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">Badge Unlocked!</p>
              <p className="text-lg font-bold text-slate-800 leading-none mb-1">{activeBadge.name}</p>
              <p className="text-xs text-slate-500 font-medium">{activeBadge.desc}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
