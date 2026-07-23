// irrationalLogic.js

// Function to get prime factors of a number
export const getPrimeFactors = (n) => {
  const factors = [];
  let d = 2;
  while (n > 1) {
    while (n % d === 0) {
      factors.push(d);
      n /= d;
    }
    d++;
    if (d * d > n) {
      if (n > 1) {
        factors.push(n);
        break;
      }
    }
  }
  return factors;
};

// Check if a number is a perfect square
export const isPerfectSquare = (n) => {
  if (n < 0) return false;
  const root = Math.round(Math.sqrt(n));
  return root * root === n;
};

// Check decimal type based on input
// Input format: { type: 'fraction' | 'root' | 'whole', value: string, num?: number, den?: number, rootVal?: number }
export const checkDecimalType = (input) => {
  if (!input) return null;

  if (input.type === 'whole') {
    return 'Terminating';
  }

  if (input.type === 'root') {
    if (isPerfectSquare(input.rootVal)) {
      return 'Terminating'; // Technically it's an integer, which terminates
    }
    return 'Irrational';
  }

  if (input.type === 'fraction') {
    let { num, den } = input;
    
    // Simplest form check could be added here, but for this lab 
    // we often assume the fraction is already simplified or we just check the denominator.
    // To be perfectly accurate, we should simplify first.
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(num, den);
    den = den / divisor;

    if (den === 1) return 'Terminating';

    // A fraction in lowest terms is terminating if its denominator's prime factors consist only of 2s and/or 5s.
    let tempDen = den;
    while (tempDen % 2 === 0) tempDen /= 2;
    while (tempDen % 5 === 0) tempDen /= 5;

    if (tempDen === 1) {
      return 'Terminating';
    } else {
      return 'Repeating';
    }
  }

  return 'Unknown';
};

// Generate decimal expansion for a fraction or root
export const getDecimalExpansion = (input, limit = 40) => {
  if (!input) return '';

  if (input.type === 'whole') {
    return input.value + '.000...';
  }

  if (input.type === 'root') {
    const val = Math.sqrt(input.rootVal);
    if (isPerfectSquare(input.rootVal)) {
      return val.toString() + '.000...';
    }
    // For irrational roots, just return a long string
    return val.toFixed(limit).toString() + '...';
  }

  if (input.type === 'fraction') {
    let { num, den } = input;
    const res = [];
    
    // Integer part
    res.push(Math.floor(num / den).toString());
    res.push('.');
    
    let remainder = num % den;
    if (remainder === 0) return res.join('') + '000...';
    
    const seenRemainders = new Map();
    let count = 0;
    
    while (remainder !== 0 && count < limit) {
      if (seenRemainders.has(remainder)) {
        // We found a repeat, but for the UI string we'll just keep going a bit
        // to show the pattern, then add '...'
      }
      seenRemainders.set(remainder, count);
      
      remainder *= 10;
      res.push(Math.floor(remainder / den).toString());
      remainder %= den;
      count++;
    }
    
    return res.join('') + (remainder === 0 ? '000...' : '...');
  }
  
  return '';
};
