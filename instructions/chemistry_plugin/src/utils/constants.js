// ══════════════════════════════════════════════════
//  Math Quest — App-wide Constants
// ══════════════════════════════════════════════════

// ── XP / Levels ────────────────────────────────────
export const LEVELS = [
  { name: 'Beginner',     emoji: '🌱', min: 0   },
  { name: 'Explorer',     emoji: '🔭', min: 100  },
  { name: 'Solver',       emoji: '⚡', min: 300  },
  { name: 'Champion',     emoji: '🏆', min: 600  },
  { name: 'Math Wizard',  emoji: '🧙', min: 1000 },
];

export function getLevel(xp) {
  let level = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.min) level = l; }
  return level;
}

export function getNextLevel(xp) {
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (xp < LEVELS[i + 1].min) return LEVELS[i + 1];
  }
  return null; // max level
}

export function getLevelProgress(xp) {
  const current = getLevel(xp);
  const next    = getNextLevel(xp);
  if (!next) return 100;
  return Math.round(((xp - current.min) / (next.min - current.min)) * 100);
}

// ── XP awards ──────────────────────────────────────
export const XP = {
  PRIME_FACTOR_FOUND:   10,
  PRIME_TREE_COMPLETE:  20,
  LCM_FOUND:            15,
  HCF_FOUND:            15,
  QUIZ_CORRECT:         10,
  QUIZ_CORRECT_FAST:    20,  // answered in < 5s
  QUIZ_PERFECT:         50,
  QUIZ_STREAK_5:        25,
};

// ── Badges ─────────────────────────────────────────
export const BADGES = {
  first_split:    { id:'first_split',    emoji:'🌳', name:'Tree Builder',    desc:'Build your first factor tree' },
  speed_prime:    { id:'speed_prime',    emoji:'⚡', name:'Speed Splitter',  desc:'Factorize a number in under 30 seconds' },
  train_master:   { id:'train_master',   emoji:'🚂', name:'Train Master',    desc:'Find the LCM using the train race' },
  cookie_chef:    { id:'cookie_chef',    emoji:'🍪', name:'Cookie Chef',     desc:'Find the HCF using the cookie factory' },
  streak_5:       { id:'streak_5',       emoji:'🔥', name:'On Fire!',        desc:'5 correct answers in a row' },
  perfect_score:  { id:'perfect_score',  emoji:'💯', name:'Perfect Score',   desc:'100% on a challenge' },
  explorer:       { id:'explorer',       emoji:'🔭', name:'Explorer',        desc:'Reach 100 XP' },
  champion:       { id:'champion',       emoji:'🏆', name:'Champion',        desc:'Reach 600 XP' },
};

// ── Difficulty ─────────────────────────────────────
export const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Easy', icon: '🌱', color: 'text-emerald-600',
    bg: 'bg-emerald-50', border: 'border-emerald-300',
    range: [2, 30], questions: 5,
    timePerQ: 25,
    description: 'Numbers 2–30 · 5 questions · 25 sec each',
  },
  medium: {
    label: 'Medium', icon: '⚡', color: 'text-amber-600',
    bg: 'bg-amber-50', border: 'border-amber-300',
    range: [10, 100], questions: 8,
    timePerQ: 18,
    description: 'Numbers 10–100 · 8 questions · 18 sec each',
  },
  hard: {
    label: 'Hard', icon: '🔥', color: 'text-red-600',
    bg: 'bg-red-50', border: 'border-red-300',
    range: [50, 300], questions: 10,
    timePerQ: 12,
    description: 'Numbers 50–300 · 10 questions · 12 sec each',
  },
};

