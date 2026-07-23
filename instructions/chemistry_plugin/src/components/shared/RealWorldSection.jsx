import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Lightbulb, ChevronRight } from 'lucide-react';

const RealWorldSection = ({ title, items }) => {
  return (
    <div className="mt-12 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-50 rounded-xl">
          <Globe size={24} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Where is this used in real life?</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5 }}
            className="group card p-6 bg-white hover:shadow-xl hover:shadow-emerald-500/5 transition-all cursor-default border-slate-100 hover:border-emerald-100"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-50 rounded-2xl text-emerald-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                {item.icon || <Lightbulb size={20} />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">{item.title}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.description}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight size={16} className="text-emerald-300" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RealWorldSection;
