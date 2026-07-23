import { useState, useCallback } from 'react';
import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { hcfFromFactors } from '../utils/math';

/**
 * useDragAndDrop — wraps dnd-kit for HCF playground
 */
export function useDragAndDrop(factors1 = [], factors2 = []) {
  // Items in common zone: array of { id, value, source }
  const [commonZone, setCommonZone] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || over.id !== 'common-zone') return;

    // Parse drag id: e.g., "f1-2-0" → source=f1, value=2, index=0
    const [source, valueStr, idxStr] = active.id.split('-');
    const value = parseInt(valueStr);
    const idx = parseInt(idxStr);

    // Check if this factor is already in common zone
    // Count how many of this value are already in common zone
    const alreadyInZone = commonZone.filter(c => c.value === value).length;

    // Max allowed = min occurrences in both arrays
    const countIn1 = factors1.filter(f => f === value).length;
    const countIn2 = factors2.filter(f => f === value).length;
    const maxAllowed = Math.min(countIn1, countIn2);

    if (alreadyInZone >= maxAllowed) return; // already at max

    const newItem = {
      id: `zone-${value}-${Date.now()}`,
      value,
      source,
      originalIdx: idx,
    };

    setCommonZone(prev => [...prev, newItem]);
  }, [commonZone, factors1, factors2]);

  const removeFromCommonZone = useCallback((itemId) => {
    setCommonZone(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearCommonZone = useCallback(() => {
    setCommonZone([]);
  }, []);

  // Calculate live HCF from what's in common zone
  const commonZoneFactors = commonZone.map(c => c.value);
  const currentHCF = commonZoneFactors.length > 0
    ? commonZoneFactors.reduce((acc, f) => acc * f, 1)
    : null;

  const correctHCF = hcfFromFactors(factors1, factors2);
  const isHCFCorrect = currentHCF === correctHCF && commonZoneFactors.length > 0;

  return {
    sensors,
    activeId,
    commonZone,
    currentHCF,
    correctHCF,
    isHCFCorrect,
    handleDragStart,
    handleDragEnd,
    removeFromCommonZone,
    clearCommonZone,
  };
}
