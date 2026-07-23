import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Info, FlaskConical, Flame, ArrowRight, Zap, Beaker } from 'lucide-react';
import useChemistryStore from '../../store/useChemistryStore';

const LabGlassware = ({ 
  color = "#3b82f6", 
  level = 50, 
  tilt = 0, 
  isBoiling = false, 
  pourStream = false, 
  precipitateColor = null,
  label = "",
  size = "md",
  className = ""
}) => {
  const dimensions = size === "lg" ? "w-32 h-40" : size === "sm" ? "w-16 h-24" : "w-24 h-32";
  
  return (
    <div className={`relative ${dimensions} flex flex-col items-center ${className}`}>
      <motion.div 
        animate={{ rotate: tilt }} 
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        style={{ originX: 0.95, originY: 0.05 }}
        className="relative w-full h-full z-10"
      >
        {/* Beaker Shape */}
        <div className="absolute inset-0 border-x-4 border-b-4 border-slate-400 rounded-b-2xl bg-white/20 backdrop-blur-md z-20 shadow-[inset_0_-10px_20px_rgba(255,255,255,0.4)]" />
        <div className="absolute -top-1 -left-1 -right-1 h-4 border-4 border-slate-400 rounded-[50%] z-20 bg-white/10" />
        
        {/* Liquid Content */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 overflow-hidden rounded-b-xl z-10" style={{ height: `calc(${level}% - 6px)` }}>
           <motion.div 
             animate={{ backgroundColor: color }}
             className="absolute inset-0"
           >
              <div className="absolute top-0 left-0 right-0 h-4 bg-white/30 rounded-[50%] -translate-y-1/2" />
              
              {/* Boiling Bubbles */}
              {isBoiling && (
                <div className="absolute inset-0">
                  {[...Array(15)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 80, x: Math.random() * 80, opacity: 0, scale: 0.2 }}
                      animate={{ y: -40, opacity: [0, 1, 0], scale: [0.2, 1.2, 0.5] }}
                      transition={{ duration: 0.8 + Math.random(), repeat: Infinity, delay: Math.random() * 2 }}
                      className="absolute w-2 h-2 bg-white/40 rounded-full blur-[1px]"
                    />
                  ))}
                </div>
              )}

              {/* Precipitate settling */}
              {precipitateColor && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '35%', opacity: 1 }}
                  transition={{ delay: 1, duration: 3 }}
                  className="absolute bottom-0 left-0 right-0 flex items-end justify-center overflow-hidden"
                >
                  <div className="w-full h-full opacity-90" style={{ backgroundColor: precipitateColor }} />
                </motion.div>
              )}
           </motion.div>
        </div>

        {/* Fluid Liquid Pour Stream */}
        <AnimatePresence>
          {pourStream && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: -tilt }}
              exit={{ opacity: 0 }}
              className="absolute top-0 -right-2 w-4 z-0 pointer-events-none origin-top"
            >
               {/* Liquid stream droplets */}
               {[...Array(12)].map((_, i) => (
                 <motion.div
                   key={i}
                   initial={{ y: 0, scale: 1, opacity: 0 }}
                   animate={{ 
                     y: [0, 180], 
                     scale: [1, 1.1, 0.9, 1.1, 0.6],
                     opacity: [0, 1, 1, 0.8, 0] 
                   }}
                   transition={{ 
                     duration: 0.7, 
                     repeat: Infinity, 
                     delay: i * 0.06,
                     ease: "easeIn" 
                   }}
                   className="absolute left-1/2 -translate-x-1/2 w-3 h-5 rounded-full"
                   style={{ 
                     backgroundColor: color, 
                     boxShadow: `0 0 15px ${color}80`,
                     filter: "blur(0.5px)"
                   }}
                 />
               ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Visual Support (Advanced Burner) */}
      {isBoiling && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-20 flex flex-col items-center z-0"
        >
           <div className="relative">
              <motion.div 
                animate={{ 
                  scale: [1, 1.3, 0.9, 1.1], 
                  opacity: [0.7, 1, 0.8, 1],
                  y: [0, -5, 0]
                }} 
                transition={{ repeat: Infinity, duration: 0.6 }} 
                className="w-16 h-16 bg-orange-600 rounded-full blur-2xl absolute -top-6 -left-3" 
              />
              <Flame className="w-12 h-12 text-orange-500 relative z-10" fill="#f97316" />
           </div>
           {/* Removed unnecessary platform bar */}
           <div className="w-16 h-1 bg-orange-500/30 rounded-full mt-4 blur-sm" />
        </motion.div>
      )}

      {label && (
        <div className={`absolute ${isBoiling ? '-top-12' : '-bottom-14'} px-4 py-1.5 bg-slate-900 border-2 border-slate-700 rounded-xl font-black text-[10px] text-white uppercase tracking-[0.2em] whitespace-nowrap shadow-2xl z-30 transition-all duration-500`}>
          {label}
        </div>
      )}
    </div>
  );
};

