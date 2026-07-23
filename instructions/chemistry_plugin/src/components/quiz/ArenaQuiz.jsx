import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame } from 'lucide-react';
import TimerBar from './TimerBar';
import ResultCard from './ResultCard';
import { generateQuestions } from '../../utils/math';
import { DIFFICULTY_CONFIG, XP } from '../../utils/constants';
import { useLearning } from '../../context/LearningContext';

export default function ArenaQuiz({ topic, difficulty, onCancel }) {
  const { state, dispatch } = useLearning();
  const config = DIFFICULTY_CONFIG[difficulty];
  
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [xpEarnedThisRound, setXpEarnedThisRound] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Interaction state
  const [selectedAns, setSelectedAns] = useState(null);
  const [status, setStatus] = useState(null); // 'correct' | 'wrong' | 'timeout'
  const [timeSpent, setTimeSpent] = useState(0); // to calculate fast answer bonus

  useEffect(() => {
    // Math logic already handles 'prime', 'lcm', 'hcf', 'mixed'
    setQuestions(generateQuestions(config.questions, difficulty, topic === 'mixed' ? null : topic));
  }, [difficulty, topic, config.questions]);

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedAns(null);
      setStatus(null);
      setTimeSpent(0);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setIsFinished(true);
    dispatch({ type: 'UPDATE_CHALLENGE', score });
    if (score === questions.length) {
      dispatch({ type: 'EARN_XP', amount: XP.QUIZ_PERFECT });
      setXpEarnedThisRound(prev => prev + XP.QUIZ_PERFECT);
      dispatch({ type: 'UNLOCK_BADGE', id: 'perfect_score' });
      dispatch({ type: 'SET_MODULE_STARS', module: 'challenge', stars: 3 });
    } else if (score >= questions.length * 0.8) {
      dispatch({ type: 'SET_MODULE_STARS', module: 'challenge', stars: 2 });
    } else if (score >= questions.length * 0.5) {
      dispatch({ type: 'SET_MODULE_STARS', module: 'challenge', stars: 1 });
    }
  };

  const handleAnswer = (ans) => {
    if (status) return; // already answered
    setSelectedAns(ans);
    
    const q = questions[currentIdx];
    const isCorrect = ans === q.correctAnswer;
    
    if (isCorrect) {
      setStatus('correct');
      setScore(s => s + 1);
      dispatch({ type: 'INC_STREAK' });
      
      let xp = XP.QUIZ_CORRECT;
      if (timeSpent < 5) xp = XP.QUIZ_CORRECT_FAST;
      dispatch({ type: 'EARN_XP', amount: xp });
      setXpEarnedThisRound(prev => prev + xp);
      
      setTimeout(handleNext, 1200);
    } else {
      setStatus('wrong');
      dispatch({ type: 'RESET_STREAK' });
      setTimeout(handleNext, 2500);
    }
  };

  const handleTimeUp = () => {
    if (status) return;
    setStatus('timeout');
    dispatch({ type: 'RESET_STREAK' });
    setTimeout(handleNext, 2500);
  };

  useEffect(() => {
    if (status) return;
    const interval = setInterval(() => setTimeSpent(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [status, currentIdx]);

  if (questions.length === 0) return <div className="text-center py-10 font-bold text-slate-500">Loading arena...</div>;

  if (isFinished) {
    return <ResultCard score={score} total={questions.length} xpEarned={xpEarnedThisRound} onRetry={() => {
      setQuestions(generateQuestions(config.questions, difficulty, topic === 'mixed' ? null : topic));
      setCurrentIdx(0); setScore(0); setXpEarnedThisRound(0); setIsFinished(false); setSelectedAns(null); setStatus(null); setTimeSpent(0);
    }} />;
  }

  const q = questions[currentIdx];

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onCancel} className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-full font-bold text-sm">
            <Flame size={16} /> {state.streak}
          </div>
          <div className="text-sm font-bold text-slate-400">
            {currentIdx + 1} / {questions.length}
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card bg-white p-6 sm:p-10 border-4 relative overflow-hidden transition-colors duration-300
        ${status === 'correct' ? 'border-emerald-400' : status === 'wrong' || status === 'timeout' ? 'border-rose-400' : 'border-slate-200'}"
        style={{ borderColor: status === 'correct' ? '#34D399' : (status === 'wrong' || status === 'timeout') ? '#FB7185' : '#E2E8F0' }}
      >
        <div className="mb-8">
          <TimerBar duration={config.timePerQ} isRunning={!status} onTimeUp={handleTimeUp} />
        </div>

        <div className="min-h-[120px] flex items-center justify-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 text-center leading-snug">{q.question}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {q.options.map((opt, i) => {
            const isSelected = selectedAns === opt;
            const isCorrect = opt === q.correctAnswer;
            
            let btnClass = 'answer-opt';
            if (status) {
              if (isCorrect) btnClass += ' answer-opt-correct';
              else if (isSelected) btnClass += ' answer-opt-wrong';
              else btnClass += ' answer-opt-dimmed';
            }

            return (
              <button
                key={i}
                disabled={status !== null}
                onClick={() => handleAnswer(opt)}
                className={btnClass}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {(status === 'wrong' || status === 'timeout') && (
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="mt-8 bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 text-center">
              <p className="text-rose-600 font-bold mb-1">{status === 'timeout' ? '⏰ Time is up!' : '❌ Incorrect!'}</p>
              <p className="text-sm font-medium text-slate-700">{q.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
