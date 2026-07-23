import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useChemistryStore from '../../store/useChemistryStore';
import { ATOM_COLORS, ATOM_RADII } from '../../utils/chemistryLogic';
import { Scale, CheckCircle2, AlertCircle, Lightbulb, Zap, ArrowRight, RotateCcw, Info, History, Focus, Trophy, Sparkles, RefreshCw } from 'lucide-react';

const ParticleMolecule = ({ species, side, index, coeffIndex, isFocused, isRecentlyAdded }) => {
  const atoms = Object.entries(species.atoms).flatMap(([element, count]) => 
    Array.from({ length: count }).map((_, i) => ({ element, id: `${element}-${side}-${index}-${coeffIndex}-${i}` }))
  );

  return (
    <motion.div
      layout
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ 
        scale: isFocused ? 1.1 : 1, 
        opacity: 1, 
        y: 0,
        boxShadow: isRecentlyAdded ? "0 0 20px rgba(99, 102, 241, 0.4)" : "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      }}
      exit={{ scale: 0, opacity: 0, y: -20 }}
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', damping: 15, stiffness: 150 }}
      className={`relative p-4 bg-white/40 backdrop-blur-md rounded-2xl border ${isRecentlyAdded ? 'border-indigo-400' : 'border-white/20'} flex flex-wrap gap-1.5 justify-center items-center w-32 h-32`}
    >
      {atoms.map((atom, i) => (
        <motion.div
          key={atom.id}
          layout
          animate={isRecentlyAdded ? { scale: [1, 1.2, 1] } : {}}
          className="rounded-full shadow-lg border border-black/5 flex items-center justify-center font-black text-xs"
          style={{
            width: (ATOM_RADII[atom.element] || 20) * 1.8,
            height: (ATOM_RADII[atom.element] || 20) * 1.8,
            backgroundColor: ATOM_COLORS[atom.element] || '#ccc',
            color: ['H', 'Al', 'Ag', 'Na', 'Ca', 'Mg', 'Zn'].includes(atom.element) ? '#1e293b' : '#fff',
            filter: 'brightness(1.1)',
          }}
        >
          {atom.element}
        </motion.div>
      ))}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-tighter shadow-lg whitespace-nowrap">
        {species.formula}
      </div>
    </motion.div>
  );
};