const ReactionSimulator = ({ reactionType, reactionData }) => {
  const [stage, setStage] = useState('reactants'); // 'reactants' | 'animating' | 'products'
  const { isTeacherMode, explainMode, toggleExplainMode } = useChemistryStore();
  
  useEffect(() => {
    setStage('reactants');
  }, [reactionData]);

  const handleSimulate = () => {
    setStage('animating');
    setTimeout(() => {
      setStage('products');
    }, 3500); 
  };

  const isAnimating = stage === 'animating';
  const isProducts = stage === 'products';

  const renderSimulation = () => {
    switch (reactionType) {
      case 'combination':
        return (
          <div className="flex justify-center items-end gap-24 h-64 pb-12 relative">
            <motion.div
              animate={isAnimating ? { x: 120, y: -80, zIndex: 30 } : isProducts ? { opacity: 0, scale: 0.5 } : { x: 0 }}
              transition={{ duration: 1.5 }}
            >
               <LabGlassware 
                 color="#3b82f6" 
                 level={isAnimating ? 0 : 60} 
                 tilt={isAnimating ? 110 : 0} 
                 pourStream={isAnimating}
                 label={reactionData.reactants[0]} 
               />
            </motion.div>
            
            <motion.div animate={isAnimating || isProducts ? { x: -40 } : { x: 0 }}>
               <LabGlassware 
                 type="beaker"
                 color={isProducts ? "#8b5cf6" : "#ef4444"} 
                 level={isProducts ? 85 : 50} 
                 label={isProducts ? reactionData.products[0] : reactionData.reactants[1]}
                 size="lg"
               />
            </motion.div>
          </div>
        );

      case 'decomposition':
        return (
          <div className="flex justify-center items-end gap-24 h-64 pb-12 relative">
            <AnimatePresence>
              {!isProducts && (
                <motion.div exit={{ opacity: 0, scale: 0.8, y: 20 }}>
                  <LabGlassware 
                    color="#8b5cf6" 
                    level={isAnimating ? 30 : 80} 
                    isBoiling={isAnimating}
                    label={reactionData.reactants[0]} 
                    size="lg"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Improved Gas Bubbles for Decomposition */}

            {isProducts && (
              <div className="flex gap-16 items-end relative">
                <LabGlassware color="#ef4444" level={40} label={reactionData.products[0]} />
                
                {/* Enhanced Gas Liberation Area */}
                <motion.div 
                  initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  className="flex flex-col items-center justify-end h-48 relative"
                >
                  <div className="w-32 h-32 border-4 border-dashed border-white/10 rounded-full flex flex-col items-center justify-center relative overflow-visible bg-white/5 shadow-inner">
                     {/* Liberated Gas Bubbles */}
                     {[...Array(8)].map((_, i) => (
                       <motion.div
                         key={i}
                         initial={{ y: 20, x: Math.random() * 40 - 20, opacity: 0, scale: 0.5 }}
                         animate={{ 
                           y: -150, 
                           opacity: [0, 1, 1, 0],
                           scale: [0.5, 1.2, 1],
                           x: (Math.random() * 60 - 30) + (Math.sin(i) * 20)
                         }}
                         transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                         className="absolute w-10 h-10 rounded-full border-2 border-blue-400 bg-blue-100/40 shadow-[0_0_15px_rgba(96,165,250,0.6)] flex items-center justify-center text-[10px] font-black text-blue-600 z-50"
                       >
                         {reactionData.products[1]}
                       </motion.div>
                     ))}
                  </div>
                  <span className="mt-4 px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black text-white uppercase tracking-widest">{reactionData.products[1]} (Gas)</span>
                </motion.div>
              </div>
            )}
          </div>
        );

      case 'displacement':
        return (
          <div className="flex justify-center items-end gap-16 h-64 pb-12 relative">
             <motion.div animate={isAnimating ? { x: 140, y: -60, zIndex: 30 } : isProducts ? { opacity: 0 } : {}}>
               <div className="flex flex-col items-center">
                 <motion.div 
                    animate={isAnimating ? { rotate: 45, scale: 0.8, opacity: 0 } : {}}
                    transition={{ duration: 1.5 }}
                    className="w-16 h-16 bg-slate-400 rounded-2xl shadow-xl flex items-center justify-center font-black text-white border-4 border-slate-500 mb-2"
                 >
                   {reactionData.reactants[0]}
                 </motion.div>
                 <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black text-white uppercase tracking-widest">{reactionData.reactants[0]} (Solid)</span>
               </div>
             </motion.div>
             
             <motion.div animate={isAnimating || isProducts ? { x: -40 } : {}}>
               <LabGlassware 
                 type="beaker"
                 color={isProducts ? "#10b981" : "#3b82f6"} 
                 level={70} 
                 label={isProducts ? reactionData.products[0] : reactionData.reactants[1]}
                 size="lg"
               />
             </motion.div>
             
             {isProducts && (
               <motion.div initial={{ opacity: 0, scale: 0.5, x: -20 }} animate={{ opacity: 1, scale: 1, x: 0 }}>
                 <div className="w-16 h-16 bg-orange-500 rounded-2xl shadow-xl flex items-center justify-center font-black text-white border-4 border-orange-600 mb-2">{reactionData.products[1]}</div>
                 <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black text-white uppercase tracking-widest">{reactionData.products[1]} (Solid)</span>
               </motion.div>
             )}
          </div>
        );

      case 'doubleDisplacement':
      case 'precipitation':
        return (
          <div className="flex justify-center items-end gap-16 h-64 pb-12 relative">
              <motion.div
                animate={isAnimating ? { x: 120, y: -80, zIndex: 30 } : isProducts ? { opacity: 0 } : {}}
                transition={{ duration: 1.5 }}
              >
                <LabGlassware 
                  color="rgba(147, 197, 253, 0.4)" 
                  level={isAnimating ? 0 : 50} 
                  tilt={isAnimating ? 110 : 0} 
                  pourStream={isAnimating}
                  label={reactionData.reactants[0]} 
                />
              </motion.div>
              
              <motion.div animate={isAnimating || isProducts ? { x: -40 } : {}}>
                <LabGlassware 
                  color="rgba(147, 197, 253, 0.4)" 
                  level={isProducts ? 80 : 40} 
                  precipitateColor={isProducts ? (reactionType === 'precipitation' ? "#FDE047" : "#8B5CF6") : null} 
                  label={isProducts ? "Reaction Mixture" : reactionData.reactants[1]}
                  size="lg"
                />
              </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  const getConceptExplanation = () => {
    switch (reactionType) {
      case 'combination': return {
        def: "Two or more reactants combine to form a single product.",
        what: `Reactant ${reactionData.reactants[0]} and Reactant ${reactionData.reactants[1]} merge to form ${reactionData.products[0]}.`,
        why: "Think of it as A + B → AB. Multiple things becoming one."
      };
      case 'decomposition': return {
        def: "A single compound breaks down into simpler substances.",
        what: `Compound ${reactionData.reactants[0]} splits into ${reactionData.products[0]} and ${reactionData.products[1]}.`,
        why: "Energy (like heat) is used to break the compound apart."
      };
      case 'displacement': return {
        def: "A more reactive element takes the place of a less reactive one.",
        what: `${reactionData.reactants[0]} replaces ${reactionData.products[1]} in the solution.`,
        why: "The stronger element pushes out the weaker one."
      };
      case 'doubleDisplacement': return {
        def: "Two compounds exchange their parts to form new compounds.",
        what: "The reactants swap partners with each other.",
        why: "Like partners swapping in a dance to form new pairs."
      };
      case 'precipitation': return {
        def: "Two solutions react to form an insoluble solid.",
        what: "A solid 'precipitate' forms and settles at the bottom.",
        why: "The new product cannot dissolve in water, so it becomes visible."
      };
      default: return {};
    }
  };

  const explanation = getConceptExplanation();

  return (
    <div className="flex flex-col gap-8">
      {/* Header Info */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
         <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{reactionData.name}</h2>
            <div className="flex items-center gap-3 mt-2">
               <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                 {reactionData.equation}
               </span>
               <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                 {reactionType}
               </span>
            </div>
         </div>
         <div className="flex gap-3">
            <button 
              onClick={() => setStage('reactants')} 
              className="p-3 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
            >
              <RotateCcw className="w-5 h-5 text-slate-600" />
            </button>
            <button 
              onClick={handleSimulate}
              disabled={isAnimating || isProducts}
              className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl ${isAnimating || isProducts ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 shadow-indigo-600/20'}`}
            >
              <Play className="w-4 h-4 fill-current" />
              Simulate
            </button>
         </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Simulation Panel - Full Width */}
        <div className="card p-12 bg-slate-900 relative overflow-hidden text-white min-h-[500px] flex flex-col justify-center shadow-2xl border-white/5 rounded-[3rem]">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
          
          {/* Legend */}
          {/* Legend removed as requested */}

          <div className="relative z-10 flex items-center justify-center">
            {renderSimulation()}
          </div>

          {isAnimating && (
             <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[1em] animate-pulse mb-3">REACTION IN PROGRESS</div>
                <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
                   <motion.div 
                    initial={{ x: '-100%' }} animate={{ x: '0%' }} transition={{ duration: 3.5, ease: "linear" }}
                    className="w-full h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                   />
                </div>
             </div>
          )}
        </div>

        {/* Observation Panel - Improved Content & Spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
          <div className="card p-8 bg-white shadow-xl border-slate-100 rounded-[2.5rem] flex flex-col justify-between hover:border-indigo-200 transition-all">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Info className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Reaction Summary</h3>
              </div>
              <p className="text-slate-800 font-bold leading-relaxed">{explanation.def}</p>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 italic text-[10px] text-slate-500 font-black uppercase tracking-widest">
               Core Principle
            </div>
          </div>

          <div className="card p-8 bg-white shadow-xl border-slate-100 rounded-[2.5rem] flex flex-col justify-between hover:border-amber-200 transition-all">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Key Observation</h3>
              </div>
              <p className="text-slate-800 font-medium leading-relaxed">{explanation.what}</p>
            </div>
            <div className="mt-6 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
               <p className="text-xs text-amber-900 font-bold italic leading-snug">"{explanation.why}"</p>
            </div>
          </div>

          <div className="card p-8 bg-white shadow-xl border-slate-100 rounded-[2.5rem] flex flex-col justify-center items-center text-center relative overflow-hidden group md:col-span-2 lg:col-span-1">
             <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 mb-6 z-10">Molecular Change</span>
             <div className="flex flex-col items-center gap-4 z-10">
                <div className="text-xl font-mono font-black tracking-tighter text-slate-800">
                   {reactionData.equation.split('→')[0]}
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-12 h-0.5 bg-slate-200 rounded-full" />
                   <ArrowRight className={`w-6 h-6 ${isAnimating ? 'text-indigo-500 animate-pulse' : 'text-slate-400'}`} />
                   <div className="w-12 h-0.5 bg-slate-200 rounded-full" />
                </div>
                <div className={`text-2xl font-mono font-black tracking-tight ${stage === 'products' ? 'text-emerald-600' : 'text-slate-400'}`}>
                   {reactionData.equation.split('→')[1]}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReactionSimulator;
