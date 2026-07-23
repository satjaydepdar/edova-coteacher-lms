import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, RefreshCcw, Star, Trophy, Zap, Info } from 'lucide-react';
import { triggerEvent } from '../../utils/pluginEvents';

const ReactionMatcher = () => {
  const [matches, setMatches] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [isComplete, setIsComplete] = useState(false);

  const reactionData = [
    { id: 1, type: 'Combination', form: 'A + B → AB', color: 'indigo' },
    { id: 2, type: 'Decomposition', form: 'AB → A + B', color: 'purple' },
    { id: 3, type: 'Displacement', form: 'A + BC → AC + B', color: 'blue' },
    { id: 4, type: 'Double Displacement', form: 'AB + CD → AD + CB', color: 'emerald' },
    { id: 5, type: 'Precipitation', form: 'Soln A + Soln B → Solid ↓ + Soln C', color: 'amber' },
  ];

  // Shuffle right side only
  const [shuffledForms, setShuffledForms] = useState([]);

  useEffect(() => {
    resetGame();
  }, []);

  const resetGame = () => {
    setShuffledForms([...reactionData].sort(() => Math.random() - 0.5));
    setMatches([]);
    setSelectedType(null);
    setSelectedForm(null);
    setFeedback(null);
    setIsComplete(false);
  };

  const handleSelectType = (id) => {
    if (isComplete) return;
    if (matches.includes(id)) return;
    setSelectedType(id);
    if (selectedForm) checkMatch(id, selectedForm);
  };

  const handleSelectForm = (id) => {
    if (isComplete) return;
    if (matches.find(m => m.formId === id)) return;
    setSelectedForm(id);
    if (selectedType) checkMatch(selectedType, id);
  };

  const checkMatch = (typeId, formId) => {
    if (typeId === formId) {
      const newMatches = [...matches, typeId];
      setMatches(newMatches);
      setFeedback({ type: 'success', message: 'Perfect Match!' });
      if (newMatches.length === reactionData.length) {
        setIsComplete(true);
        triggerEvent('onQuizComplete', {
          quizId: 'reaction-matching',
          score: 100,
          totalQuestions: reactionData.length,
          correctAnswers: reactionData.length,
        });
        triggerEvent('onProgressUpdate', {
          chapter: 'reaction-types',
          progress: 1.0,
        });
      }
    } else {
      setFeedback({ type: 'error', message: 'Try Again!' });
    }

    setSelectedType(null);
    setSelectedForm(null);
    setTimeout(() => setFeedback(null), 1500);
  };

  return (
    <div className="card p-8 bg-white border-slate-100 shadow-2xl rounded-[3rem] min-h-[600px] flex flex-col relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 rounded-full -ml-32 -mb-32 blur-3xl opacity-50" />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
              <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
              Knowledge Challenge
            </h2>
            <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3 text-indigo-500" /> Match each reaction type to its general form
            </p>
          </div>
          <button 
            onClick={resetGame}
            className="p-3 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 text-slate-600"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 flex-grow">
          {/* Left Column: Reaction Names */}
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Reaction Type</span>
            {reactionData.map((item) => {
              const isMatched = matches.includes(item.id);
              const isSelected = selectedType === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={!isMatched ? { scale: 1.02, x: 5 } : {}}
                  whileTap={!isMatched ? { scale: 0.98 } : {}}
                  onClick={() => handleSelectType(item.id)}
                  className={`w-full p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${
                    isMatched 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 cursor-default shadow-sm' 
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50 shadow-indigo-100 shadow-xl'
                      : 'border-slate-100 hover:border-slate-200 bg-white hover:shadow-lg'
                  }`}
                >
                  {isMatched && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </motion.div>
                  )}
                  <h4 className={`text-lg font-black uppercase tracking-tight ${isMatched ? 'opacity-50' : ''}`}>
                    {item.type}
                  </h4>
                </motion.button>
              );
            })}
          </div>

          {/* Right Column: General Forms */}
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2 text-right block">General Representation</span>
            {shuffledForms.map((item) => {
              const isMatched = matches.includes(item.id);
              const isSelected = selectedForm === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={!isMatched ? { scale: 1.02, x: -5 } : {}}
                  whileTap={!isMatched ? { scale: 0.98 } : {}}
                  onClick={() => handleSelectForm(item.id)}
                  className={`w-full p-6 rounded-2xl border-2 text-center transition-all ${
                    isMatched 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 cursor-default shadow-sm' 
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50 shadow-indigo-100 shadow-xl'
                      : 'border-slate-100 hover:border-slate-200 bg-white hover:shadow-lg'
                  }`}
                >
                  <h4 className={`text-xl font-mono font-black ${isMatched ? 'opacity-50' : 'text-indigo-600'}`}>
                    {item.form}
                  </h4>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Feedback Overlay */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full shadow-2xl z-50 flex items-center gap-3 font-black uppercase tracking-widest text-xs ${
                feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {feedback.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion Celebration */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-[100] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-12"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10 }}
              >
                <Trophy className="w-32 h-32 text-amber-500 mb-8" />
              </motion.div>
              <h3 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">
                Excellent!
              </h3>
              <p className="text-xl text-slate-600 font-bold mb-10 max-w-md">
                You have mastered all five basic types of chemical reactions.
              </p>
              <button
                onClick={resetGame}
                className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-indigo-200"
              >
                Play Again
              </button>
              
              {/* Confetti effect placeholder using simple motion divs */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: 0, y: 0, opacity: 1, 
                    backgroundColor: ['#6366f1', '#a855f7', '#22c55e', '#eab308'][i % 4] 
                  }}
                  animate={{ 
                    x: (Math.random() - 0.5) * 800, 
                    y: (Math.random() - 0.5) * 600, 
                    opacity: 0,
                    rotate: Math.random() * 360
                  }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="absolute w-4 h-4 rounded-sm"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReactionMatcher;
