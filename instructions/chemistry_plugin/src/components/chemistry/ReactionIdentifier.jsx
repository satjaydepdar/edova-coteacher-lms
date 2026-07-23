import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { REACTION_TYPES, getShuffledReactionTypes } from '../../utils/chemistryLogic';
import useChemistryStore from '../../store/useChemistryStore';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const ReactionIdentifier = () => {
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const { currentReaction, identifyReaction, feedback, clearFeedback } = useChemistryStore();

  useEffect(() => {
    // Generate fresh options when reaction changes
    if (currentReaction) {
      setOptions(getShuffledReactionTypes());
      setSelectedOption(null);
      clearFeedback();
    }
  }, [currentReaction, clearFeedback]);

  const handleSelect = (key) => {
    setSelectedOption(key);
    identifyReaction(key);
  };

  if (!currentReaction) return null;

  return (
    <div className="card p-6 bg-indigo-50 border-indigo-100">
      <h3 className="text-lg font-bold text-indigo-900 mb-4">Identify the Reaction Type</h3>
      <p className="text-sm text-indigo-700 mb-6">Based on the simulation above, what type of reaction is this?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {options.map((key) => {
          const typeData = REACTION_TYPES[key];
          const isSelected = selectedOption === key;
          const isCorrect = feedback.type === 'success' && isSelected;
          const isWrong = feedback.type === 'error' && isSelected;

          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={feedback.type === 'success'}
              className={`p-3 rounded-lg text-sm font-medium transition-all text-left flex justify-between items-center ${
                isSelected
                  ? isCorrect
                    ? 'bg-emerald-500 text-white shadow-md'
                    : isWrong
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-indigo-100 border border-slate-200'
              }`}
            >
              {typeData.name}
              {isCorrect && <CheckCircle2 className="w-4 h-4" />}
              {isWrong && <AlertCircle className="w-4 h-4" />}
            </button>
          );
        })}
      </div>

      {feedback.message && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg text-sm font-bold flex items-center gap-2 ${
            feedback.type === 'success' ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {feedback.message}
        </motion.div>
      )}
    </div>
  );
};

export default ReactionIdentifier;
