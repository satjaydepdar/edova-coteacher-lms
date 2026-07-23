// ═══════════════════════════════════════════════════
//  Math Utilities — Core mathematical functions
// ═══════════════════════════════════════════════════

/**
 * Check if a number is prime (optimized to √n)
 * @param {number} n
 * @returns {boolean}
 */
export function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

/**
 * Get prime factorization as array (with repetition)
 * Example: 24 → [2, 2, 2, 3]
 * @param {number} n
 * @returns {number[]}
 */
export function primeFactorize(n) {
  if (n < 2) return [];
  const factors = [];
  let d = 2;
  while (d * d <= n) {
    while (n % d === 0) {
      factors.push(d);
      n = Math.floor(n / d);
    }
    d++;
  }
  if (n > 1) factors.push(n);
  return factors;
}

/**
 * Get prime factorization as grouped object
 * Example: 24 → { 2: 3, 3: 1 }
 * @param {number} n
 * @returns {Object}
 */
export function primeFactorizeGrouped(n) {
  const factors = primeFactorize(n);
  return factors.reduce((acc, f) => {
    acc[f] = (acc[f] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Format prime factorization as readable string
 * Example: 24 → "2³ × 3"
 * @param {number} n
 * @returns {string}
 */
export function formatFactorization(n) {
  const grouped = primeFactorizeGrouped(n);
  const superscripts = { 1: '', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  return Object.entries(grouped)
    .map(([base, exp]) => `${base}${superscripts[exp] || `^${exp}`}`)
    .join(' × ');
}

/**
 * Calculate HCF using Euclidean algorithm
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function calculateHCF(a, b) {
  a = Math.abs(Math.floor(a));
  b = Math.abs(Math.floor(b));
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Calculate HCF from prime factor arrays
 * @param {number[]} factors1
 * @param {number[]} factors2
 * @returns {number}
 */
export function hcfFromFactors(factors1, factors2) {
  const grouped1 = factors1.reduce((acc, f) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {});
  const grouped2 = factors2.reduce((acc, f) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {});
  let hcf = 1;
  for (const prime of Object.keys(grouped1)) {
    if (grouped2[prime]) {
      hcf *= Math.pow(parseInt(prime), Math.min(grouped1[prime], grouped2[prime]));
    }
  }
  return hcf;
}

/**
 * Calculate LCM using HCF
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function calculateLCM(a, b) {
  return Math.abs(a * b) / calculateHCF(a, b);
}

/**
 * Calculate LCM from prime factor arrays
 * @param {number[]} factors1
 * @param {number[]} factors2
 * @returns {number}
 */
export function lcmFromFactors(factors1, factors2) {
  const grouped1 = factors1.reduce((acc, f) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {});
  const grouped2 = factors2.reduce((acc, f) => { acc[f] = (acc[f] || 0) + 1; return acc; }, {});
  const allPrimes = new Set([...Object.keys(grouped1), ...Object.keys(grouped2)]);
  let lcm = 1;
  for (const prime of allPrimes) {
    const exp = Math.max(grouped1[prime] || 0, grouped2[prime] || 0);
    lcm *= Math.pow(parseInt(prime), exp);
  }
  return lcm;
}

/**
 * Get array of multiples of n
 * @param {number} n
 * @param {number} count
 * @returns {number[]}
 */
export function getMultiples(n, count) {
  return Array.from({ length: count }, (_, i) => n * (i + 1));
}

/**
 * Find common multiples up to a limit
 * @param {number} n1
 * @param {number} n2
 * @param {number} upTo
 * @returns {number[]}
 */
export function findCommonMultiples(n1, n2, upTo) {
  const lcm = calculateLCM(n1, n2);
  const commons = [];
  let multiple = lcm;
  while (multiple <= upTo) {
    commons.push(multiple);
    multiple += lcm;
  }
  return commons;
}

/**
 * Validate a factor pair for a node split
 * @param {number} number
 * @param {number} factor1
 * @param {number} factor2
 * @returns {{ valid: boolean, error: string|null }}
 */
export function isValidFactorPair(number, factor1, factor2) {
  const f1 = parseInt(factor1);
  const f2 = parseInt(factor2);

  if (isNaN(f1) || isNaN(f2)) return { valid: false, error: 'Enter both factors' };
  if (f1 < 2) return { valid: false, error: 'Each factor must be ≥ 2' };
  if (f2 < 2) return { valid: false, error: 'Each factor must be ≥ 2' };
  if (f1 * f2 !== number) return { valid: false, error: `${f1} × ${f2} = ${f1 * f2}, not ${number}` };

  return { valid: true, error: null };
}

/**
 * Get all factor pairs of a number (both factors > 1)
 * @param {number} n
 * @returns {[number, number][]}
 */
export function getFactorPairs(n) {
  const pairs = [];
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      pairs.push([i, n / i]);
    }
  }
  return pairs;
}

/**
 * Get all factors of a number
 * @param {number} n
 * @returns {number[]}
 */
export function getFactors(n) {
  const factors = [];
  for (let i = 1; i <= n; i++) {
    if (n % i === 0) factors.push(i);
  }
  return factors;
}

// ── Challenge question generation ──────────────────

const RANGES = {
  easy: [2, 30],
  medium: [10, 100],
  hard: [50, 300],
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateWrongAnswers(correct, type, n1, n2) {
  const wrongs = new Set();
  while (wrongs.size < 3) {
    const delta = randInt(1, 10);
    const candidates = [
      correct + delta,
      correct - delta,
      Math.max(1, correct + randInt(1, 5)),
      Math.max(1, correct - randInt(1, 5)),
      type === 'HCF' ? Math.min(n1, n2) : n1 * n2,
    ];
    for (const c of candidates) {
      if (c > 0 && c !== correct) wrongs.add(c);
      if (wrongs.size >= 3) break;
    }
  }
  return [...wrongs].slice(0, 3);
}

/**
 * Generate a challenge question
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {'HCF'|'LCM'|'compare'|'truefalse'} questionType
 * @returns {Object}
 */
export function generateQuestion(difficulty = 'medium', questionType = null) {
  const [min, max] = RANGES[difficulty] || RANGES.medium;
  let n1 = randInt(min, max);
  let n2 = randInt(min, max);

  // Avoid trivial same-number cases
  while (n1 === n2) n2 = randInt(min, max);

  const hcf = calculateHCF(n1, n2);
  const lcm = calculateLCM(n1, n2);

  const types = ['HCF', 'LCM', 'compare', 'truefalse'];
  const type = questionType || types[randInt(0, types.length - 1)];

  let question, correctAnswer, options, explanation;

  switch (type) {
    case 'HCF':
      question = `Find the HCF of ${n1} and ${n2}`;
      correctAnswer = hcf;
      options = shuffleArray([hcf, ...generateWrongAnswers(hcf, 'HCF', n1, n2)]);
      explanation = `HCF(${n1}, ${n2}) = ${hcf} — use the Euclidean algorithm or prime factorization.`;
      break;
    case 'LCM':
      question = `Find the LCM of ${n1} and ${n2}`;
      correctAnswer = lcm;
      options = shuffleArray([lcm, ...generateWrongAnswers(lcm, 'LCM', n1, n2)]);
      explanation = `LCM(${n1}, ${n2}) = ${lcm} = (${n1} × ${n2}) / HCF(${n1}, ${n2})`;
      break;
    case 'compare':
      question = `Which is greater: HCF or LCM of ${n1} and ${n2}?`;
      correctAnswer = 'LCM';
      options = ['HCF', 'LCM', 'They are equal', 'Cannot determine'];
      explanation = `LCM is always ≥ HCF. For ${n1} and ${n2}: HCF = ${hcf}, LCM = ${lcm}.`;
      break;
    case 'truefalse': {
      const isTrue = Math.random() > 0.5;
      const statedHCF = isTrue ? hcf : hcf + randInt(1, 5);
      question = `True or False: HCF(${n1}, ${n2}) = ${statedHCF}`;
      correctAnswer = isTrue ? 'True' : 'False';
      options = ['True', 'False'];
      explanation = `HCF(${n1}, ${n2}) = ${hcf}${isTrue ? ' ✓' : `. The stated value ${statedHCF} is incorrect.`}`;
      break;
    }
    default:
      question = `Find the HCF of ${n1} and ${n2}`;
      correctAnswer = hcf;
      options = shuffleArray([hcf, ...generateWrongAnswers(hcf, 'HCF', n1, n2)]);
      explanation = `HCF(${n1}, ${n2}) = ${hcf}`;
  }

  return { id: Date.now() + Math.random(), n1, n2, type, question, correctAnswer, options, explanation };
}

/**
 * Generate a prime factorization question
 */
function generatePrimeQuestion(difficulty) {
  const [min, max] = RANGES[difficulty] || RANGES.medium;
  const n = randInt(Math.max(min, 4), Math.min(max, 200));
  const factors = primeFactorize(n);
  const types = ['count', 'identify', 'product'];
  const t = types[randInt(0, 2)];

  if (t === 'count') {
    const correct = factors.length;
    const options = shuffleArray([correct, ...new Set([correct + 1, correct - 1 < 1 ? 2 : correct - 1, correct + 2])].slice(0, 4));
    return {
      id: Date.now() + Math.random(), n1: n, n2: null, type: 'PRIME',
      question: `How many prime factors does ${n} have? (with repetition)`,
      correctAnswer: correct, options,
      explanation: `${n} = ${factors.join(' × ')} — it has ${correct} prime factor(s) counting repetition.`,
    };
  }
  if (t === 'identify') {
    const smallPrimes = [2, 3, 5, 7, 11, 13];
    const correct = factors[0];
    const wrongs = smallPrimes.filter(p => p !== correct).slice(0, 3);
    const options = shuffleArray([correct, ...wrongs]);
    return {
      id: Date.now() + Math.random(), n1: n, n2: null, type: 'PRIME',
      question: `What is the smallest prime factor of ${n}?`,
      correctAnswer: correct, options,
      explanation: `${n} = ${factors.join(' × ')}. The smallest prime factor is ${correct}.`,
    };
  }
  // product
  const correct = n;
  const wrongs = generateWrongAnswers(n, 'HCF', n, n);
  const options = shuffleArray([correct, ...wrongs]);
  return {
    id: Date.now() + Math.random(), n1: n, n2: null, type: 'PRIME',
    question: `What is ${factors.join(' × ')} equal to?`,
    correctAnswer: correct, options,
    explanation: `${factors.join(' × ')} = ${n}. This is the prime factorization of ${n}.`,
  };
}

/**
 * Generate a batch of challenge questions filtered by topic
 * @param {number} count
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {'prime'|'lcm'|'hcf'|null} topic - null = mixed
 * @returns {Object[]}
 */
export function generateQuestions(count = 10, difficulty = 'medium', topic = null) {
  if (topic === 'prime') {
    return Array.from({ length: count }, () => generatePrimeQuestion(difficulty));
  }
  if (topic === 'lcm') {
    return Array.from({ length: count }, () => generateQuestion(difficulty, 'LCM'));
  }
  if (topic === 'hcf') {
    const types = ['HCF', 'compare', 'truefalse'];
    return Array.from({ length: count }, (_, i) => generateQuestion(difficulty, types[i % types.length]));
  }
  // Mixed (original behaviour)
  const types = ['HCF', 'LCM', 'compare', 'truefalse'];
  return Array.from({ length: count }, (_, i) =>
    generateQuestion(difficulty, types[i % types.length])
  );
}

