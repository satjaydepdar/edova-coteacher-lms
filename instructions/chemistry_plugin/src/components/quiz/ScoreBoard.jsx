import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home, Star, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { celebrationPop, staggerContainer, staggerItem } from '../../utils/animations';
import clsx from 'clsx';

function ScoreEmoji({ pct }) {
  if (pct >= 90) return '🏆';
  if (pct >= 70) return '⭐';
  if (pct >= 50) return '👍';
  return '💪';
}

function ScoreMessage({ pct }) {
  if (pct >= 90) return "Outstanding! You're a math wizard!";
  if (pct >= 70) return "Great job! You really know your stuff!";
  if (pct >= 50) return "Good effort! A little more practice and you'll ace it!";
  return "Keep practicing — you'll get there! Try the learning modules again.";
}

const TOPIC_LABELS = { prime: 'Prime Factorization', lcm: 'LCM', hcf: 'HCF' };

export default function ScoreBoard({ score, total, percentage, userAnswers, difficulty, topic, onRestart }) {
  const stars = percentage >= 90 ? 3 : percentage >= 70 ? 2 : percentage >= 50 ? 1 : 0;
  const wrong = userAnswers.filter(a => !a.isCorrect);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="max-w-lg mx-auto space-y-5"
    >
      {/* Main score card */}
      <motion.div
        variants={celebrationPop}
        className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm"
      >
        <div className="text-6xl mb-3">
          <ScoreEmoji pct={percentage} />
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-4">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 500 }}
            >
              <Star
                size={28}
                className={i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'}
              />
            </motion.div>
          ))}
        </div>

        {/* Score */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <span className="text-7xl font-black text-slate-800">{score}</span>
          <span className="text-3xl text-slate-400">/{total}</span>
        </motion.div>

        <p className="text-lg font-semibold text-slate-600 mt-2">{percentage}% correct</p>
        <p className="text-sm text-slate-500 mt-1"><ScoreMessage pct={percentage} /></p>
        <div className="flex items-center justify-center gap-3 mt-3 text-xs text-slate-400">
          <span className="capitalize bg-slate-100 px-3 py-1 rounded-full">{difficulty}</span>
          {topic && <span className="bg-slate-100 px-3 py-1 rounded-full">{TOPIC_LABELS[topic] || topic}</span>}
        </div>
      </motion.div>

      {/* Answer breakdown */}
      <motion.div variants={staggerItem} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Question Breakdown</p>
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {userAnswers.map((ans, i) => (
            <div
              key={i}
              className={clsx(
                'flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm',
                ans.isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200',
              )}
            >
              {ans.isCorrect
                ? <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                : <XCircle    size={14} className="text-red-500 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 truncate">{ans.question?.question}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your answer: <span className={ans.isCorrect ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>{String(ans.answer)}</span>
                  {!ans.isCorrect && (
                    <> · Correct: <span className="text-emerald-600 font-semibold">{String(ans.question?.correctAnswer)}</span></>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Explanations for wrong answers */}
      {wrong.length > 0 && (
        <motion.div variants={staggerItem} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">Review Wrong Answers</p>
          <div className="space-y-3">
            {wrong.map((ans, i) => (
              <div key={i} className="bg-blue-50 rounded-xl border border-blue-200 p-3">
                <p className="text-sm font-semibold text-slate-700 mb-1">{ans.question?.question}</p>
                <p className="text-xs text-slate-600">{ans.question?.explanation}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div variants={staggerItem} className="flex gap-3">
        <button
          id="scoreboard-retry"
          onClick={onRestart}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <RotateCcw size={15} /> Try Again
        </button>
        <Link to="/" className="btn-secondary flex-1 flex items-center justify-center gap-2">
          <Home size={15} /> Home
        </Link>
      </motion.div>
    </motion.div>
  );
}
