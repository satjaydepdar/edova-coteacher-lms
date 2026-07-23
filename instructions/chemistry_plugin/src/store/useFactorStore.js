import { create } from 'zustand';
import { isPrime } from '../utils/factorLogic';

const createNode = (value, parentId = null) => ({
  id: Math.random().toString(36).substr(2, 9),
  value,
  parentId,
  left: null,
  right: null,
  isPrimes: isPrime(value),
});

export const useFactorStore = create((set, get) => ({
  number: null,
  activePath: 'A', // 'A' or 'B'
  paths: {
    A: { root: null, isComplete: false },
    B: { root: null, isComplete: false },
  },
  currentStep: 0,
  history: [],

  setNumber: (num) => {
    const rootA = createNode(num);
    const rootB = createNode(num);
    set({
      number: num,
      activePath: 'A',
      paths: {
        A: { root: rootA, isComplete: isPrime(num) },
        B: { root: rootB, isComplete: isPrime(num) },
      },
      currentStep: 0,
    });
  },

  setActivePath: (path) => set({ activePath: path }),

  splitNode: (nodeId, f1, f2) => {
    const { paths, activePath } = get();
    const currentPath = paths[activePath];
    
    const updateTree = (node) => {
      if (!node) return null;
      if (node.id === nodeId) {
        return {
          ...node,
          left: createNode(f1, nodeId),
          right: createNode(f2, nodeId),
        };
      }
      return {
        ...node,
        left: updateTree(node.left),
        right: updateTree(node.right),
      };
    };

    const newRoot = updateTree(currentPath.root);
    
    // Check if path is complete (all leaves are prime)
    const checkComplete = (node) => {
      if (!node.left && !node.right) return node.isPrimes;
      return checkComplete(node.left) && checkComplete(node.right);
    };

    const isComplete = checkComplete(newRoot);

    set({
      paths: {
        ...paths,
        [activePath]: { root: newRoot, isComplete },
      },
    });
  },

  reset: () => set({ number: null, paths: { A: { root: null, isComplete: false }, B: { root: null, isComplete: false } }, activePath: 'A' }),
}));
