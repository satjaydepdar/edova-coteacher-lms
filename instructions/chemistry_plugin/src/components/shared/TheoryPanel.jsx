import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, BookOpen, Lightbulb, Globe } from 'lucide-react';
import { calculateHCF, calculateLCM, primeFactorize, formatFactorization } from '../../utils/math';
import { REAL_WORLD_APPS } from '../../utils/constants';
import { slideUp } from '../../utils/animations';
import clsx from 'clsx';

function StepBlock({ number, title, children, highlight = false }) {
  return (
    <div className={clsx('border-l-2 pl-4 py-1', highlight ? 'border-blue-400' : 'border-slate-200')}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-xs font-bold text-blue-600">
          {number}
        </span>
        <span className="text-sm font-semibold text-slate-700">{title}</span>
      </div>
      <div className="text-sm text-slate-600 ml-7">{children}</div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-blue-500" />
          <span className="text-sm font-semibold text-slate-700">{title}</span>
        </div>
        {open
          ? <ChevronDown size={14} className="text-slate-400" />
          : <ChevronRight size={14} className="text-slate-400" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-slate-100">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TheoryPanel({ type, n1, n2, result }) {
  if (!n1 || !n2) return null;

  const factors1 = primeFactorize(n1);
  const factors2 = primeFactorize(n2);
  const fmt1 = formatFactorization(n1);
  const fmt2 = formatFactorization(n2);
  const hcf = calculateHCF(n1, n2);
  const lcm = calculateLCM(n1, n2);
  const apps = REAL_WORLD_APPS[type === 'HCF' ? 'hcf' : 'lcm'];

  return (
    <motion.div variants={slideUp} initial="hidden" animate="visible" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen size={18} className="text-blue-500" />
        <h3 className="font-bold text-slate-800">
          Finding {type} of {n1} and {n2}
        </h3>
        <span className="ml-auto text-2xl font-black text-blue-600">{result}</span>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Steps */}
      <div className="space-y-3">
        <CollapsibleSection title="Step 1: Prime Factorization" icon={BookOpen} defaultOpen>
          <div className="space-y-2 mt-2">
            <div className="bg-slate-50 rounded-xl px-4 py-3 font-mono text-sm border border-slate-100">
              <span className="text-blue-600 font-bold">{n1}</span>
              <span className="text-slate-500"> = </span>
              <span className="text-slate-800 font-semibold">{fmt1}</span>
              <span className="text-slate-400 ml-2 text-xs">({factors1.join(' × ')})</span>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 font-mono text-sm border border-slate-100">
              <span className="text-orange-600 font-bold">{n2}</span>
              <span className="text-slate-500"> = </span>
              <span className="text-slate-800 font-semibold">{fmt2}</span>
              <span className="text-slate-400 ml-2 text-xs">({factors2.join(' × ')})</span>
            </div>
          </div>
        </CollapsibleSection>

        {type === 'HCF' ? (
          <CollapsibleSection title="Step 2: Identify Common Prime Factors" icon={BookOpen} defaultOpen>
            <div className="mt-2 space-y-2 text-sm">
              <p className="text-slate-600">Take the <span className="text-blue-600 font-semibold">minimum power</span> of each common prime factor.</p>
              <div className="bg-emerald-50 rounded-xl px-4 py-3 font-mono border border-emerald-200">
                <span className="text-slate-600">HCF({n1}, {n2}) = {formatFactorization(hcf)} = </span>
                <span className="text-emerald-700 font-black text-lg">{hcf}</span>
              </div>
            </div>
          </CollapsibleSection>
        ) : (
          <CollapsibleSection title="Step 2: Identify All Prime Factors" icon={BookOpen} defaultOpen>
            <div className="mt-2 space-y-2 text-sm">
              <p className="text-slate-600">Take the <span className="text-orange-600 font-semibold">maximum power</span> of each prime factor from either number.</p>
              <div className="bg-emerald-50 rounded-xl px-4 py-3 font-mono border border-emerald-200">
                <span className="text-slate-600">LCM({n1}, {n2}) = {formatFactorization(lcm)} = </span>
                <span className="text-emerald-700 font-black text-lg">{lcm}</span>
              </div>
            </div>
          </CollapsibleSection>
        )}

        <CollapsibleSection title="Step 3: HCF × LCM Relationship" icon={Lightbulb}>
          <div className="mt-2 space-y-3">
            <p className="text-sm text-slate-600">HCF × LCM always equals the product of the two numbers.</p>
            <div className="bg-slate-50 rounded-xl px-4 py-3 font-mono text-sm border border-slate-100 text-slate-700">
              <span className="text-amber-600 font-bold">HCF</span>
              <span className="text-slate-500"> × </span>
              <span className="text-orange-600 font-bold">LCM</span>
              <span className="text-slate-500"> = {n1} × {n2}</span>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 font-mono text-sm border border-slate-100 text-slate-700">
              <span className="text-amber-600 font-bold">{hcf}</span>
              <span className="text-slate-500"> × </span>
              <span className="text-orange-600 font-bold">{lcm}</span>
              <span className="text-slate-500"> = </span>
              <span className="text-emerald-700 font-bold">{hcf * lcm}</span>
              <span className="text-slate-500"> = {n1} × {n2} = {n1 * n2} </span>
              {hcf * lcm === n1 * n2
                ? <span className="text-emerald-500">✓</span>
                : <span className="text-red-500">✗</span>}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Real-World Applications" icon={Globe}>
          <div className="mt-2 space-y-3">
            {apps.map((app, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">{app.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{app.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </motion.div>
  );
}
