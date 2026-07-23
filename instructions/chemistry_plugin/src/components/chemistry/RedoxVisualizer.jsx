import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { REDOX_REACTIONS, ATOM_COLORS, parseSkeletalEquation, detectRedox } from '../../utils/chemistryLogic';
import { ArrowRight, Info, CheckCircle2, AlertCircle, Zap, Play, SkipForward, RotateCcw, Send, Settings2 } from 'lucide-react';
import useChemistryStore from '../../store/useChemistryStore';

const RedoxParticle = ({ element, atoms = 1, isProduct = false, step = 0, oxidationStates = [], formula = "" }) => {
  const oxState = oxidationStates.find(o => o.element === element);
  const color = ATOM_COLORS[element] || '#ccc';
  const displayState = step < 2 ? oxState?.reactantState : oxState?.productState;
  const isOxidation = oxState?.type === 'oxidation';
  const isReduction = oxState?.type === 'reduction';
  
  // Pulse animation variants
  const pulseVariants = {
    oxidation: {
      boxShadow: [
        '0 0 0px rgba(248,113,113,0)',
        '0 0 25px rgba(248,113,113,0.6)',
        '0 0 0px rgba(248,113,113,0)'
      ],
      scale: [1, 1.05, 1],
      transition: { duration: 2, repeat: Infinity }
    },
    reduction: {
      boxShadow: [
        '0 0 0px rgba(96,165,250,0)',
        '0 0 25px rgba(96,165,250,0.6)',
        '0 0 0px rgba(96,165,250,0)'
      ],
      scale: [1, 1.05, 1],
      transition: { duration: 2, repeat: Infinity }
    }
  };

  return (
    <div className="flex flex-col items-center relative">
       {/* OS Number - Strictly Above, Static Flow */}
       <div className="h-6 flex items-end justify-center mb-2">
         <AnimatePresence>
           {displayState !== undefined && step >= 1 && (
             <motion.div 
               initial={{ opacity: 0, y: 10, scale: 0.5 }} 
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, scale: 0.5 }}
               className={`text-[10px] font-black px-2 py-0.5 rounded-md border backdrop-blur-md shadow-lg z-30 flex items-center gap-1 ${
                  isOxidation ? 'bg-red-500 border-red-400 text-white shadow-red-500/20' : 
                  isReduction ? 'bg-blue-500 border-blue-400 text-white shadow-blue-500/20' : 
                  'bg-slate-800 border-slate-700 text-slate-100'
               }`}
             >
               <span className="opacity-70 text-[7px] uppercase tracking-tighter leading-none">OS</span>
               <span className="text-xs leading-none font-black">{displayState}</span>
             </motion.div>
           )}
         </AnimatePresence>
       </div>

       <div className="flex relative items-center justify-center">
          {[...Array(atoms)].map((_, i) => (
              <motion.div
                key={i}
                layout
                animate={
                  (isOxidation && step === 1) ? "oxidation" : 
                  (isReduction && step === 1) ? "reduction" : ""
                }
                variants={pulseVariants}
                className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl border-4 shadow-lg z-10 transition-all duration-500 ${i > 0 ? '-ml-4' : ''}`}
                style={{ 
                  backgroundColor: color, 
                  borderColor: isOxidation && step >= 1 ? '#f87171' : isReduction && step >= 1 ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                  color: ['H', 'Al', 'Ag', 'Na', 'Ca', 'Mg', 'Zn'].includes(element) ? '#0f172a' : '#fff',
                }}
              >
                 {element}
             </motion.div>
          ))}
       </div>
    </div>
  );
};

const RedoxVisualizer = () => {
  const [selectedReactionId, setSelectedReactionId] = useState(REDOX_REACTIONS[0].id);
  const [customEquation, setCustomEquation] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customData, setCustomData] = useState(null);
  const [mode, setMode] = useState('redox'); // 'oxidation' | 'reduction' | 'redox'
  const [step, setStep] = useState(0); // 0: Reactants, 1: Transfer, 2: Products
  const { feedback, setFeedback, clearFeedback, explainMode, toggleExplainMode } = useChemistryStore();

  const currentReaction = useMemo(() => {
    if (isCustomMode && customData) return customData;
    return REDOX_REACTIONS.find((r) => r.id === selectedReactionId) || REDOX_REACTIONS[0];
  }, [selectedReactionId, isCustomMode, customData]);

  useEffect(() => {
    setStep(0);
    clearFeedback();
  }, [selectedReactionId, mode, clearFeedback, isCustomMode]);

  const handleNextStep = () => {
    setStep(prev => Math.min(prev + 1, 2));
  };

  const handleReplay = () => {
    setStep(0);
    clearFeedback();
  };

  const handleCustomSubmit = () => {
    if (!customEquation.trim()) return;
    const parsed = parseSkeletalEquation(customEquation);
    if (parsed.error) {
      setFeedback({ type: 'error', message: parsed.error });
      return;
    }
    
    const redoxChanges = detectRedox(parsed.reactants, parsed.products);
    if (redoxChanges.length === 0) {
      setFeedback({ type: 'error', message: "This doesn't seem to be a redox reaction (no oxidation state changes detected)." });
      return;
    }

    const newData = {
      id: 'custom',
      equation: customEquation,
      reactants: parsed.reactants,
      products: parsed.products,
      oxidationNumbers: redoxChanges,
      explanation: "Custom reaction analyzed! Identifying redox centers...",
      oxidationDesc: `${redoxChanges.find(o => o.type === 'oxidation')?.element} is being oxidized.`,
      reductionDesc: `${redoxChanges.find(o => o.type === 'reduction')?.element} is being reduced.`
    };

    setCustomData(newData);
    setIsCustomMode(true);
    setStep(0);
    clearFeedback();
  };

  const oxidationNumbers = useMemo(() => currentReaction.oxidationNumbers || [], [currentReaction]);

  const renderMolecules = () => {
    const reactants = currentReaction.reactants || [];
    
    // Filter logic based on tab
    const isOxidationTab = mode === 'oxidation';
    const isReductionTab = mode === 'reduction';
    const isRedoxTab = mode === 'redox';

    return (
      <div className="flex flex-col items-center gap-12 w-full max-w-5xl">
        <div className="flex items-center justify-between w-full relative min-h-[300px]">
          
          {/* Reactant / Donor Side */}
          <div className="flex flex-col items-center gap-8 flex-1">
             <div className="flex gap-8 items-center justify-center">
                {reactants.map((reactant, rIdx) => {
                  const oxInfo = oxidationNumbers.find(o => o.element === reactant.element);
                  const isDonor = oxInfo?.type === 'oxidation';
                  
                  return (
                    <motion.div 
                      key={reactant.id || rIdx}
                      animate={{ 
                        opacity: (mode === 'reduction' && step < 2) ? 0.15 : 1,
                        scale: step === 1 && (mode === 'oxidation' || mode === 'redox') && isDonor ? 1.15 : 1,
                        filter: (mode === 'reduction' && step < 2) ? 'grayscale(1) blur(1px)' : 'none'
                      }}
                      className="flex flex-col items-center gap-6 relative"
                    >
                       <RedoxParticle element={reactant.element} atoms={reactant.atoms} step={step} oxidationStates={oxidationNumbers} formula={reactant.formula} />
                       {reactant.compounds && Object.entries(reactant.compounds).map(([el, count]) => (
                         <div key={el} className="mt-4">
                            <RedoxParticle element={el} atoms={count} step={step} oxidationStates={oxidationNumbers} />
                         </div>
                       ))}
                       
                       {isDonor && (mode === 'redox' || mode === 'oxidation') && step >= 1 && (
                         <motion.div 
                           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                           className="mt-2 bg-red-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(220,38,38,0.5)] z-30 border border-red-400 flex flex-col items-center min-w-[120px]"
                         >
                            <Zap className="w-3 h-3 mb-1 fill-current" />
                            <span>Electron Donor</span>
                            <span className="text-[8px] opacity-70 mt-0.5">Oxidized</span>
                         </motion.div>
                       )}
                    </motion.div>
                  );
                })}
             </div>
             <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em]">Reactants</span>
          </div>

          {/* Electron Flow Path */}
          <div className="w-64 flex flex-col items-center justify-center px-4 relative h-full">
             <AnimatePresence>
                {step === 1 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center relative"
                  >
                     {/* Curved Path Arrow - Dotted & Clean */}
                     <svg className="w-full h-32 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%] pointer-events-none overflow-visible" viewBox="0 0 200 100">
                        <defs>
                          <marker id="arrowhead-ox" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
                          </marker>
                          <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
                          </marker>
                        </defs>
                        <motion.path 
                          d={mode === 'reduction' ? "M 180 50 Q 100 -20 20 50" : "M 20 50 Q 100 -20 180 50"} 
                          fill="none" 
                          stroke={mode === 'oxidation' ? "rgba(248, 113, 113, 0.4)" : mode === 'reduction' ? "rgba(96, 165, 250, 0.4)" : "rgba(255, 255, 255, 0.2)"} 
                          strokeWidth="2"
                          strokeDasharray="4,4"
                        />
                     </svg>

                     {/* Electron Particles Animation */}
                     <div className="relative w-full h-24 flex items-center justify-center">
                        {[...Array(4)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ offsetDistance: "0%", opacity: 0 }}
                            animate={{ 
                              offsetDistance: "100%", 
                              opacity: [0, 1, 1, 0],
                              scale: [0.8, 1.1, 0.8]
                            }}
                            transition={{ 
                              duration: 2, 
                              repeat: Infinity, 
                              delay: i * 0.5, 
                              ease: "linear" 
                            }}
                            style={{ 
                              offsetPath: mode === 'reduction' ? "path('M 80 0 Q 0 -60 -80 0')" : "path('M -80 0 Q 0 -60 80 0')" 
                            }}
                            className={`absolute w-3 h-3 rounded-full shadow-[0_0_10px_#fff] flex items-center justify-center text-[7px] font-black text-slate-900 bg-white border border-indigo-200 z-50`}
                          >
                             e⁻
                          </motion.div>
                        ))}
                     </div>
                     
                     <div className="mt-8 flex flex-col items-center">
                        <motion.div 
                          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className={`p-2.5 rounded-2xl backdrop-blur-md border shadow-xl ${
                            mode === 'oxidation' ? 'bg-red-500 border-red-500/30 text-white' :
                            mode === 'reduction' ? 'bg-blue-500 border-blue-500/30 text-white' :
                            'bg-indigo-500 border-indigo-500/30 text-white'
                          }`}
                        >
                           <Zap className="w-5 h-5 fill-current" />
                        </motion.div>
                        <span className={`text-[10px] font-black uppercase tracking-widest mt-3 px-3 py-1 rounded-full bg-white/5 border border-white/10 ${
                          mode === 'oxidation' ? 'text-red-400' :
                          mode === 'reduction' ? 'text-blue-400' :
                          'text-indigo-400'
                        }`}>
                          {mode === 'oxidation' ? 'Electron Loss' : mode === 'reduction' ? 'Electron Gain' : 'Transfer'}
                        </span>
                     </div>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>

          {/* Product / Acceptor Side */}
          <div className="flex flex-col items-center gap-8 flex-1">
             <div className="flex gap-8 items-center justify-center">
                {currentReaction.products && currentReaction.products.map((product, pIdx) => {
                  const oxInfo = oxidationNumbers.find(o => o.element === product.element);
                  const isAcceptor = oxInfo?.type === 'reduction';

                  return (
                    <motion.div 
                      key={pIdx}
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: (mode === 'reduction' && step >= 1) || (mode === 'redox' && step >= 1) || (mode === 'oxidation' && step === 2) ? 1 : 0.15,
                        scale: step === 2 && (mode === 'reduction' || mode === 'redox') && isAcceptor ? 1.15 : 1,
                        x: step === 2 ? 0 : 20,
                        filter: (mode === 'oxidation' && step < 2) ? 'grayscale(1) blur(1px)' : 'none'
                      }}
                      className="flex flex-col items-center gap-6 relative"
                    >
                       <RedoxParticle element={product.element} atoms={product.atoms} step={step} oxidationStates={oxidationNumbers} formula={product.formula} />
                       {product.compounds && Object.entries(product.compounds).map(([el, count]) => (
                          <div key={el} className="mt-4">
                             <RedoxParticle element={el} atoms={count} step={step} oxidationStates={oxidationNumbers} />
                          </div>
                       ))}
                       
                       {isAcceptor && (mode === 'redox' || mode === 'reduction') && step >= 1 && (
                         <motion.div 
                           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                           className="mt-2 bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(37,99,235,0.5)] z-30 border border-blue-400 flex flex-col items-center min-w-[120px]"
                         >
                            <Zap className="w-3 h-3 mb-1 fill-current" />
                            <span>Electron Acceptor</span>
                            <span className="text-[8px] opacity-70 mt-0.5">Reduced</span>
                         </motion.div>
                       )}
                    </motion.div>
                  );
                })}
             </div>
             <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.5em]">Products</span>
          </div>
        </div>

        {/* Dynamic Observations during animation */}
        <AnimatePresence>
           {step === 2 && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full"
             >
                {(isRedoxTab || isReductionTab) && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 text-center shadow-xl backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Reduction Process</span>
                    </div>
                    <p className="text-white font-black text-lg">
                        {oxidationNumbers.find(o => o.type === 'reduction')?.element || 'Unknown'}: {oxidationNumbers.find(o => o.type === 'reduction')?.reactantState || '0'} → {oxidationNumbers.find(o => o.type === 'reduction')?.productState || '0'}
                    </p>
                    <p className="text-[10px] text-blue-300 font-bold mt-1 opacity-60 uppercase">{oxidationNumbers.find(o => o.type === 'reduction')?.electronChange || 'N/A'}</p>
                  </div>
                )}

                {(isRedoxTab || isOxidationTab) && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center shadow-xl backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-red-400" />
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Oxidation Process</span>
                    </div>
                    <p className="text-white font-black text-lg">
                        {oxidationNumbers.find(o => o.type === 'oxidation')?.element || 'Unknown'}: {oxidationNumbers.find(o => o.type === 'oxidation')?.reactantState || '0'} → {oxidationNumbers.find(o => o.type === 'oxidation')?.productState || '0'}
                    </p>
                    <p className="text-[10px] text-red-300 font-bold mt-1 opacity-60 uppercase">{oxidationNumbers.find(o => o.type === 'oxidation')?.electronChange || 'N/A'}</p>
                  </div>
                )}
             </motion.div>
           )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Tab Navigation & Custom Input */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-col gap-2">
           <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Redox Visualizer</h2>
           <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
             {['oxidation', 'reduction', 'redox'].map((m) => (
               <button
                 key={m}
                 onClick={() => setMode(m)}
                 className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                   mode === m
                     ? 'bg-white text-primary shadow-sm border border-slate-200'
                     : 'text-slate-500 hover:text-slate-700'
                 }`}
               >
                 {m}
               </button>
             ))}
           </div>
        </div>

        <div className="flex items-center gap-4">
           {isCustomMode ? (
             <div className="flex items-center gap-3">
                <input 
                  type="text"
                  placeholder="Enter equation..."
                  value={customEquation}
                  onChange={(e) => setCustomEquation(e.target.value)}
                  className="bg-slate-50 border-2 border-slate-100 px-6 py-3 rounded-2xl text-xs font-bold w-64 focus:border-indigo-300 transition-all outline-none"
                />
                <button onClick={handleCustomSubmit} className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">
                   <Send className="w-5 h-5" />
                </button>
             </div>
           ) : (
             <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 overflow-x-auto max-w-full">
               {REDOX_REACTIONS.map((r) => (
                 <button
                   key={r.id}
                   onClick={() => setSelectedReactionId(r.id)}
                   className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                     selectedReactionId === r.id ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'
                   }`}
                 >
                   {r.id.split('_')[0]}
                 </button>
               ))}
             </div>
           )}
           <button 
             onClick={() => setIsCustomMode(!isCustomMode)}
             className={`p-3 rounded-2xl border transition-all ${isCustomMode ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
           >
             <Settings2 className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Main Visualizer Stage */}
      <div className="bg-slate-900 rounded-[3rem] p-12 min-h-[550px] relative overflow-hidden flex flex-col border-8 border-slate-800 shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:30px_30px]" />
        
        {/* Stage Progress Bar */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30">
           {[0, 1, 2].map((s) => (
             <div key={s} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full transition-all duration-500 ${step >= s ? 'bg-indigo-400 scale-125' : 'bg-white/10'}`} />
                {s < 2 && <div className={`w-12 h-0.5 rounded-full ${step > s ? 'bg-indigo-400/40' : 'bg-white/5'}`} />}
             </div>
           ))}
        </div>

        {/* Step Controls */}
        <div className="absolute top-10 right-12 flex gap-3 z-30">
          <button 
            onClick={handleReplay} 
            className="flex items-center gap-2 px-6 py-3 bg-white/5 text-white font-black text-xs rounded-2xl hover:bg-white/10 border border-white/10 transition-all"
          >
             <RotateCcw className="w-4 h-4" /> Replay
          </button>
          <button 
            onClick={handleNextStep} 
            disabled={step === 2}
            className="flex items-center gap-3 px-8 py-3 bg-indigo-500 text-white font-black text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-30"
          >
             {step === 0 ? <><Play className="w-4 h-4 fill-current"/> Start Animation</> : <><SkipForward className="w-4 h-4 fill-current"/> Next Step</>}
          </button>
        </div>

        {/* Phase Info - Compacted and moved higher */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 text-center z-40">
           <span className="text-[8px] font-black text-indigo-400/60 uppercase tracking-[0.5em] block mb-0.5">Current Phase</span>
           <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
              {step === 0 ? "Initial Reactants" : step === 1 ? "Electron Transfer" : "Final Products"}
           </h3>
        </div>

        {/* Reaction Visualization - Adjusted Padding */}
        <div className="relative z-20 flex-1 flex items-center justify-center pt-12">
           {renderMolecules()}
        </div>
      </div>

      {/* Explanation Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
             <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-8">
               <Zap className="w-5 h-5 text-indigo-500" /> Redox State Changes
             </h3>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {oxidationNumbers.map((ox) => (
                  <div 
                    key={ox.element}
                    className={`p-6 rounded-2xl border-2 flex items-center gap-6 ${
                      ox.type === 'oxidation' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'
                    }`}
                  >
                     <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg" style={{ backgroundColor: ATOM_COLORS[ox.element] || '#ccc' }}>
                        {ox.element}
                     </div>
                     <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                          {ox.type === 'oxidation' ? 'Oxidation' : 'Reduction'}
                        </span>
                        <div className="text-lg font-black text-slate-800">
                          {ox.reactantState} <ArrowRight className="inline-block w-4 h-4 mx-1 opacity-30" /> {ox.productState}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 italic mt-1">{ox.electronChange}</div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-4">
           <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl h-full flex flex-col justify-between">
              <div>
                 <h3 className="text-lg font-black text-slate-900 uppercase mb-6">Conceptual Breakdown</h3>
                 <p className="text-slate-600 font-bold leading-relaxed mb-6">{currentReaction.explanation}</p>
                 <div className="space-y-3">
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                       <span className="text-[9px] font-black text-red-500 uppercase block mb-1">Losing e- (Oxidation)</span>
                       <p className="text-xs text-red-900 font-bold">{currentReaction.oxidationDesc}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                       <span className="text-[9px] font-black text-blue-500 uppercase block mb-1">Gaining e- (Reduction)</span>
                       <p className="text-xs text-blue-900 font-bold">{currentReaction.reductionDesc}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      {/* Feedback Alert */}
      <AnimatePresence>
        {feedback.message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border-2 ${
              feedback.type === 'error' ? 'bg-red-500 border-red-400 text-white' : 'bg-emerald-500 border-emerald-400 text-white'
            }`}
          >
            {feedback.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="font-black text-sm uppercase tracking-widest">{feedback.message}</span>
            <button onClick={clearFeedback} className="ml-4 opacity-50 hover:opacity-100">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RedoxVisualizer;
