import React, { useEffect } from 'react';
import useChemistryStore from '../store/useChemistryStore';
import EquationBuilder from '../components/chemistry/EquationBuilder';
import BalancingLab from '../components/chemistry/BalancingLab';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Zap } from 'lucide-react';

const BalancingGuide = () => {
  const steps = [
    { icon: "1", title: "Count Atoms", desc: "Check how many atoms of each element are on both sides." },
    { icon: "2", title: "Metals First", desc: "Start by balancing metals like Fe, Mg, or Al." },
    { icon: "3", title: "Balance O & H", desc: "Balance Oxygen and Hydrogen atoms at the later stages." },
    { icon: "4", title: "Coefficients Only", desc: "Only change the big numbers in front, never the small subscripts." },
    { icon: "5", title: "Final Check", desc: "Re-verify that all atom counts match exactly on both sides." },
  ];

  return (
    <div className="flex flex-col gap-8 mb-12">
      {/* Intro Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="card p-8 bg-white border-slate-100 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Info className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Fundamentals</h3>
            </div>
            <div className="space-y-4">
              <p className="text-slate-800 font-bold leading-relaxed">
                A <span className="text-indigo-600 font-black">Chemical Equation</span> represents a chemical reaction using symbols. 
                A skeletal equation is unbalanced, while a balanced one satisfies the 
                <span className="text-indigo-600 font-black"> Law of Conservation of Mass</span>.
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Why balance?</p>
                 <p className="text-xs text-slate-700 font-bold italic">"Mass can neither be created nor destroyed in a chemical reaction."</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-8 bg-white border-slate-100 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16" />
           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Quick Reference Examples</h3>
           <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <span className="text-xs font-black uppercase tracking-widest text-slate-500">Water Formation</span>
                 <span className="font-mono font-black text-lg text-indigo-600">2H₂ + O₂ → 2H₂O</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <span className="text-xs font-black uppercase tracking-widest text-slate-500">Iron Oxidation</span>
                 <span className="font-mono font-black text-lg text-indigo-600">4Fe + 3O₂ → 2Fe₂O₃</span>
              </div>
           </div>
        </div>
      </div>

      {/* Step by Step Guide */}
      <div className="card p-8 bg-white border-slate-100 shadow-xl">
         <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-500" /> Step-by-Step Balancing Guide
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {steps.map((s) => (
              <div key={s.icon} className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all group">
                 <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-primary group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shadow-sm">
                    {s.icon}
                 </div>
                 <div>
                    <h4 className="text-[11px] font-black uppercase text-slate-900 mb-1">{s.title}</h4>
                    <p className="text-[10px] text-slate-700 font-bold leading-normal">{s.desc}</p>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

const ChemicalEquationsPage = () => {
  const { equationState, resetEquation } = useChemistryStore();

  // Reset state on mount
  useEffect(() => {
    resetEquation();
    return () => resetEquation();
  }, [resetEquation]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Chemical Equations</h1>
        <p className="text-slate-600">
          Learn how to write and balance chemical equations by adjusting coefficients to satisfy the Law of Conservation of Mass.
        </p>
      </div>

      <BalancingGuide />

      {equationState === 'building' && (
        <EquationBuilder onComplete={() => useChemistryStore.getState().setEquationState('balancing')} />
      )}

      {(equationState === 'balancing' || equationState === 'balanced') && (
        <BalancingLab onReset={resetEquation} />
      )}
    </motion.div>
  );
};

export default ChemicalEquationsPage;
