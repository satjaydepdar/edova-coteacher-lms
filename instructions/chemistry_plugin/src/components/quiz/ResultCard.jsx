import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Home, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import StarRating from '../shared/StarRating';

export default function ResultCard({ score, total, xpEarned, onRetry }) {
  const pct = (score / total) * 100;
  let stars = 0;
  if (pct >= 50) stars = 1;
  if (pct >= 80) stars = 2;
  if (pct === 100) stars = 3;

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card bg-white p-8 sm:p-12 max-w-lg mx-auto text-center"
    >
      <div className="w-24 h-24 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-6 border-4 border-rose-200">
        <Trophy size={48} />
      </div>

      <h2 className="text-3xl font-black text-slate-800 mb-2">Challenge Complete!</h2>
      <p className="text-slate-500 font-medium mb-8">You finished the math arena.</p>

      <div className="flex justify-center mb-6">
        <StarRating stars={stars} max={3} className="scale-150 transform" />
      </div>

      <div className="flex justify-center gap-6 mb-8">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-[120px]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Score</p>
          <p className="text-3xl font-black text-slate-800">{score}<span className="text-lg text-slate-400">/{total}</span></p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 min-w-[120px]">
          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">XP Earned</p>
          <p className="text-3xl font-black text-amber-600">+{xpEarned}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={onRetry} className="btn btn-challenge flex-1 py-3 text-lg">
          <RefreshCw size={18} /> Play Again
        </button>
        <Link to="/" className="btn btn-secondary flex-1 py-3 text-lg">
          <Home size={18} /> Home
        </Link>
      </div>
    </motion.div>
  );
}
