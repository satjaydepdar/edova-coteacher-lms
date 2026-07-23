import { create } from 'zustand';
import { triggerEvent } from '../utils/pluginEvents';

const useChemistryStore = create((set, get) => ({
  // Equation Builder State
  selectedReactants: [],
  selectedProducts: [],
  equationState: 'building', // 'building' | 'balancing' | 'balanced'
  coefficients: {},
  atomBalance: {},

  // Reaction Type State
  reactionType: null,
  currentReaction: null,
  reactionStep: 0,

  // Redox State
  redoxState: {
    oxidizedSpecies: null,
    reducedSpecies: null,
    oxygenTransfer: false,
    hydrogenTransfer: false,
  },

  // Environment conditions (for real-world simulations)
  environmentConditions: {
    oxygenPresent: true,
    oxygenLevel: 21,
    moistureLevel: 50,
    temperature: 25,
    hasAntioxidant: false,
  },

  // Feedback
  feedback: { type: null, message: '' },

  // Global Modes
  isTeacherMode: false,
  explainMode: false,
  toggleTeacherMode: () => set((state) => ({ isTeacherMode: !state.isTeacherMode })),
  toggleExplainMode: () => set((state) => ({ explainMode: !state.explainMode })),

  // === Equation Actions ===
  setReactants: (reactants) => set({ selectedReactants: reactants }),
  setProducts: (products) => set({ selectedProducts: products }),

  updateCoefficients: (id, value) =>
    set((state) => {
      const newCoefficients = { ...state.coefficients, [id]: Math.max(1, value) };
      return { coefficients: newCoefficients };
    }),

  calculateBalance: () => {
    const state = get();
    const { selectedReactants, selectedProducts, coefficients } = state;

    const countAtoms = (species, side) => {
      const counts = {};
      species.forEach((s) => {
        const coeff = coefficients[`${side}_${s.id}`] || 1;
        if (s.atoms) {
          Object.entries(s.atoms).forEach(([atom, count]) => {
            counts[atom] = (counts[atom] || 0) + count * coeff;
          });
        }
      });
      return counts;
    };

    const reactantAtoms = countAtoms(selectedReactants, 'r');
    const productAtoms = countAtoms(selectedProducts, 'p');

    const allAtoms = new Set([...Object.keys(reactantAtoms), ...Object.keys(productAtoms)]);
    const balance = {};
    let isBalanced = true;

    allAtoms.forEach((atom) => {
      const r = reactantAtoms[atom] || 0;
      const p = productAtoms[atom] || 0;
      balance[atom] = { reactant: r, product: p, balanced: r === p };
      if (r !== p) isBalanced = false;
    });

    set({ atomBalance: balance });
    return isBalanced;
  },

  submitBalanceCheck: () => {
    const isBalanced = get().calculateBalance();
    
    set({
      equationState: isBalanced ? 'balanced' : 'balancing',
      feedback: isBalanced
        ? { type: 'success', message: '🎉 Equation is perfectly balanced!' }
        : { type: 'error', message: '❌ Not balanced yet. Check the atom counts!' },
    });
    
    if (isBalanced) {
      triggerEvent('onChapterComplete', {
        chapter: 'chemical-equations',
        score: 100
      });
      triggerEvent('onProgressUpdate', {
        chapter: 'chemical-equations',
        progress: 1.0
      });
    }
    
    return isBalanced;
  },

  resetEquation: () =>
    set({
      selectedReactants: [],
      selectedProducts: [],
      equationState: 'building',
      coefficients: {},
      atomBalance: {},
      feedback: { type: null, message: '' },
    }),

  // === Reaction Type Actions ===
  setReactionType: (type) => set({ reactionType: type }),
  setCurrentReaction: (reaction) => set({ currentReaction: reaction, reactionStep: 0 }),
  nextReactionStep: () => set((state) => ({ reactionStep: state.reactionStep + 1 })),

  identifyReaction: (selectedType) => {
    const state = get();
    const isCorrect = selectedType === state.currentReaction?.type;
    set({
      feedback: isCorrect
        ? { type: 'success', message: `✅ Correct! This is a ${selectedType} reaction.` }
        : { type: 'error', message: `❌ Not quite. Try again!` },
    });
    if (isCorrect) {
      triggerEvent('onProgressUpdate', {
        chapter: 'reaction-types',
        progress: 0.5,
        identifiedType: selectedType
      });
    }
    return isCorrect;
  },

  // === Redox Actions ===
  setRedoxState: (redox) => set({ redoxState: { ...get().redoxState, ...redox } }),

  evaluateRedox: (answer) => {
    const isCorrect = answer.isCorrect;
    set({
      feedback: isCorrect
        ? { type: 'success', message: '✅ Correct identification of the redox process!' }
        : { type: 'error', message: '❌ Review the oxygen/hydrogen transfer direction.' },
    });
    if (isCorrect) {
      triggerEvent('onChapterComplete', {
        chapter: 'redox',
        score: 100
      });
      triggerEvent('onProgressUpdate', {
        chapter: 'redox',
        progress: 1.0
      });
    }
    return isCorrect;
  },

  // === Environment Actions ===
  setEnvironmentConditions: (conditions) =>
    set({ environmentConditions: { ...get().environmentConditions, ...conditions } }),

  // === Common ===
  setEquationState: (state) => set({ equationState: state }),
  setFeedback: (feedback) => set({ feedback }),
  clearFeedback: () => set({ feedback: { type: null, message: '' } }),
}));

export default useChemistryStore;
