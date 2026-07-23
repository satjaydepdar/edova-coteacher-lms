import { useState, useCallback } from 'react';
import { isPrime, primeFactorize } from '../utils/math';

let nodeIdCounter = 1;

function createNode(value, parentId = null, position = { x: 0, y: 0 }) {
  return {
    id: nodeIdCounter++,
    value,
    parentId,
    isPrime: isPrime(value),
    children: [],
    position,
  };
}

function buildInitialTree(number) {
  nodeIdCounter = 1;
  return [createNode(number, null, { x: 0, y: 0 })];
}

/**
 * useFactorTree — manages all factor tree state
 */
export function useFactorTree(initialNumber = null) {
  const [nodes, setNodes] = useState(initialNumber ? buildInitialTree(initialNumber) : []);
  const [history, setHistory] = useState([]); // for undo
  const [currentNumber, setCurrentNumber] = useState(initialNumber);

  const startTree = useCallback((number) => {
    const newNodes = buildInitialTree(number);
    setNodes(newNodes);
    setHistory([]);
    setCurrentNumber(number);
  }, []);

  const splitNode = useCallback((nodeId, factor1, factor2) => {
    const f1 = parseInt(factor1);
    const f2 = parseInt(factor2);

    setNodes(prev => {
      const parentNode = prev.find(n => n.id === nodeId);
      if (!parentNode || parentNode.children.length > 0) return prev;

      // Save snapshot for undo before mutating
      setHistory(h => [...h, prev]);

      const child1 = createNode(f1, nodeId);
      const child2 = createNode(f2, nodeId);

      return [
        ...prev.map(n => n.id === nodeId ? { ...n, children: [child1.id, child2.id] } : n),
        child1,
        child2,
      ];
    });
  }, []);

  const undoSplit = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setNodes(last);
      return prev.slice(0, -1);
    });
  }, []);

  const resetTree = useCallback(() => {
    if (currentNumber) {
      startTree(currentNumber);
    } else {
      setNodes([]);
      setHistory([]);
    }
  }, [currentNumber, startTree]);

  // Check if all leaf nodes are prime
  const isComplete = nodes.length > 0 && nodes.every(node =>
    node.isPrime || node.children.length > 0
  );

  // Get only leaf prime nodes
  const primeLeaves = nodes.filter(n => n.isPrime && n.children.length === 0);

  // Get unsplit composite leaves (nodes with no children, not prime)
  const compositeLeavesLeft = nodes.filter(n => !n.isPrime && n.children.length === 0);

  const canUndo = history.length > 0;

  return {
    nodes,
    currentNumber,
    startTree,
    splitNode,
    undoSplit,
    resetTree,
    isComplete,
    primeLeaves,
    compositeLeavesLeft,
    canUndo,
  };
}