// ── Module meta ────────────────────────────────────
export const MODULES = [
  {
    id: 'prime', step: 1, path: '/prime-factorization',
    title: 'Prime Factorization',
    subtitle: 'Break numbers into their prime pieces',
    emoji: '🌳',
    color: 'prime',
    gradient: 'gradient-prime',
    btnClass: 'btn-prime',
    bgLight: 'bg-[#F5F3FF]',
    border: 'border-[#8B5CF6]',
    desc: 'Every number can be broken down into prime building blocks. Click nodes to split numbers and build your own factor tree!',
  },
  {
    id: 'lcm', step: 2, path: '/learn-lcm',
    title: 'Least Common Multiple',
    subtitle: 'Explore multiples on a visual timeline',
    emoji: '📈',
    color: 'lcm',
    gradient: 'gradient-lcm',
    btnClass: 'btn-lcm',
    bgLight: 'bg-[#EFF6FF]',
    border: 'border-[#3B82F6]',
    desc: 'Watch multiples grow on the number line and find the exact spot where they first intersect — that\'s the LCM!',
  },
  {
    id: 'hcf', step: 3, path: '/learn-hcf',
    title: 'Highest Common Factor',
    subtitle: 'Drag and drop shared prime factors',
    emoji: '🧩',
    color: 'hcf',
    gradient: 'gradient-hcf',
    btnClass: 'btn-hcf',
    bgLight: 'bg-[#FFF7ED]',
    border: 'border-[#F97316]',
    desc: 'Drag matching prime factors into the Common Zone to discover the Highest Common Factor interactively!',
  },
  {
    id: 'challenge', step: 4, path: '/challenge',
    title: 'Challenge Mode',
    subtitle: 'Test everything you\'ve learned!',
    emoji: '⚔️',
    color: 'challenge',
    gradient: 'gradient-challenge',
    btnClass: 'btn-challenge',
    bgLight: 'bg-[#FFF1F2]',
    border: 'border-[#F43F5E]',
    desc: 'Choose a topic, pick your difficulty, and race the clock! Earn XP, build streaks, and unlock badges in the Math Arena.',
  },
];

// ── Example pairs / quick picks ────────────────────
export const QUICK_PICKS = {
  prime: [12, 18, 24, 36, 48, 60, 72, 100],
  lcm: [
    { n1:3,  n2:5,  label:'3 & 5'  },
    { n1:4,  n2:6,  label:'4 & 6'  },
    { n1:6,  n2:8,  label:'6 & 8'  },
    { n1:5,  n2:7,  label:'5 & 7'  },
    { n1:9,  n2:12, label:'9 & 12' },
  ],
  hcf: [
    { n1:12, n2:18, label:'12 & 18' },
    { n1:24, n2:36, label:'24 & 36' },
    { n1:18, n2:27, label:'18 & 27' },
    { n1:48, n2:64, label:'48 & 64' },
    { n1:7,  n2:11, label:'7 & 11'  },
  ],
};

// ── Prime colour palette ────────────────────────────
export const PRIME_COLORS = [
  { bg:'#EDE9FE', border:'#8B5CF6', text:'#5B21B6' }, // violet — 2
  { bg:'#D1FAE5', border:'#10B981', text:'#065F46' }, // emerald — 3
  { bg:'#FEF3C7', border:'#F59E0B', text:'#92400E' }, // amber — 5
  { bg:'#FCE7F3', border:'#EC4899', text:'#831843' }, // pink — 7
  { bg:'#DBEAFE', border:'#3B82F6', text:'#1E3A8A' }, // blue — 11
  { bg:'#FEE2E2', border:'#EF4444', text:'#7F1D1D' }, // red — 13
  { bg:'#CCFBF1', border:'#14B8A6', text:'#134E4A' }, // teal — 17
  { bg:'#FED7AA', border:'#F97316', text:'#7C2D12' }, // orange — 19
  { bg:'#E0E7FF', border:'#6366F1', text:'#312E81' }, // indigo — 23
];

export function getPrimeColor(prime) {
  const primes = [2,3,5,7,11,13,17,19,23];
  const idx = primes.indexOf(prime);
  return idx >= 0 ? PRIME_COLORS[idx] : { bg:'#F1F5F9', border:'#64748B', text:'#1E293B' };
}

// ── Fun facts ───────────────────────────────────────
export const FUN_FACTS = [
  '🌍 Every number greater than 1 is either prime or a product of primes!',
  '🔗 HCF × LCM = Product of the two numbers. Always!',
  '🤝 If HCF(a, b) = 1, the numbers are called co-prime.',
  '📏 LCM helps us add fractions with different denominators.',
  '🏛️ Euclid discovered the HCF algorithm around 300 BCE — we still use it!',
  '🔢 The number 1 is neither prime nor composite.',
  '🚌 Traffic lights use LCM to sync their timings!',
];

// ── Storage key ─────────────────────────────────────
export const STORAGE_KEY = 'mathquest_v2_progress';
