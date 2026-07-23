import { create } from 'zustand';
import useGlobalStore from './globalStore';
import { checkDecimalType, getPrimeFactors } from '../utils/irrationalLogic';

const useIrrationalStore = create((set, get) => ({
  // Number DNA Lab State
  dnaStep: 1, // 1: Input, 2: Factorize, 3: Predict, 4: Result
  dnaInput: null, // { type: 'fraction' | 'root' | 'whole', value: string, num: number, den: number }
  dnaFactors: [],
  targetFactors: [],
  dnaPrediction: null,
  dnaFeedback: null,

  // Pattern Finder State
  patternString: '',
  patternSelection: '',
  patternFeedback: null,
  patternAttempts: 0,

  // Actions for DNA Lab
  setDnaInput: (inputObj) => set({ 
    dnaInput: inputObj, 
    dnaStep: 2, 
    dnaFactors: [], 
    targetFactors: inputObj.den ? getPrimeFactors(inputObj.den) : [],
    dnaPrediction: null,
    dnaFeedback: null
  }),

  addFactor: (factor) => set((state) => {
    if (state.dnaStep !== 2) return state;
    
    // Check if adding this factor is valid
    const currentProduct = state.dnaFactors.reduce((a, b) => a * b, 1);
    const newProduct = currentProduct * factor;
    
    if (state.dnaInput.den % newProduct !== 0) {
      return { dnaFeedback: { type: 'error', message: 'That factor does not divide the remaining number.' } };
    }

    const newFactors = [...state.dnaFactors, factor].sort((a, b) => a - b);
    const isComplete = newProduct === state.dnaInput.den;

    if (isComplete) {
      useGlobalStore.getState().addXP(50); // Award XP for correct factorization
      return { 
        dnaFactors: newFactors, 
        dnaStep: 3, 
        dnaFeedback: { type: 'success', message: 'Correct factorization! Now, predict the decimal type.' } 
      };
    }

    return { 
      dnaFactors: newFactors, 
      dnaFeedback: null 
    };
  }),

  removeFactor: (index) => set((state) => {
    if (state.dnaStep !== 2) return state;
    const newFactors = [...state.dnaFactors];
    newFactors.splice(index, 1);
    return { dnaFactors: newFactors, dnaFeedback: null };
  }),

  setPrediction: (prediction) => set({ dnaPrediction: prediction }),

  validatePrediction: () => set((state) => {
    if (!state.dnaInput || !state.dnaPrediction) return state;

    const actualType = checkDecimalType(state.dnaInput);
    const isCorrect = state.dnaPrediction === actualType;

    if (isCorrect) {
      useGlobalStore.getState().addXP(100); // Award XP for correct prediction
      return { 
        dnaStep: 4, 
        dnaFeedback: { 
          type: 'success', 
          message: `Correct! It is a ${actualType} decimal.`,
          actualType
        } 
      };
    } else {
      return { 
        dnaFeedback: { 
          type: 'error', 
          message: `Not quite. Think about the prime factors in the denominator.` 
        } 
      };
    }
  }),

  resetDnaLab: () => set({
    dnaStep: 1,
    dnaInput: null,
    dnaFactors: [],
    targetFactors: [],
    dnaPrediction: null,
    dnaFeedback: null
  }),

  // Actions for Pattern Finder
  setPatternString: (str) => set({ 
    patternString: str, 
    patternSelection: '', 
    patternFeedback: null,
    patternAttempts: 0 
  }),

  setPatternSelection: (selection) => set({ patternSelection: selection }),

  checkPattern: () => set((state) => {
    if (!state.patternSelection) return state;
    
    const attempts = state.patternAttempts + 1;
    const cleanStr = state.patternString.replace(/\.\.\./g, '');
    const selection = state.patternSelection;

    // A more robust check: does the string contain the selection multiple times in a row?
    // Or is the string composed of this selection repeating?
    const decimalPart = cleanStr.split('.')[1] || '';
    
    // Check if the selection repeats in the decimal part
    const isCorrect = decimalPart.includes(selection.repeat(2));
    
    if (isCorrect && selection.length > 0) {
      useGlobalStore.getState().addXP(75);
      return { 
        patternAttempts: attempts,
        patternFeedback: { type: 'success', message: `Great job! "${selection}" is the repeating pattern.` } 
      };
    }

    // Dynamic Hints
    let hint = "Pattern breaks here.";
    if (selection.length > 10) hint = "Try a smaller chunk.";
    else if (attempts > 2) hint = "Look for a repeating sequence.";

    // Irrational check
    if (decimalPart.length > 20 && !decimalPart.includes(selection.repeat(2)) && attempts > 1) {
       // Check if it's likely irrational (no small repeating block)
       // This is heuristic for the UI
       if (decimalPart.startsWith('414213')) {
         hint = "No repeating pattern found → This is an Irrational Number!";
       }
    }

    return { 
      patternAttempts: attempts,
      patternFeedback: { type: 'error', message: hint } 
    };
  })
}));

export default useIrrationalStore;
