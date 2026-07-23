import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, CheckCircle, XCircle, Lock } from 'lucide-react';
import { scaleIn, shakeVariant } from '../../utils/animations';
import clsx from 'clsx';

export default function PredictionBox({ label = 'Predict the answer:', onPredict, correctAnswer, disabled = false }) {
  const [guess, setGuess] = useState('');
  const [locked, setLocked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [shake, setShake] = useState(false);

  const handleSubmit = () => {
    if (!guess || locked) return;
    setLocked(true);
    if (onPredict) onPredict(parseInt(guess));
  };

  const handleReveal = () => {
    if (!locked || revealed) return;
    const correct = parseInt(guess) === parseInt(correctAnswer);
    setIsCorrect(correct);
    setRevealed(true);
    if (!correct) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleReset = () => {
    setGuess('');
    setLocked(false);
    setRevealed(false);
    setIsCorrect(null);
    setShake(false);
  };

  return (
    <motion.div variants={scaleIn} initial="hidden" animate="visible" className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={16} className="text-yellow-500" />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>

      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
            <input
              id="prediction-input"
              type="number"
              value={guess}
              onChange={(e) => !locked && setGuess(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Your guess..."
              disabled={locked || disabled}
              className={clsx(
                'w-36 text-center px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-800 font-semibold bg-slate-50 focus:outline-none focus:border-blue-400 transition-all',
                locked && 'opacity-60 cursor-not-allowed',
              )}
            />

            {!locked ? (
              <button
                id="prediction-submit"
                onClick={handleSubmit}
                disabled={!guess || disabled}
                className="btn-primary py-2 px-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Lock In
              </button>
            ) : correctAnswer !== undefined ? (
              <button
                id="prediction-reveal"
                onClick={handleReveal}
                className="btn-secondary py-2 px-4 text-sm flex items-center gap-1.5"
              >
                <Lock size={13} /> Reveal
              </button>
            ) : (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Lock size={12} /> Locked in: <strong className="text-slate-700">{guess}</strong>
              </span>
            )}

            {locked && (
              <button onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600 underline">
                Reset
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            variants={scaleIn}
            initial="hidden"
            animate={shake ? 'shake' : 'visible'}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl border-2',
              isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-orange-50 border-orange-300',
            )}
          >
            {isCorrect ? (
              <>
                <CheckCircle size={20} className="text-emerald-500" />
                <div>
                  <p className="text-sm font-bold text-emerald-700">Correct! 🎉</p>
                  <p className="text-xs text-emerald-600">Answer is {correctAnswer}</p>
                </div>
              </>
            ) : (
              <>
                <XCircle size={20} className="text-orange-500" />
                <div>
                  <p className="text-sm font-bold text-orange-700">Close! You guessed {guess}</p>
                  <p className="text-xs text-orange-600">Correct answer: <strong>{correctAnswer}</strong></p>
                </div>
              </>
            )}
            <button onClick={handleReset} className="ml-auto text-xs text-slate-500 hover:text-slate-700 underline">
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
