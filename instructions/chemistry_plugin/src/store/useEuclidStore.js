import { create } from 'zustand';
import { calculateEuclidSteps } from '../utils/euclidLogic';

const initialInteractiveState = {
  userQ: '',
  userR: '',
  stepResolved: false,
  feedback: null, // { type: "error" | "hint" | "success", message: string }
  userHCF: '',
  hcfResolved: false,
};

const useEuclidStore = create((set, get) => ({
  a: 0,
  b: 0,
  steps: [],
  currentStep: 0,
  isComplete: false, // true when we reach the end of the algorithm (r=0 step reached)

  ...initialInteractiveState,

  setInputs: (valA, valB) => {
    const a = Math.max(valA, valB);
    const b = Math.min(valA, valB);
    const steps = calculateEuclidSteps(a, b);
    set({
      a,
      b,
      steps,
      currentStep: 0,
      isComplete: false,
      ...initialInteractiveState
    });
  },

  setUserAnswers: (userQ, userR) => set({ userQ, userR }),

  checkAnswers: () => {
    const state = get();
    if (state.steps.length === 0) return;
    
    const step = state.steps[state.currentStep];
    const qGuess = parseInt(state.userQ, 10);
    const rGuess = parseInt(state.userR, 10);

    if (isNaN(qGuess) || isNaN(rGuess)) {
      set({ feedback: { type: 'error', message: 'Please enter valid numbers for quotient and remainder.' }});
      return;
    }

    if (qGuess === step.q && rGuess === step.r) {
      set({ 
        stepResolved: true, 
        feedback: { type: 'success', message: 'Correct!' },
        isComplete: state.currentStep === state.steps.length - 1 // if it's the last step
      });
    } else if (qGuess !== step.q) {
      set({ feedback: { type: 'hint', message: `Hint: How many times does ${step.b} fit into ${step.a}?` }});
    } else {
      set({ feedback: { type: 'hint', message: `Hint: The quotient is right, but what is the leftover remainder?` }});
    }
  },

  nextStep: () => set((state) => {
    if (state.currentStep < state.steps.length - 1 && state.stepResolved) {
      return { 
        currentStep: state.currentStep + 1,
        userQ: '',
        userR: '',
        stepResolved: false,
        feedback: null
      };
    }
    return state;
  }),

  setUserHCF: (userHCF) => set({ userHCF }),

  checkHCF: () => {
    const state = get();
    if (state.steps.length === 0) return;
    
    // The HCF is the divisor 'b' of the last step (where r=0)
    const finalStep = state.steps[state.steps.length - 1];
    const correctHCF = finalStep.b;
    const hcfGuess = parseInt(state.userHCF, 10);

    if (isNaN(hcfGuess)) {
      set({ feedback: { type: 'error', message: 'Please enter a valid number.' }});
      return;
    }

    if (hcfGuess === correctHCF) {
      set({ hcfResolved: true, feedback: { type: 'success', message: 'Correct! You found the HCF.' }});
    } else {
      set({ feedback: { type: 'error', message: 'Not quite. The HCF is the last non-zero remainder, or the divisor of the step where remainder becomes 0.' }});
    }
  },

  reset: () => set({ a: 0, b: 0, steps: [], currentStep: 0, isComplete: false, ...initialInteractiveState })
}));

export default useEuclidStore;
