import React from 'react';
import { Lightbulb, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const WhyRuleCard = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6 bg-white border-2 border-indigo-100 shadow-sm relative overflow-hidden"
    >
      <div className="absolute -top-6 -right-6 text-indigo-50/50">
        <Lightbulb size={120} />
      </div>
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Info size={20} />
        </div>
        <h2 className="text-lg font-black text-slate-800 tracking-tight">The Terminating Rule</h2>
      </div>
      
      <div className="relative z-10 bg-slate-50 p-5 rounded-2xl border border-slate-100">
        <p className="text-slate-700 text-sm leading-relaxed font-medium mb-3">
          A fraction <span className="font-bold text-slate-900">terminates</span> if its simplified denominator has prime factors of <span className="font-bold text-primary">only 2s and 5s</span>.
        </p>
        
        <div className="bg-white p-4 rounded-xl border border-indigo-100/50 text-center font-mono text-sm shadow-sm text-indigo-600 font-black">
          Denominator = 2ⁿ &times; 5ᵐ
        </div>
        
        <p className="text-slate-500 text-xs mt-3 leading-relaxed">
          If any other prime factor (like 3, 7, or 11) is present, the decimal will <span className="font-bold text-slate-700">repeat</span> forever.
        </p>
      </div>
    </motion.div>
  );
};

export default WhyRuleCard;
