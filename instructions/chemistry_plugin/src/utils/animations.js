// ═══════════════════════════════════════════════════
//  Framer Motion Animation Variants
// ═══════════════════════════════════════════════════

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const fadeInScale = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.2 } },
};

export const slideUp = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { y: -16, opacity: 0, transition: { duration: 0.25 } },
};

export const slideDown = {
  hidden: { y: -24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { y: 24, opacity: 0, transition: { duration: 0.25 } },
};

export const slideLeft = {
  hidden: { x: 40, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { x: -40, opacity: 0, transition: { duration: 0.25 } },
};

export const scaleIn = {
  hidden: { scale: 0.7, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 260, damping: 20 },
  },
  exit: { scale: 0.7, opacity: 0, transition: { duration: 0.2 } },
};

export const popIn = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 15 },
  },
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

// For LCM timeline — custom delay per index
export const multipleAppear = {
  hidden: { scale: 0, opacity: 0, y: 10 },
  visible: (i) => ({
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  }),
};

export const lcmHighlight = {
  hidden: { scale: 1 },
  visible: {
    scale: [1, 1.2, 1.1, 1.15, 1],
    transition: { duration: 0.6, times: [0, 0.3, 0.5, 0.7, 1] },
  },
};

// For factor tree nodes
export const nodeSplit = {
  hidden: { opacity: 0, scale: 0.5, y: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
};

export const treeLineGrow = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeInOut' },
  },
};

// Page transitions
export const pageTransition = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.3 },
  },
};

// Success celebration
export const celebrationPop = {
  hidden: { scale: 0, rotate: -10 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 500, damping: 15 },
  },
};

// Shake for wrong answer
export const shakeVariant = {
  shake: {
    x: [-8, 8, -8, 8, -4, 4, 0],
    transition: { duration: 0.5 },
  },
};

// Drag chip
export const chipIdle = { scale: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' };
export const chipDragging = { scale: 1.15, boxShadow: '0 8px 25px rgba(0,0,0,0.5)', zIndex: 100 };
