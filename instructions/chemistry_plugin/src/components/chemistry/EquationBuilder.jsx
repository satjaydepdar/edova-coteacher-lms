import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EQUATION_REACTIONS, parseSkeletalEquation } from '../../utils/chemistryLogic';
import useChemistryStore from '../../store/useChemistryStore';
import { Check, ArrowRight, Plus, Keyboard, AlertCircle } from 'lucide-react';

const EquationBuilder = ({ onComplete }) => {
  const [selectedReactionId, setSelectedReactionId] = useState(EQUATION_REACTIONS[0].id);
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [error, setError] = useState('');
  
  const { setReactants, setProducts, setFeedback, setEquationState } = useChemistryStore();

  const handleSelectReaction = (id) => {
    setSelectedReactionId(id);
    setIsCustom(false);
    setError('');
  };

  const handleBuild = () => {
    if (isCustom) {
      if (!customInput.trim()) {
        setError('Please enter an equation.');
        return;
      }
      const result = parseSkeletalEquation(customInput);
      if (result.error) {
        setError(result.error);
        return;
      }
      setReactants(result.reactants);
      setProducts(result.products);
    } else {
      const currentReaction = EQUATION_REACTIONS.find((r) => r.id === selectedReactionId);
      setReactants(currentReaction.reactants);
      setProducts(currentReaction.products);
    }
    
    setFeedback({ type: 'info', message: "Now, let's balance the equation!" });
    setEquationState('balancing');
    onComplete();
  };

  return (
    <div className="card p-8 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">1. Select or Enter a Reaction</h2>
        <div className="flex gap-2">
           <button 
             onClick={() => setIsCustom(false)}
             className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all ${!isCustom ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}
           >
             <Check className="w-4 h-4" /> Presets
           </button>
           <button 
             onClick={() => setIsCustom(true)}
             className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all ${isCustom ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}
           >
             <Keyboard className="w-4 h-4" /> Custom
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isCustom ? (
          <motion.div 
            key="presets"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
          >
            {EQUATION_REACTIONS.map((reaction) => (
              <button
                key={reaction.id}
                onClick={() => handleSelectReaction(reaction.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedReactionId === reaction.id
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <h3 className="font-bold text-slate-800 mb-1">{reaction.name}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-800">
                  <span>{reaction.reactants.map((r) => r.formula).join(' + ')}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>{reaction.products.map((p) => p.formula).join(' + ')}</span>
                </div>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="custom"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="mb-8"
          >
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300">
              <label className="block text-sm font-bold text-slate-700 mb-2">Enter Skeletal Equation</label>
              <input 
                type="text" 
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  setError('');
                }}
                placeholder="e.g., Fe + O2 -> Fe2O3"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-0 outline-none font-mono text-lg"
              />
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Use {"->"} or "→" to separate sides and "+" to separate compounds.
              </p>
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 font-medium border border-red-100"
                >
                  <AlertCircle className="w-4 h-4" /> {error}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <button
          onClick={handleBuild}
          className="btn-primary"
        >
          Build & Balance
          <Check className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default EquationBuilder;
