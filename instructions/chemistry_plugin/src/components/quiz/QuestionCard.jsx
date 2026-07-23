import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';
import ProgressTracker from '../shared/ProgressTracker';
import { scaleIn, staggerContainer, staggerItem } from '../../utils/animations';
import clsx from 'clsx';

const TYPE_COLORS = {
  HCF:   'bg-orange-100 text-orange-700 border border-orange-200',
  LCM:   'bg-indigo-100 text-indigo-700 border border-indigo-200',
  PRIME: 'bg-purple-100 text-purple-700 border border-purple-200',
};

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedOption,
  showExplanation,
  onAnswer,
}) {
  if (!question) return null;

  const { n1, n2, type, question: text, correctAnswer, options, explanation } = question;

  return (
    <motion.div variants={scaleIn} initial="hidden" animate="visible" className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-slate-500 mb-1">
        <span>Question {questionNumber} of {totalQuestions}</span>
        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-bold', TYPE_COLORS[type] || 'bg-slate-100 text-slate-600')}>
          {type}
        </span>
      </div>
      <ProgressTracker value={questionNumber - 1} max={totalQuestions} size="sm" showPercentage={false} />

      {/* Question text */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-2">{text}</h3>
        {n2 != null && (
          <p className="text-sm text-slate-500">
            Numbers: <span className="font-mono font-bold text-slate-700">{n1}</span> and{' '}
            <span className="font-mono font-bold text-slate-700">{n2}</span>
          </p>
        )}
        {n2 == null && (
          <p className="text-sm text-slate-500">
            Number: <span className="font-mono font-bold text-slate-700">{n1}</span>
          </p>
        )}
      </div>

      {/* Options */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-3"
      >
        {options.map((option, i) => {
          const isSelected = selectedOption === option || String(selectedOption) === String(option);
          const isCorrect = String(option) === String(correctAnswer);
          const revealed = selectedOption !== null;

          let state = 'idle';
          if (revealed) {
            if (isCorrect) state = 'correct';
            else if (isSelected) state = 'wrong';
            else state = 'dimmed';
          }

          return (
            <motion.button
              key={`${option}-${i}`}
              id={`option-${i}`}
              variants={staggerItem}
              onClick={() => !revealed && onAnswer(option)}
              disabled={revealed}
              whileHover={!revealed ? { scale: 1.02 } : {}}
              whileTap={!revealed ? { scale: 0.97 } : {}}
              className={clsx(
                'relative flex items-center justify-between px-5 py-4 rounded-xl border-2 text-left transition-all duration-200 font-semibold',
                state === 'idle'    && 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300 cursor-pointer',
                state === 'correct' && 'bg-emerald-50 border-emerald-400 text-emerald-800',
                state === 'wrong'   && 'bg-red-50 border-red-400 text-red-800',
                state === 'dimmed'  && 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed',
              )}
            >
              <span className="text-lg">{option}</span>
              {state === 'correct' && <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />}
              {state === 'wrong'   && <XCircle    size={18} className="text-red-500 flex-shrink-0" />}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Explanation */}
      {showExplanation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 rounded-2xl p-4 border border-blue-200"
        >
          <p className="text-xs text-blue-600 font-bold uppercase tracking-wide mb-1.5">Explanation</p>
          <p className="text-sm text-slate-700">{explanation}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
