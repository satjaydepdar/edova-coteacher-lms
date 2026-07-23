import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, CheckCircle2, Repeat, RefreshCw, ArrowRight } from 'lucide-react';
import useIrrationalStore from '../../store/useIrrationalStore';
import { getDecimalExpansion } from '../../utils/irrationalLogic';

const PRESETS = [
  { id: 1, label: '1/7', num: 1, den: 7, type: 'fraction' },
  { id: 2, label: '1/3', num: 1, den: 3, type: 'fraction' },
  { id: 3, label: '√2', rootVal: 2, type: 'root' },
];

const PatternFinder = () => {
  const { 
    patternString, patternSelection, patternFeedback,
    setPatternString, setPatternSelection, checkPattern
  } = useIrrationalStore();

  const [customType, setCustomType] = useState('fraction'); // fraction, root
  const [customNum, setCustomNum] = useState('');
  const [customDen, setCustomDen] = useState('');
  const [customRoot, setCustomRoot] = useState('');
  
  const [startIndex, setStartIndex] = useState(null);
  const [endIndex, setEndIndex] = useState(null);

  useEffect(() => {
    if (!patternString) {
      handleSelectPreset(PRESETS[0]);
    }
  }, []);

  const handleSelectPreset = (preset) => {
    const expansion = getDecimalExpansion(preset);
    setPatternString(expansion);
    resetSelection();
  };

  const handleCustomSubmit = () => {
    let expansion = '';
    if (customType === 'fraction') {
      if (!customNum || !customDen) return;
      expansion = getDecimalExpansion({
        type: 'fraction',
        num: parseInt(customNum),
        den: parseInt(customDen)
      });
    } else {
      if (!customRoot) return;
      expansion = getDecimalExpansion({
        type: 'root',
        rootVal: parseInt(customRoot)
      });
    }
    setPatternString(expansion);
    resetSelection();
  };

  const resetSelection = () => {
    setStartIndex(null);
    setEndIndex(null);
    setPatternSelection('');
  };

  const handleCharClick = (index) => {
    const decimalIndex = patternString.indexOf('.');
    if (index <= decimalIndex) return;
    if (patternString[index] === '.') return;
    if (patternString.slice(index, index + 3) === '...') return;

    if (startIndex === null || (startIndex !== null && endIndex !== null)) {
      setStartIndex(index);
      setEndIndex(index);
      setPatternSelection(patternString[index]);
    } else {
      const min = Math.min(startIndex, index);
      const max = Math.max(startIndex, index);
      setStartIndex(min);
      setEndIndex(max);
      setPatternSelection(patternString.slice(min, max + 1));
    }
  };

  return (
    <div className="card bg-white shadow-sm flex flex-col h-full border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          <Search size={20} />
        </div>
        <h2 className="text-xl font-black text-slate-800">Pattern Finder</h2>
      </div>

      <div className="p-6 space-y-8">
        {/* Presets */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(dec => (
              <button
                key={dec.id}
                onClick={() => handleSelectPreset(dec)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all"
              >
                {dec.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Custom Number</p>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex p-1 bg-slate-100 rounded-lg">
              <button 
                onClick={() => setCustomType('fraction')}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${customType === 'fraction' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
              >
                Fraction
              </button>
              <button 
                onClick={() => setCustomType('root')}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${customType === 'root' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
              >
                Root
              </button>
            </div>

            <div className="flex items-center gap-2">
              {customType === 'fraction' ? (
                <>
                  <input 
                    type="number" 
                    placeholder="Num" 
                    value={customNum}
                    onChange={(e) => setCustomNum(e.target.value)}
                    className="w-16 px-2 py-1.5 text-center font-bold border border-slate-200 rounded-lg outline-none focus:border-primary"
                  />
                  <span className="font-bold text-slate-400">/</span>
                  <input 
                    type="number" 
                    placeholder="Den" 
                    value={customDen}
                    onChange={(e) => setCustomDen(e.target.value)}
                    className="w-16 px-2 py-1.5 text-center font-bold border border-slate-200 rounded-lg outline-none focus:border-primary"
                  />
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-xl font-bold text-slate-400">√</span>
                  <input 
                    type="number" 
                    placeholder="Value" 
                    value={customRoot}
                    onChange={(e) => setCustomRoot(e.target.value)}
                    className="w-20 px-2 py-1.5 font-bold border border-slate-200 rounded-lg outline-none focus:border-primary"
                  />
                </div>
              )}
              <button 
                onClick={handleCustomSubmit}
                className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Display Area */}
        <div className="pt-4 space-y-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Decimal Expansion</p>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 relative">
            <div className="flex flex-wrap justify-center font-mono text-2xl font-black text-slate-400 gap-y-2">
              {patternString.split('').map((char, index) => {
                const decimalIndex = patternString.indexOf('.');
                const isSelectable = index > decimalIndex && char !== '.' && !patternString.slice(index, index + 3).includes('...');
                const isSelected = startIndex !== null && endIndex !== null && index >= startIndex && index <= endIndex;
                
                return (
                  <span 
                    key={index}
                    onClick={() => handleCharClick(index)}
                    className={`
                      transition-all select-none
                      ${isSelectable ? 'cursor-pointer hover:text-primary' : ''}
                      ${isSelected ? 'text-primary bg-primary/10 px-0.5 rounded -mx-0.5 relative z-10' : ''}
                      ${char === '.' ? 'mx-1 text-slate-600' : ''}
                    `}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
            {startIndex !== null && (
              <button 
                onClick={resetSelection}
                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text"
                placeholder="Selected pattern..."
                value={patternSelection}
                onChange={(e) => setPatternSelection(e.target.value)}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-700 outline-none focus:border-primary"
              />
              <button
                onClick={checkPattern}
                disabled={!patternSelection}
                className="btn-primary px-8 py-3 disabled:opacity-40"
              >
                <Repeat size={18} /> Check Pattern
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center font-medium italic">Click digits above or type manually to identify the repeating block.</p>
          </div>

          {/* Feedback */}
          <div className="h-16">
            <AnimatePresence mode="wait">
              {patternFeedback && (
                <motion.div
                  key={patternFeedback.message}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-xl border font-bold flex items-center gap-3 justify-center ${
                    patternFeedback.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                      : 'bg-amber-50 border-amber-100 text-amber-700'
                  }`}
                >
                  {patternFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {patternFeedback.message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatternFinder;
