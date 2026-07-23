// ═══════════════════════════════════════════════════
//  Input validation helpers
// ═══════════════════════════════════════════════════

/**
 * Validate a number for use in HCF/LCM calculations
 * @param {string|number} value
 * @param {{ min?: number, max?: number }} options
 * @returns {{ valid: boolean, error: string|null, value: number|null }}
 */
export function validateNumber(value, { min = 2, max = 1000 } = {}) {
  const num = parseInt(value);

  if (value === '' || value === null || value === undefined) {
    return { valid: false, error: null, value: null }; // empty — neutral
  }

  if (isNaN(num)) {
    return { valid: false, error: 'Please enter a whole number', value: null };
  }

  if (!Number.isInteger(Number(value))) {
    return { valid: false, error: 'Must be a whole number (no decimals)', value: null };
  }

  if (num < min) {
    return { valid: false, error: `Minimum value is ${min}`, value: null };
  }

  if (num > max) {
    return { valid: false, error: `Maximum value is ${max}`, value: null };
  }

  return { valid: true, error: null, value: num };
}

/**
 * Validate a factor input for SplitDialog
 */
export function validateFactor(value) {
  return validateNumber(value, { min: 2, max: 999 });
}

/**
 * Validate two numbers are both valid and different
 */
export function validateNumberPair(n1, n2) {
  const v1 = validateNumber(n1);
  const v2 = validateNumber(n2);

  if (!v1.valid) return { valid: false, error: v1.error || 'Enter first number' };
  if (!v2.valid) return { valid: false, error: v2.error || 'Enter second number' };

  return { valid: true, error: null, n1: v1.value, n2: v2.value };
}
