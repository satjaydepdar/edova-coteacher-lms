import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { REAL_WORLD_EFFECTS } from '../../utils/chemistryLogic';
import useChemistryStore from '../../store/useChemistryStore';
import { Droplets, Wind, ThermometerSun, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';

const RealWorldSection = () => {
  const { environmentConditions, setEnvironmentConditions } = useChemistryStore();
  const { oxygenPresent, moistureLevel, hasAntioxidant, oxygenLevel } = environmentConditions;

  const handleToggleOxygen = () => setEnvironmentConditions({ oxygenPresent: !oxygenPresent });
  const handleToggleAntioxidant = () => setEnvironmentConditions({ hasAntioxidant: !hasAntioxidant });
  const handleMoistureChange = (e) => setEnvironmentConditions({ moistureLevel: parseInt(e.target.value) });
  const handleOxygenLevelChange = (e) => setEnvironmentConditions({ oxygenLevel: parseInt(e.target.value) });

  // Calculate rust level based on conditions
  const rustLevel = oxygenPresent ? Math.min(100, moistureLevel * 1.5) : 0;
  
  // Calculate rancidity based on oxygen and antioxidants
  const rancidLevel = oxygenPresent && !hasAntioxidant ? 80 : oxygenPresent && hasAntioxidant ? 20 : 0;

  // Calculate combustion based on oxygen level
  const combustionIntensity = oxygenLevel / 100;

  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">2. Real-World Effects of Oxidation</h2>
      <p className="text-slate-600 mb-8">Interact with the environmental factors to see how oxidation affects everyday materials.</p>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        
        {/* Controls Panel */}
        <div className="xl:col-span-1 bg-slate-50 p-6 rounded-2xl border border-slate-200 h-fit sticky top-24">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <ThermometerSun className="w-5 h-5 text-amber-500" />
            Environment Controls
          </h3>

          <div className="space-y-0">
            {/* Group: Primary Factors */}
            <div className="pb-6 border-b border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <Wind className="w-4 h-4 text-blue-500" /> Oxygen Presence
                </label>
                <div className="flex items-center">
                  <div 
                    className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${oxygenPresent ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    onClick={handleToggleOxygen}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${oxygenPresent ? 'translate-x-7' : 'translate-x-1'}`} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Required for most oxidation processes.</p>
            </div>

            {/* Group: Corrosion Factors */}
            <div className="py-6 border-b border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-400" /> Moisture Level
                </label>
                <span className="text-xs font-black px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">{moistureLevel}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={moistureLevel} onChange={handleMoistureChange}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-2"
              />
              <p className="text-[10px] text-slate-500 font-medium">Accelerates the rusting of metals.</p>
            </div>

            {/* Group: Protection Factors */}
            <div className="py-6 border-b border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Antioxidants
                </label>
                <div className="flex items-center">
                  <div 
                    className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${hasAntioxidant ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    onClick={handleToggleAntioxidant}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${hasAntioxidant ? 'translate-x-7' : 'translate-x-1'}`} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Prevents rancidity in fatty foods.</p>
            </div>

            {/* Group: Intensity Factors */}
            <div className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-black text-slate-700 flex items-center gap-2">
                  <Wind className="w-4 h-4 text-sky-400" /> O₂ Concentration
                </label>
                <span className="text-xs font-black px-2 py-1 bg-sky-50 text-sky-600 rounded-lg">{oxygenLevel}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={oxygenLevel} onChange={handleOxygenLevelChange}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500 mb-2"
              />
              <p className="text-[10px] text-slate-500 font-medium">Increases the rate of combustion.</p>
            </div>
          </div>
        </div>

        {/* Simulations */}
        <div className="xl:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Corrosion Simulation */}
          <div className="border border-slate-200 rounded-2xl p-6 relative flex flex-col">
            <h4 className="font-bold text-slate-800 mb-2">{REAL_WORLD_EFFECTS.corrosion.title}</h4>
            <div className="h-40 mb-4 relative rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border-4 border-slate-300">
              <div className="w-3/4 h-8 bg-slate-400 relative rounded-sm shadow-inner overflow-hidden">
                <motion.div 
                  className="absolute inset-0 bg-orange-800 mix-blend-multiply opacity-0"
                  animate={{ opacity: rustLevel / 100 }}
                  transition={{ duration: 1 }}
                />
                <motion.div 
                  className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/rust.png')] opacity-0"
                  animate={{ opacity: rustLevel / 100 }}
                  transition={{ duration: 1 }}
                />
              </div>
              
              <AnimatePresence>
                {oxygenPresent && moistureLevel > 20 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                      <motion.div 
                        key={i} className="absolute w-2 h-2 rounded-full bg-blue-400/50"
                        initial={{ x: Math.random() * 200, y: -20 }}
                        animate={{ y: 150, x: Math.random() * 200 }}
                        transition={{ repeat: Infinity, duration: 2 + Math.random() * 2, ease: "linear" }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="text-sm mt-auto">
              <div className="flex items-center gap-1 font-bold text-orange-700 mb-1">
                <AlertTriangle className="w-4 h-4" /> Rust Level: {Math.round(rustLevel)}%
              </div>
              <p className="text-slate-600 text-xs mb-2">{REAL_WORLD_EFFECTS.corrosion.description}</p>
            </div>
          </div>

          {/* Rancidity Simulation */}
          <div className="border border-slate-200 rounded-2xl p-6 relative flex flex-col">
            <h4 className="font-bold text-slate-800 mb-2">{REAL_WORLD_EFFECTS.rancidity.title}</h4>
            <div className="h-40 mb-4 relative rounded-xl overflow-hidden bg-yellow-50 flex items-center justify-center border-4 border-yellow-100">
              <motion.div 
                className="w-20 h-20 rounded-2xl bg-yellow-400 shadow-md relative overflow-hidden transition-colors duration-1000 flex items-center justify-center text-white/50 font-black"
                animate={{ 
                  backgroundColor: rancidLevel > 50 ? '#b45309' : '#facc15',
                  scale: rancidLevel > 50 ? 0.95 : 1
                }}
              >
                OIL
              </motion.div>
            </div>
            
            <div className="text-sm mt-auto">
              <div className={`flex items-center gap-1 font-bold mb-1 ${rancidLevel > 50 ? 'text-red-600' : 'text-emerald-600'}`}>
                <AlertTriangle className="w-4 h-4" /> Condition: {rancidLevel > 50 ? 'Spoiled/Rancid' : 'Fresh'}
              </div>
              <p className="text-slate-600 text-xs mb-2">{REAL_WORLD_EFFECTS.rancidity.description}</p>
            </div>
          </div>

          {/* Combustion Simulation */}
          <div className="border border-slate-200 rounded-2xl p-6 relative flex flex-col">
            <h4 className="font-bold text-slate-800 mb-2">Combustion (Burning)</h4>
            <div className="h-40 mb-4 relative rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border-4 border-slate-800">
               {/* Wood Log */}
               <div className="absolute bottom-4 w-24 h-6 bg-[#654321] rounded-sm border-b-4 border-[#3e2723]">
                  <div className="absolute top-1 bottom-1 left-2 right-2 border-y border-black/20" />
               </div>
               
               {/* Fire Animation */}
               <AnimatePresence>
                 {combustionIntensity > 0 && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0 }}
                     animate={{ opacity: 1, scale: combustionIntensity * 1.5 }}
                     className="absolute bottom-8 flex justify-center items-end"
                   >
                     <motion.div animate={{ scale: [1, 1.1, 0.9, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-16 h-20 bg-orange-500 rounded-full blur-md opacity-80 mix-blend-screen" />
                     <motion.div animate={{ scale: [1, 0.9, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.4 }} className="absolute w-12 h-16 bg-yellow-400 rounded-full blur-sm opacity-90 mix-blend-screen pb-4" />
                     <motion.div animate={{ scale: [1, 1.2, 0.8, 1] }} transition={{ repeat: Infinity, duration: 0.3 }} className="absolute w-6 h-10 bg-white rounded-full blur-sm opacity-100 mix-blend-screen pb-6" />
                   </motion.div>
                 )}
               </AnimatePresence>
               
               {/* Smoke */}
               {combustionIntensity > 0 && (
                 <motion.div className="absolute inset-0 pointer-events-none flex justify-center">
                   {[...Array(3)].map((_, i) => (
                     <motion.div 
                       key={i}
                       initial={{ opacity: 0, y: 50, scale: 0.5 }}
                       animate={{ opacity: [0, 0.5, 0], y: -100, scale: 2 }}
                       transition={{ repeat: Infinity, duration: 2 + i, delay: i * 0.5 }}
                       className="absolute bottom-16 w-12 h-12 bg-white/10 rounded-full blur-xl"
                     />
                   ))}
                 </motion.div>
               )}
            </div>
            
            <div className="text-sm mt-auto">
              <div className={`flex items-center gap-1 font-bold mb-1 ${combustionIntensity > 0 ? 'text-orange-500' : 'text-slate-500'}`}>
                <Flame className="w-4 h-4" /> Intensity: {Math.round(oxygenLevel)}%
              </div>
              <p className="text-slate-600 text-xs mb-2">Combustion requires oxygen. Higher O₂ concentration increases fire intensity.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RealWorldSection;