const BalancingLab = ({ onReset }) => {
  const { 
    selectedReactants, 
    selectedProducts, 
    atomBalance, 
    calculateBalance, 
    submitBalanceCheck,
    equationState,
    feedback,
    coefficients,
    updateCoefficients,
    isTeacherMode
  } = useChemistryStore();

  const [hint, setHint] = useState(null);
  const [guidedMode, setGuidedMode] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [focusedElement, setFocusedElement] = useState(null);
  const [stepHistory, setStepHistory] = useState([]);
  const [lastChanged, setLastChanged] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  
  const isBalanced = equationState === 'balanced';

  useEffect(() => {
    if (selectedReactants.length > 0 && selectedProducts.length > 0) {
      calculateBalance();
    }
  }, [selectedReactants, selectedProducts, coefficients, calculateBalance]);

  useEffect(() => {
    if (guidedMode) handleAutoHint();
  }, [coefficients, guidedMode]);

  const handleAutoHint = () => {
    const unbalanced = Object.entries(atomBalance).find(([_, data]) => !data.balanced);
    if (!unbalanced) {
      setHint("The equation is perfectly balanced! Click 'Check Balance' to verify.");
      setHintLevel(0);
      return;
    }
    const [atom, data] = unbalanced;
    
    // Progressive hints
    if (hintLevel === 0) {
      setHint(`Look at the ${atom} atoms. They are not balanced.`);
    } else if (hintLevel === 1) {
      if (data.reactant < data.product) {
        setHint(`Try increasing a reactant that contains ${atom}.`);
      } else {
        setHint(`Try increasing a product that contains ${atom}.`);
      }
    } else {
      setHint(`You have ${data.reactant} ${atom} on the left and ${data.product} ${atom} on the right. Balance them first!`);
    }
    
    if (!guidedMode) setHintLevel((prev) => (prev + 1) % 3);
    if (!guidedMode) setTimeout(() => setHint(null), 5000);
  };

  const handleUpdateCoefficient = (id, formula, newVal) => {
    const prevVal = coefficients[id] || 1;
    if (newVal < 1 || newVal > 9) return;
    
    updateCoefficients(id, newVal);
    setLastChanged(id);
    setStepHistory(prev => [{
      id: Date.now(),
      formula,
      from: prevVal,
      to: newVal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }, ...prev].slice(0, 10));

    setTimeout(() => setLastChanged(null), 1000);
  };

  const handleCheck = async () => {
    const isBalanced = submitBalanceCheck();
    if (!isBalanced) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  if (selectedReactants.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {/* Split Layout Container */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Side: Equation & Controls (4/12) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="card p-6 bg-white shadow-xl border-slate-100 h-full flex flex-col rounded-[2rem]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Equation Controls
              </h2>
              <div className="flex gap-2">
                <button onClick={onReset} className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Equation Controls */}
            <div className="space-y-8 flex-1">
              {/* Reactants Controls */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Reactants</span>
                </div>
                <div className="space-y-3">
                  {selectedReactants.map((r) => {
                    const coeff = coefficients[`r_${r.id}`] || 1;
                    return (
                      <div key={r.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${lastChanged === `r_${r.id}` ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="font-black text-slate-900 text-lg">{r.formula}</div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleUpdateCoefficient(`r_${r.id}`, r.formula, coeff - 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-xl hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-black text-xl text-primary">{coeff}</span>
                          <button 
                            onClick={() => handleUpdateCoefficient(`r_${r.id}`, r.formula, coeff + 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-xl hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center my-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shadow-inner">
                   <ArrowRight className="w-6 h-6 text-slate-400" />
                </div>
              </div>

              {/* Products Controls */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4 block">Products</span>
                <div className="space-y-3">
                  {selectedProducts.map((p) => {
                    const coeff = coefficients[`p_${p.id}`] || 1;
                    return (
                      <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${lastChanged === `p_${p.id}` ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="font-black text-slate-900 text-lg">{p.formula}</div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => handleUpdateCoefficient(`p_${p.id}`, p.formula, coeff - 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-xl hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-black text-xl text-primary">{coeff}</span>
                          <button 
                            onClick={() => handleUpdateCoefficient(`p_${p.id}`, p.formula, coeff + 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-xl hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Hint Display */}
            <AnimatePresence>
              {hint && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3"
                >
                  <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-amber-800">{hint}</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
              <motion.button 
                animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                onClick={handleCheck}
                className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg bg-primary text-white hover:scale-[1.02] active:scale-[0.98] shadow-primary/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Check Balance
              </motion.button>
              
              <AnimatePresence>
                {feedback.message && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`p-4 rounded-xl text-sm font-bold flex items-start gap-3 shadow-sm ${
                      feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 ring-4 ring-emerald-500/10' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}
                  >
                    {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    {feedback.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step History */}
            {stepHistory.length > 0 && (
              <div className="mt-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Step History</span>
                <div className="max-h-32 overflow-y-auto pr-2 space-y-2">
                  {stepHistory.map(step => (
                    <div key={step.id} className="text-[10px] font-bold text-slate-500 flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span>Changed <b className="text-primary">{step.formula}</b></span>
                      <span>{step.from} → {step.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Visual Atom Playground (8/12) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="card p-8 bg-slate-900 overflow-hidden relative min-h-[600px] flex flex-col shadow-2xl rounded-[2.5rem]">
            {/* Dark mode styling for playground */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
            
            <div className="flex justify-between items-center mb-8 relative z-10">
               <div className="flex flex-col">
                 <h2 className="text-xl font-black text-white flex items-center gap-2">
                   Molecule Playground
                 </h2>
                 <p className="text-xs text-slate-400 font-bold">Visualizing the Law of Conservation of Mass</p>
               </div>
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                    {Object.keys(atomBalance).map(atom => (
                      <button
                        key={atom}
                        onClick={() => setFocusedElement(focusedElement === atom ? null : atom)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${focusedElement === atom ? 'bg-white text-slate-900 shadow-lg' : 'text-white/60 hover:text-white'}`}
                      >
                        {atom}
                      </button>
                    ))}
                 </div>
                 <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${equationState === 'balanced' ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-slate-800 text-slate-400'}`}>
                   {equationState === 'balanced' ? 'Symmetry Reached' : 'Imbalanced'}
                 </div>
               </div>
            </div>

            {/* Particle Canvas */}
            <div className="flex-1 grid grid-cols-2 gap-8 relative z-10 mb-8">
              {/* Reactants Particles */}
              <div className="bg-white/[0.03] rounded-[2rem] p-8 border border-white/5 flex flex-wrap content-start gap-6 justify-center relative overflow-y-auto max-h-[350px] group">
                 <div className="absolute top-4 left-6 text-[10px] font-black text-white/20 uppercase tracking-widest">Reactants Side</div>
                 <AnimatePresence>
                   {selectedReactants.flatMap((r, rIdx) => {
                      const coeff = coefficients[`r_${r.id}`] || 1;
                      const hasAtom = focusedElement ? !!r.atoms[focusedElement] : true;
                      return Array.from({ length: coeff }).map((_, cIdx) => (
                        <ParticleMolecule 
                          key={`r-${r.id}-${cIdx}`}
                          species={r}
                          side="r"
                          index={rIdx}
                          coeffIndex={cIdx}
                          isFocused={hasAtom && focusedElement}
                          isRecentlyAdded={lastChanged === `r_${r.id}`}
                        />
                      ));
                   })}
                 </AnimatePresence>
              </div>

              {/* Products Particles */}
              <div className="bg-white/[0.03] rounded-[2rem] p-8 border border-white/5 flex flex-wrap content-start gap-6 justify-center relative overflow-y-auto max-h-[350px]">
                 <div className="absolute top-4 left-6 text-[10px] font-black text-white/20 uppercase tracking-widest">Products Side</div>
                 <AnimatePresence>
                   {selectedProducts.flatMap((p, pIdx) => {
                      const coeff = coefficients[`p_${p.id}`] || 1;
                      const hasAtom = focusedElement ? !!p.atoms[focusedElement] : true;
                      return Array.from({ length: coeff }).map((_, cIdx) => (
                        <ParticleMolecule 
                          key={`p-${p.id}-${cIdx}`}
                          species={p}
                          side="p"
                          index={pIdx}
                          coeffIndex={cIdx}
                          isFocused={hasAtom && focusedElement}
                          isRecentlyAdded={lastChanged === `p_${p.id}`}
                        />
                      ));
                   })}
                 </AnimatePresence>
              </div>
              
              {/* Symmetry Line */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10 -translate-x-1/2" />
            </div>

            {/* Atom Count Sync Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10 overflow-visible">
               {Object.entries(atomBalance).map(([atom, data]) => (
                 <motion.div 
                  key={atom} 
                  animate={focusedElement === atom ? { scale: 1.05 } : { scale: 1 }}
                  className={`bg-white/5 backdrop-blur-md rounded-2xl p-4 border-2 transition-all flex flex-col items-center gap-4 ${data.balanced ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5'} ${focusedElement === atom ? 'ring-4 ring-indigo-500/30' : ''}`}
                 >
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-xl border-2 ${data.balanced ? 'border-emerald-400' : 'border-red-400'}`}
                      style={{ backgroundColor: ATOM_COLORS[atom], opacity: 0.9 }}
                    >
                      {atom}
                    </div>
                    
                    <div className="w-full flex items-center justify-between gap-2 px-2">
                       <div className="flex flex-col items-center min-w-[40px]">
                          <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter mb-1">Reactants</span>
                          <span className={`text-2xl font-black ${data.balanced ? 'text-emerald-400' : 'text-red-400'}`}>{data.reactant}</span>
                       </div>
                       
                       <div className="flex flex-col items-center">
                          {data.balanced ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                          )}
                       </div>

                       <div className="flex flex-col items-center min-w-[40px]">
                          <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter mb-1">Products</span>
                          <span className={`text-2xl font-black ${data.balanced ? 'text-emerald-400' : 'text-red-400'}`}>{data.product}</span>
                       </div>
                    </div>
                 </motion.div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {isBalanced && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-[0_0_50px_rgba(99,102,241,0.3)] relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 z-0" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-50 rounded-full -ml-16 -mb-16 z-0" />

              <div className="relative z-10 text-center">
                 <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/10">
                    <Trophy className="w-12 h-12" />
                 </div>
                 
                 <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-4">Equation Balanced!</h2>
                 <p className="text-slate-500 font-bold text-lg mb-8">You have successfully satisfied the Law of Conservation of Mass.</p>
                 
                 <div className="bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 mb-8">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-4">Final Balanced Equation</span>
                    <div className="text-3xl font-mono font-black text-slate-800 tracking-tight">
                       {selectedReactants.map((r, i) => (
                         <span key={i}>
                            {(coefficients[`r_${r.id}`] || 1) > 1 && <span className="text-indigo-600 mr-1">{coefficients[`r_${r.id}`]}</span>}
                            {r.formula}{i < selectedReactants.length - 1 ? ' + ' : ''}
                         </span>
                       ))}
                       <span className="mx-4 text-indigo-400">→</span>
                       {selectedProducts.map((p, i) => (
                         <span key={i}>
                            {(coefficients[`p_${p.id}`] || 1) > 1 && <span className="text-indigo-600 mr-1">{coefficients[`p_${p.id}`]}</span>}
                            {p.formula}{i < selectedProducts.length - 1 ? ' + ' : ''}
                         </span>
                       ))}
                    </div>
                 </div>

                 <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-left bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                       <Sparkles className="w-6 h-6 text-indigo-500 shrink-0" />
                       <p className="text-sm text-indigo-900 font-bold leading-relaxed">
                         Conceptual Takeaway: Every single atom that entered the reaction as a reactant is now present in the products. Matter was neither created nor destroyed!
                       </p>
                    </div>
                    
                    <button 
                      onClick={onReset}
                      className="mt-4 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                      Try Next Equation
                    </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BalancingLab;
