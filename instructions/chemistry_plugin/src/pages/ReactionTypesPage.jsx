import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { REACTION_TYPES } from '../utils/chemistryLogic';
import useChemistryStore from '../store/useChemistryStore';
import ReactionSimulator from '../components/chemistry/ReactionSimulator';
import ReactionMatcher from '../components/chemistry/ReactionMatcher';
import { FlaskConical, Trophy } from 'lucide-react';

const ReactionTypesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('combination');
  const [view, setView] = useState('lab'); // 'lab' | 'challenge'
  const { setCurrentReaction } = useChemistryStore();

  useEffect(() => {
    // Load first example of selected category
    const categoryData = REACTION_TYPES[selectedCategory];
    if (categoryData && categoryData.examples.length > 0) {
      setCurrentReaction({ ...categoryData.examples[0], type: selectedCategory });
    }
  }, [selectedCategory, setCurrentReaction]);

  const categoryKeys = Object.keys(REACTION_TYPES);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-2">Types of Chemical Reactions</h1>
          <p className="text-slate-600 max-w-2xl">
            Explore and identify the five main types of chemical reactions through interactive simulations or test your knowledge in the challenge mode.
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-stretch md:self-auto">
           <button 
             onClick={() => setView('lab')}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${view === 'lab' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <FlaskConical className="w-4 h-4" />
             Interactive Lab
           </button>
           <button 
             onClick={() => setView('challenge')}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${view === 'challenge' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Trophy className="w-4 h-4" />
             Knowledge Challenge
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar - Types */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="font-bold text-slate-700 mb-4 px-2">Reaction Categories</h2>
          {categoryKeys.map((key) => {
            const data = REACTION_TYPES[key];
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <h3 className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {data.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{data.description}</p>
              </button>
            );
          })}
        </div>

        {/* Main Content - Simulator or Challenge */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {view === 'lab' ? (
              <motion.div
                key="lab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {REACTION_TYPES[selectedCategory] && (
                  <ReactionSimulator 
                    reactionType={selectedCategory} 
                    reactionData={REACTION_TYPES[selectedCategory].examples[0]} 
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="challenge"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ReactionMatcher />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ReactionTypesPage;
