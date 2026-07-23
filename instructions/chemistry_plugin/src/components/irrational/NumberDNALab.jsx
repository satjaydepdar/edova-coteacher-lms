import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, ArrowRight, CheckCircle2, AlertCircle, X, Check, Dna, Calculator } from 'lucide-react';
import useIrrationalStore from '../../store/useIrrationalStore';

const PRIME_BUTTONS = [2, 3, 5, 7, 11, 13, 17, 19];

const NumberDNALab = () => {
  const { 
    dnaStep, dnaInput, dnaFactors, targetFactors, dnaPrediction, dnaFeedback,
    setDnaInput, addFactor, removeFactor, setPrediction, validatePrediction, resetDnaLab
  } = useIrrationalStore();

  const [inputNum, setInputNum] = useState('');
  const [inputDen, setInputDen] = useState('');

  const handleStart = () => {
    if (!inputNum || !inputDen) return;
    setDnaInput({
      type: 'fraction',
      value: `${inputNum}/${inputDen}`,
      num: parseInt(inputNum),
      den: parseInt(inputDen)
    });
  };

  const currentProduct = dnaFactors.length > 0 ? dnaFactors.reduce((a, b) => a * b, 1) : 1;
  const remainingValue = dnaInput ? dnaInput.den / currentProduct : 0;

  return (
    <div className="card overflow-hidden bg-white shadow-sm flex flex-col h-full">
      <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3 text-primary">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Dna size={24} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-800">Number DNA Lab</h2>
        </div>
        
        {dnaStep > 1 && (
          <button 
            onClick={resetDnaLab}
            className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
          >
            Restart
          </button>
        )}
      </div>

      <div className="p-8 flex-1 flex flex-col items-center justify-center min-h-[400px] relative">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: INPUT */}
          {dnaStep === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Step 1</div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Enter a Fraction</h3>
                <p className="text-slate-500 font-medium text-sm">Let's discover its true identity.</p>
              </div>

              <div className="flex flex-col items-center gap-3 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <input
                  type="number"
                  value={inputNum}
                  onChange={(e) => setInputNum(e.target.value)}
                  placeholder="Numerator"
                  className="w-32 px-4 py-3 text-center text-xl font-black border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                />
                <div className="w-24 h-1 bg-slate-300 rounded-full my-2"></div>
                <input
                  type="number"
                  value={inputDen}
                  onChange={(e) => setInputDen(e.target.value)}
                  placeholder="Denominator"
                  className="w-32 px-4 py-3 text-center text-xl font-black border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                />
              </div>

              <button 
                onClick={handleStart}
                disabled={!inputNum || !inputDen || parseInt(inputDen) === 0}
                className="w-full btn-primary h-14 text-lg disabled:opacity-40"
              >
                Analyze DNA <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {/* STEP 2: FACTORIZE */}
          {dnaStep === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-lg flex flex-col items-center space-y-8"
            >
               <div className="text-center space-y-2">
                <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Step 2</div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Factorize the Denominator</h3>
                <p className="text-slate-500 font-medium text-sm">Find the prime factors of <span className="font-bold text-primary">{dnaInput.den}</span>.</p>
              </div>

              <div className="flex items-center justify-center gap-6 text-4xl font-black text-slate-300">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Target</span>
                  <div className="w-24 h-24 bg-white border-4 border-slate-100 rounded-3xl flex items-center justify-center text-slate-800 shadow-sm">
                    {dnaInput.den}
                  </div>
                </div>
                <span>=</span>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Remaining</span>
                  <div className="w-24 h-24 bg-primary/5 border-4 border-primary/20 rounded-3xl flex items-center justify-center text-primary shadow-sm">
                    {remainingValue}
                  </div>
                </div>
              </div>

              {dnaFeedback && dnaFeedback.type === 'error' && (
                <div className="text-red-500 bg-red-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                  <AlertCircle size={16} /> {dnaFeedback.message}
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-3 mt-4">
                <AnimatePresence>
                  {dnaFactors.map((factor, idx) => (
                    <motion.button
                      key={`f-${idx}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      onClick={() => removeFactor(idx)}
                      className="w-14 h-14 bg-indigo-50 border-2 border-indigo-200 text-indigo-700 rounded-2xl font-black text-xl flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors group relative"
                    >
                      <span>{factor}</span>
                      <div className="absolute inset-0 items-center justify-center hidden group-hover:flex bg-red-100/80 rounded-xl">
                        <X size={20} />
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
                {dnaFactors.length > 0 && <div className="w-14 h-14 flex items-center justify-center text-2xl font-black text-slate-300">&times;</div>}
                <div className="w-14 h-14 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center text-slate-300">?</div>
              </div>

              <div className="w-full bg-slate-50 p-6 rounded-3xl border border-slate-100 mt-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Prime Chips</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {PRIME_BUTTONS.map(p => (
                    <button
                      key={p}
                      onClick={() => addFactor(p)}
                      disabled={remainingValue < p}
                      className="w-12 h-12 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:hover:border-slate-200"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PREDICT */}
          {dnaStep === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1 mx-auto w-max">
                  <CheckCircle2 size={14} /> Factored Successfully
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Make a Prediction</h3>
              </div>

              <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-sm text-center">
                <p className="text-slate-500 font-medium mb-4">Denominator DNA:</p>
                <div className="flex justify-center gap-2 text-2xl font-black text-indigo-600 mb-6">
                  {dnaFactors.join(' × ')}
                </div>
                <p className="text-lg font-bold text-slate-800">What type of decimal will <span className="text-primary">{dnaInput.value}</span> produce?</p>
              </div>

              <div className="grid gap-4">
                {['Terminating', 'Repeating'].map(type => (
                  <button
                    key={type}
                    onClick={() => setPrediction(type)}
                    className={`p-5 rounded-2xl border-2 font-black text-lg transition-all ${
                      dnaPrediction === type 
                        ? 'border-primary bg-primary/5 text-primary shadow-md scale-[1.02]' 
                        : 'border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {dnaFeedback && dnaFeedback.type === 'error' && (
                <div className="text-red-500 bg-red-50 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 text-center justify-center">
                  <AlertCircle size={18} /> {dnaFeedback.message}
                </div>
              )}

              <button 
                onClick={validatePrediction}
                disabled={!dnaPrediction}
                className="w-full btn-primary h-14 text-lg disabled:opacity-40 mt-4"
              >
                Validate Prediction
              </button>
            </motion.div>
          )}

          {/* STEP 4: RESULT */}
          {dnaStep === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md text-center space-y-8"
            >
              <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
                <Check size={48} strokeWidth={3} />
              </div>

              <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Excellent!</h3>
                <p className="text-lg text-slate-600 font-medium">
                  <span className="font-bold text-primary">{dnaInput.value}</span> is indeed a <span className="font-bold text-emerald-600">{dnaPrediction}</span> decimal.
                </p>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">The Reasoning</div>
                <p className="text-slate-700 text-sm leading-relaxed font-medium">
                  The denominator's prime factors are <span className="font-bold text-indigo-600">{dnaFactors.join(', ')}</span>.
                  {dnaPrediction === 'Terminating' 
                    ? " Since they consist ONLY of 2s and/or 5s, the decimal will terminate perfectly."
                    : " Because there is a prime factor other than 2 or 5, the decimal will repeat infinitely."}
                </p>
              </div>

              <button 
                onClick={resetDnaLab}
                className="btn-primary w-full h-14 text-lg"
              >
                Try Another Number
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default NumberDNALab;
