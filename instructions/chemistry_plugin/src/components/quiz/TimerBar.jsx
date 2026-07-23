import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function TimerBar({ duration, onTimeUp, isRunning }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onTimeUp]);

  const pct = (timeLeft / duration) * 100;
  
  let colorClass = 'timer-high';
  if (pct < 50) colorClass = 'timer-medium';
  if (pct < 20) colorClass = 'timer-low';

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 px-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time</span>
        <span className={`text-xs font-black ${pct < 20 ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>{timeLeft}s</span>
      </div>
      <div className="timer-track w-full">
        <motion.div 
          className={`timer-fill ${colorClass}`}
          initial={{ width: '100%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
