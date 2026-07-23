import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

// ============================================
// DATA
// ============================================
const quizData = [
  {
    q: "A triangle has interior angles of 47°, 53°, and 80°. What is it?",
    options: ["Right triangle", "Acute scalene", "Obtuse isosceles", "Equilateral"],
    correct: 1,
    feedback: "All three angles are under 90° (acute), and all three are different (scalene)."
  },
  {
    q: "For f(x) = ax³ + bx² + cx + d, what does the constant d represent graphically?",
    options: ["The slope at x = 0", "The y-intercept", "A root of the function", "The discriminant"],
    correct: 1,
    feedback: "Since f(0) = d, the point (0, d) is where the curve meets the y-axis."
  },
  {
    q: "In the quadratic formula, what does a negative discriminant (b² − 4ac < 0) tell you?",
    options: ["Two real roots", "One repeated root", "Two complex roots", "No solutions exist"],
    correct: 2,
    feedback: "A negative discriminant means the parabola never crosses the x-axis — the roots are complex conjugates."
  },
  {
    q: "If a triangle has sides 3, 4, and 5, what is its area?",
    options: ["6", "7.5", "10", "12"],
    correct: 0,
    feedback: "A 3-4-5 triangle is right-angled, so area = ½ × 3 × 4 = 6."
  },
  {
    q: "What is the derivative of f(x) = x³ with respect to x?",
    options: ["x²", "3x", "3x²", "x⁴/4"],
    correct: 2,
    feedback: "Using the power rule: d/dx[xⁿ] = n·xⁿ⁻¹, so d/dx[x³] = 3x²."
  }
];

const stepsData = [
  {
    title: "Start with the equation in standard form",
    expression: "2x² − 5x − 3 = 0",
    note: "It's already in ax² + bx + c = 0 form, so we can read coefficients directly."
  },
  {
    title: "Identify the coefficients",
    expression: "a = 2,  b = −5,  c = −3",
    note: "These three numbers are everything we need to plug into the quadratic formula."
  },
  {
    title: "Recall the quadratic formula",
    expression: "x = (−b ± √(b² − 4ac)) / 2a",
    note: "Derived by completing the square on the general form. Works for any quadratic."
  },
  {
    title: "Substitute the values",
    expression: "x = (5 ± √(25 + 24)) / 4",
    note: "Notice −b = −(−5) = 5, and b² − 4ac = (−5)² − 4(2)(−3) = 25 + 24."
  },
  {
    title: "Simplify what's under the radical",
    expression: "x = (5 ± √49) / 4",
    note: "The discriminant is 49 — a perfect square, which means both roots are rational."
  },
  {
    title: "Take the square root",
    expression: "x = (5 ± 7) / 4",
    note: "√49 = 7. The ± gives us two parallel calculations to finish."
  },
  {
    title: "Compute both solutions",
    expression: "x = 12/4 = 3   or   x = −2/4 = −½",
    note: "The two roots of the equation. The curve y = 2x² − 5x − 3 crosses the x-axis at these points.",
    final: true
  }
];

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,800;0,9..144,900;1,9..144,400;1,9..144,600&family=JetBrains+Mono:wght@300;400;500;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');

.edova-root {
  isolation: isolate;
  position: relative;
  overflow-x: hidden;
  font-feature-settings: "ss01", "ss02";
  line-height: 1.5;
  margin: 0;
}

.edova-root {
  --bg: #0d0e14;
  --bg-elev: #15171f;
  --bg-card: #1a1d28;
  --bg-card-2: #21242f;
  --fg: #f0ebe1;
  --fg-dim: #a8a496;
  --muted: #6b6d7a;
  --accent: #d4ff3a;
  --accent-2: #ff5e62;
  --accent-3: #4dd4ac;
  --accent-4: #ffb627;
  --accent-5: #c4a5ff;
  --border: rgba(240, 235, 225, 0.08);
  --border-strong: rgba(240, 235, 225, 0.18);
}

.edova-root * { box-sizing: border-box; }
.edova-root { scroll-behavior: smooth; }
.edova-root {
  font-family: 'Space Grotesk', sans-serif;
  background: var(--bg);
  color: var(--fg);
  margin: 0;
  overflow-x: hidden;
  font-feature-settings: 'ss01', 'ss02';
  line-height: 1.5;
}

.edova-root .font-display { font-family: 'Fraunces', serif; font-variation-settings: 'opsz' 144; letter-spacing: -0.02em; }
.edova-root .font-mono { font-family: 'JetBrains Mono', monospace; }
.edova-root .italic-serif { font-family: 'Fraunces', serif; font-style: italic; font-variation-settings: 'opsz' 144; }

/* Background atmosphere */
.edova-root .atmosphere {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.edova-root .atmosphere::before {
  content: '';
  position: absolute;
  top: -20%; left: -10%;
  width: 60%; height: 60%;
  background: radial-gradient(circle, rgba(212, 255, 58, 0.08) 0%, transparent 60%);
  filter: blur(60px);
}
.edova-root .atmosphere::after {
  content: '';
  position: absolute;
  bottom: -20%; right: -10%;
  width: 50%; height: 50%;
  background: radial-gradient(circle, rgba(255, 94, 98, 0.06) 0%, transparent 60%);
  filter: blur(60px);
}

.edova-root .bg-grid {
  background-image: 
    linear-gradient(rgba(240, 235, 225, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(240, 235, 225, 0.035) 1px, transparent 1px);
  background-size: 60px 60px;
}

.edova-root .bg-grid-fine {
  background-image: 
    linear-gradient(rgba(240, 235, 225, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(240, 235, 225, 0.02) 1px, transparent 1px);
  background-size: 20px 20px;
}

.edova-root main { position: relative; z-index: 2; }
.edova-root nav, .edova-root footer { position: relative; z-index: 1; }

/* Nav */
.edova-root nav {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 50;
  padding: 18px 40px;
  backdrop-filter: blur(20px);
  background: rgba(13, 14, 20, 0.7);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.edova-root .nav-progress {
  position: fixed;
  top: 0; left: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent), var(--accent-4));
  z-index: 100;
  transition: width 0.05s linear;
  box-shadow: 0 0 12px var(--accent);
}

.edova-root .logo {
  font-family: 'Fraunces', serif;
  font-weight: 900;
  font-size: 22px;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;
}
.edova-root .logo-mark {
  width: 26px; height: 26px;
  background: var(--accent);
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--bg);
  font-size: 14px;
  font-weight: 900;
  transform: rotate(-8deg);
}

.edova-root .nav-links {
  display: flex;
  gap: 32px;
  font-size: 14px;
  color: var(--fg-dim);
}
.edova-root .nav-links a {
  text-decoration: none;
  color: inherit;
  transition: color 0.2s;
  position: relative;
}
.edova-root .nav-links a:hover { color: var(--accent); }
.edova-root .nav-links a::before {
  content: attr(data-num);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--muted);
  margin-right: 6px;
}

/* Hero */
.edova-root .hero {
  min-height: 100vh;
  padding: 140px 40px 80px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  position: relative;
}

.edova-root .badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border: 1px solid var(--border-strong);
  border-radius: 100px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--fg-dim);
  letter-spacing: 0.05em;
  margin-bottom: 32px;
}

.edova-root .hero h1 {
  font-size: clamp(48px, 7vw, 96px);
  line-height: 0.95;
  font-weight: 900;
  margin: 0 0 24px;
}
.edova-root .hero h1 em {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 400;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-4) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-variation-settings: 'opsz' 144;
}

.edova-root .hero p {
  font-size: 18px;
  color: var(--fg-dim);
  max-width: 480px;
  margin: 0 0 40px;
  line-height: 1.6;
}

.edova-root .cta-group { display: flex; gap: 16px; flex-wrap: wrap; }

.edova-root .btn-primary {
  background: var(--accent);
  color: var(--bg);
  font-weight: 600;
  padding: 14px 28px;
  border-radius: 10px;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: none;
  cursor: pointer;
  font-size: 15px;
  font-family: inherit;
  text-decoration: none;
}
.edova-root .btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 40px -8px rgba(212, 255, 58, 0.5);
}
.edova-root .btn-secondary {
  background: transparent;
  color: var(--fg);
  font-weight: 500;
  padding: 14px 28px;
  border-radius: 10px;
  border: 1px solid var(--border-strong);
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 15px;
  font-family: inherit;
  text-decoration: none;
}
.edova-root .btn-secondary:hover {
  background: var(--bg-card);
  border-color: var(--fg-dim);
  transform: translateY(-2px);
}

/* Hero shape container */
.edova-root .hero-shape-wrap {
  position: relative;
  aspect-ratio: 1;
  max-width: 600px;
  margin-left: auto;
}
.edova-root .hero-shape-wrap svg {
  width: 100%;
  height: 100%;
  display: block;
}
.edova-root .shape-meta {
  position: absolute;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.edova-root .shape-meta.tl { top: 8%; left: 4%; }
.edova-root .shape-meta.br { bottom: 8%; right: 4%; text-align: right; }

.edova-root .float-symbol {
  position: absolute;
  font-family: 'Fraunces', serif;
  font-style: italic;
  color: var(--accent);
  opacity: 0.25;
  pointer-events: none;
  user-select: none;
}

/* Section common */
.edova-root section {
  padding: 100px 40px;
  position: relative;
}
.edova-root .section-header {
  max-width: 1400px;
  margin: 0 auto 60px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 32px;
  align-items: end;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}
.edova-root .section-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--accent);
  letter-spacing: 0.1em;
}
.edova-root .section-title {
  font-family: 'Fraunces', serif;
  font-size: clamp(36px, 5vw, 64px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 8px 0 0;
}
.edova-root .section-title em {
  font-style: italic;
  font-weight: 400;
  color: var(--accent);
}
.edova-root .section-kicker {
  color: var(--fg-dim);
  max-width: 360px;
  font-size: 14px;
  line-height: 1.5;
  text-align: right;
}

/* Playground */
.edova-root .playground-grid {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 32px;
}
.edova-root .canvas-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px;
  position: relative;
  overflow: hidden;
}
.edova-root .canvas-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.4;
}
.edova-root .card-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.edova-root .live-dot {
  width: 7px;
  height: 7px;
  background: var(--accent);
  border-radius: 50%;
  display: inline-block;
  position: relative;
  margin-right: 8px;
}
.edova-root .live-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1.5px solid var(--accent);
  animation: livePulse 2s infinite;
}
@keyframes livePulse {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.edova-root .triangle-svg {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: block;
  cursor: crosshair;
  touch-action: none;
}

.edova-root .vertex-handle {
  cursor: grab;
  transition: r 0.15s ease, filter 0.15s ease;
}
.edova-root .vertex-handle:hover { filter: drop-shadow(0 0 12px var(--accent)); }
.edova-root .vertex-handle.dragging { cursor: grabbing; }

.edova-root .readout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}
.edova-root .readout {
  background: var(--bg-card-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s;
}
.edova-root .readout:hover { border-color: var(--border-strong); }
.edova-root .readout-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.edova-root .readout-value {
  font-family: 'Fraunces', serif;
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
}
.edova-root .readout-unit {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--fg-dim);
  margin-left: 4px;
}
.edova-root .readout.full { grid-column: 1 / -1; }

.edova-root .classification {
  background: linear-gradient(135deg, rgba(212, 255, 58, 0.08), rgba(255, 182, 39, 0.04));
  border: 1px solid rgba(212, 255, 58, 0.2);
  border-radius: 12px;
  padding: 18px;
}
.edova-root .classification-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--accent);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.edova-root .classification-value {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 22px;
  font-weight: 400;
}

/* Plots */
.edova-root .plots-grid {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 32px;
}
.edova-root .plot-svg {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: block;
  background: var(--bg-elev);
  border-radius: 12px;
}
.edova-root .slider-row {
  margin-bottom: 24px;
}
.edova-root .slider-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}
.edova-root .slider-label {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 20px;
}
.edova-root .slider-label .var {
  color: var(--accent);
  font-weight: 600;
}
.edova-root .slider-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  color: var(--fg);
  font-weight: 500;
}

.edova-root input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--bg-card-2);
  border-radius: 2px;
  outline: none;
}
.edova-root input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid var(--bg-card);
  box-shadow: 0 0 0 1px var(--accent), 0 0 16px rgba(212, 255, 58, 0.6);
  transition: transform 0.15s ease;
}
.edova-root input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}
.edova-root input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid var(--bg-card);
  box-shadow: 0 0 0 1px var(--accent), 0 0 16px rgba(212, 255, 58, 0.6);
}

.edova-root .equation-display {
  background: var(--bg-card-2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: center;
  font-family: 'Fraunces', serif;
  font-size: 22px;
  border: 1px solid var(--border);
}
.edova-root .equation-display .num { color: var(--accent); font-weight: 600; }
.edova-root .equation-display .op { color: var(--fg-dim); margin: 0 4px; }
.edova-root .equation-display .var { font-style: italic; }

.edova-root .feature-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.edova-root .feature-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-card-2);
  border-radius: 6px;
  border-left: 2px solid var(--accent);
}
.edova-root .feature-item .label { color: var(--muted); }
.edova-root .feature-item .val { color: var(--fg); }

.edova-root .fn-toggle {
  display: flex;
  gap: 4px;
  background: var(--bg-card-2);
  padding: 4px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.edova-root .fn-toggle button {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--fg-dim);
  padding: 8px 12px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.edova-root .fn-toggle button.active {
  background: var(--bg);
  color: var(--accent);
}

/* Quiz */
.edova-root .quiz-grid {
  max-width: 1000px;
  margin: 0 auto;
  display: grid;
  gap: 24px;
}
.edova-root .quiz-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px;
  position: relative;
  overflow: hidden;
}
.edova-root .quiz-question-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--accent);
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}
.edova-root .quiz-question {
  font-family: 'Fraunces', serif;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 24px;
}
.edova-root .quiz-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.edova-root .quiz-option {
  background: var(--bg-card-2);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 15px;
  text-align: left;
  color: var(--fg);
  position: relative;
  overflow: hidden;
}
.edova-root .quiz-option:hover:not(.answered) {
  border-color: var(--accent);
  background: var(--bg-elev);
  transform: translateX(4px);
}
.edova-root .quiz-option .letter {
  width: 28px; height: 28px;
  border-radius: 6px;
  background: var(--bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  flex-shrink: 0;
}
.edova-root .quiz-option.answered { cursor: default; }
.edova-root .quiz-option.answered .letter { background: var(--bg); }

@keyframes correctPulse {
  0% { background: var(--bg-card-2); border-color: var(--border-strong); transform: scale(1); box-shadow: 0 0 0 rgba(77, 212, 172, 0); }
  20% { background: var(--accent-3); border-color: var(--accent-3); transform: scale(1.03); box-shadow: 0 0 60px rgba(77, 212, 172, 0.6); }
  60% { background: var(--accent-3); border-color: var(--accent-3); }
  100% { background: rgba(77, 212, 172, 0.18); border-color: var(--accent-3); transform: scale(1); box-shadow: 0 0 0 rgba(77, 212, 172, 0); }
}
@keyframes incorrectPulse {
  0% { background: var(--bg-card-2); border-color: var(--border-strong); transform: scale(1); box-shadow: 0 0 0 rgba(255, 94, 98, 0); }
  20% { background: var(--accent-2); border-color: var(--accent-2); transform: scale(0.98); box-shadow: 0 0 60px rgba(255, 94, 98, 0.6); }
  60% { background: var(--accent-2); border-color: var(--accent-2); }
  100% { background: rgba(255, 94, 98, 0.18); border-color: var(--accent-2); transform: scale(1); box-shadow: 0 0 0 rgba(255, 94, 98, 0); }
}
@keyframes revealCorrect {
  0% { background: var(--bg-card-2); border-color: var(--border-strong); }
  100% { background: rgba(77, 212, 172, 0.18); border-color: var(--accent-3); }
}
.edova-root .quiz-option.correct { animation: correctPulse 1.4s forwards; }
.edova-root .quiz-option.correct .letter { color: var(--accent-3); }
.edova-root .quiz-option.incorrect { animation: incorrectPulse 1.4s forwards; }
.edova-root .quiz-option.incorrect .letter { color: var(--accent-2); }
.edova-root .quiz-option.reveal-correct { animation: revealCorrect 0.6s forwards; }
.edova-root .quiz-option.reveal-correct .letter { color: var(--accent-3); }

.edova-root .quiz-feedback {
  margin-top: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  font-size: 14px;
  display: none;
  border: 1px solid;
}
.edova-root .quiz-feedback.show { display: block; animation: fadeIn 0.4s; }
.edova-root .quiz-feedback.correct {
  background: rgba(77, 212, 172, 0.08);
  border-color: rgba(77, 212, 172, 0.3);
  color: var(--accent-3);
}
.edova-root .quiz-feedback.incorrect {
  background: rgba(255, 94, 98, 0.08);
  border-color: rgba(255, 94, 98, 0.3);
  color: var(--accent-2);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.edova-root .quiz-progress {
  max-width: 1000px;
  margin: 0 auto 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 28px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
}
.edova-root .progress-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.edova-root .progress-stat .label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.edova-root .progress-stat .val {
  font-family: 'Fraunces', serif;
  font-size: 24px;
  font-weight: 600;
}
.edova-root .progress-stat .val .total { color: var(--muted); font-size: 16px; }

/* Solutions */
.edova-root .solutions-wrap {
  max-width: 900px;
  margin: 0 auto;
}
.edova-root .problem-card {
  background: linear-gradient(135deg, var(--bg-card), var(--bg-elev));
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
}
.edova-root .problem-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), var(--accent-4), var(--accent-2));
}
.edova-root .problem-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--accent);
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 12px;
}
.edova-root .problem-text {
  font-family: 'Fraunces', serif;
  font-size: 32px;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 8px;
}
.edova-root .problem-prompt {
  color: var(--fg-dim);
  font-size: 15px;
}

.edova-root .steps-list {
  position: relative;
  padding-left: 0;
}
.edova-root .steps-list::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 20px;
  bottom: 20px;
  width: 1px;
  background: var(--border);
}

.edova-root .step {
  position: relative;
  padding-left: 56px;
  padding-bottom: 28px;
  opacity: 0;
  transform: translateX(-12px);
  max-height: 0;
  overflow: hidden;
  transition: opacity 0.6s ease, transform 0.6s ease, max-height 0.6s ease, padding 0.6s ease;
}
.edova-root .step.revealed {
  opacity: 1;
  transform: translateX(0);
  max-height: 400px;
}

.edova-root .step-num {
  position: absolute;
  left: 0;
  top: 0;
  width: 40px; height: 40px;
  background: var(--bg-card);
  border: 2px solid var(--accent);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  z-index: 1;
}
.edova-root .step.final .step-num {
  background: var(--accent);
  color: var(--bg);
}
.edova-root .step-title {
  font-family: 'Fraunces', serif;
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--fg);
}
.edova-root .step-expression {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  color: var(--accent);
  background: var(--bg-card);
  padding: 12px 16px;
  border-radius: 8px;
  display: inline-block;
  margin-bottom: 8px;
  border: 1px solid var(--border);
}
.edova-root .step-note {
  font-size: 13px;
  color: var(--fg-dim);
  font-style: italic;
}

.edova-root .reveal-controls {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}
.edova-root .reveal-btn {
  background: var(--accent);
  color: var(--bg);
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}
.edova-root .reveal-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px -10px var(--accent);
}
.edova-root .reveal-btn:disabled {
  background: var(--bg-card-2);
  color: var(--muted);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.edova-root .reset-btn {
  background: transparent;
  color: var(--fg-dim);
  border: 1px solid var(--border-strong);
  padding: 12px 24px;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.edova-root .reset-btn:hover {
  color: var(--fg);
  border-color: var(--fg-dim);
}

/* Marquee */
.edova-root .marquee-strip {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 28px 0;
  overflow: hidden;
  position: relative;
  background: var(--bg-elev);
}
.edova-root .marquee-track {
  display: flex;
  gap: 60px;
  white-space: nowrap;
  animation: marqueeMove 50s linear infinite;
  font-family: 'Fraunces', serif;
  font-size: 28px;
  font-style: italic;
  color: var(--fg-dim);
}
.edova-root .marquee-track span {
  display: inline-flex;
  align-items: center;
  gap: 60px;
}
.edova-root .marquee-track span::after {
  content: '✦';
  color: var(--accent);
  font-style: normal;
  font-size: 16px;
}
@keyframes marqueeMove {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

/* Footer */
.edova-root footer {
  padding: 80px 40px 40px;
  border-top: 1px solid var(--border);
  background: var(--bg-elev);
}
.edova-root .footer-grid {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 60px;
  margin-bottom: 60px;
}
.edova-root .footer-quote {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 24px;
  line-height: 1.4;
  color: var(--fg);
}
.edova-root .footer-quote .author {
  display: block;
  margin-top: 12px;
  font-style: normal;
  font-size: 13px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--muted);
  letter-spacing: 0.05em;
}
.edova-root .footer-col h4 {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0 0 16px;
}
.edova-root .footer-col a {
  display: block;
  color: var(--fg-dim);
  text-decoration: none;
  font-size: 14px;
  padding: 4px 0;
  transition: color 0.2s;
}
.edova-root .footer-col a:hover { color: var(--accent); }
.edova-root .footer-bottom {
  max-width: 1400px;
  margin: 0 auto;
  padding-top: 32px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--muted);
}

/* Toast */
.edova-root .toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: var(--bg-card);
  border: 1px solid var(--accent);
  padding: 14px 24px;
  border-radius: 100px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  z-index: 1000;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 10px 40px rgba(212, 255, 58, 0.2);
  display: flex;
  align-items: center;
  gap: 10px;
}
.edova-root .toast.show { transform: translateX(-50%) translateY(0); }
.edova-root .toast i { color: var(--accent); }

/* Scroll reveal */
.edova-root .reveal-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.9s ease, transform 0.9s ease;
}
.edova-root .reveal-on-scroll.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Responsive */
@media (max-width: 900px) {
.edova-root nav { padding: 14px 20px; }
.edova-root .nav-links { display: none; }
.edova-root .hero {
    grid-template-columns: 1fr;
    padding: 120px 20px 60px;
    gap: 40px;
  }
.edova-root .hero-shape-wrap { max-width: 400px; margin: 0 auto; }
.edova-root section { padding: 60px 20px; }
.edova-root .section-header {
    grid-template-columns: 1fr;
    gap: 12px;
  }
.edova-root .section-kicker { text-align: left; }
.edova-root .playground-grid, .edova-root .plots-grid { grid-template-columns: 1fr; }
.edova-root .quiz-options { grid-template-columns: 1fr; }
.edova-root .footer-grid { grid-template-columns: 1fr; gap: 32px; }
.edova-root .readout-grid { grid-template-columns: 1fr 1fr; }
.edova-root .problem-card { padding: 24px; }
.edova-root .problem-text { font-size: 22px; }
}

@media (prefers-reduced-motion: reduce) {
.edova-root *, .edova-root *::before, .edova-root *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

.edova-root .ask-btn {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--accent);
  padding: 6px 14px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  cursor: pointer;
  margin-left: 16px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.edova-root .ask-btn:hover {
  background: rgba(212, 255, 58, 0.1);
  transform: translateY(-1px);
}
.edova-root .ask-panel-draggable {
  position: fixed;
  width: 400px;
  height: calc(100vh - 100px);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  transition: opacity 0.2s, transform 0.2s;
  opacity: 0;
  pointer-events: none;
  transform: translateY(10px);
  overflow: hidden;
}
.edova-root .ask-panel-draggable.open {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
.edova-root .ask-panel-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.edova-root .ask-panel-header h3 {
  margin: 0;
  font-family: 'Fraunces', serif;
  font-size: 18px;
  color: var(--fg);
}
.edova-root .ask-panel-header button {
  background: transparent;
  border: none;
  color: var(--fg-dim);
  cursor: pointer;
  font-size: 16px;
}
.edova-root .ask-panel-header button:hover {
  color: var(--fg);
}
.edova-root .ask-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}
.edova-root .ask-context {
  background: var(--bg-elev);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border-strong);
  margin-bottom: 24px;
}
.edova-root .ask-context .ask-step-title {
  font-family: 'Fraunces', serif;
  font-size: 14px;
  margin-bottom: 8px;
  color: var(--fg-dim);
}
.edova-root .ask-context .ask-step-expr {
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent);
  font-size: 14px;
}
.edova-root .chat-placeholder {
  text-align: center;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  margin-top: 40px;
}
.edova-root .ask-panel-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 12px;
}
.edova-root .ask-panel-footer input {
  flex: 1;
  background: var(--bg-elev);
  border: 1px solid var(--border-strong);
  padding: 10px 14px;
  border-radius: 8px;
  color: var(--fg);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
}
.edova-root .ask-panel-footer input:focus {
  outline: none;
  border-color: var(--accent);
}
.edova-root .ask-panel-footer button {
  background: var(--accent);
  color: var(--bg);
  border: none;
  width: 42px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.edova-root .ask-panel-footer button:hover {
  transform: translateY(-1px);
}
`;

function Navbar() {
  return (
    <nav>
  <div className="logo">
    <span className="logo-mark">∠</span>
    EDOVA
  </div>
  <div className="nav-links">
    <a href="#playground" data-num="01">Playground</a>
    <a href="#plots" data-num="02">Plots</a>
    <a href="#quiz" data-num="03">Quiz</a>
    <a href="#solutions" data-num="04">Solutions</a>
  </div>
  <a href="#hero" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '13px' }}>
    Begin
    <i className="fas fa-arrow-right" style={{ fontSize: '11px' }}></i>
  </a>
</nav>
  );
}

function Hero() {
  const heroShapeRef = useRef(null);
  const blobFillRef = useRef(null);
  const blobStrokeRef = useRef(null);
  const ghost1Ref = useRef(null);
  const ghost2Ref = useRef(null);
  const ghost3Ref = useRef(null);
  const blobVerticesRef = useRef(null);

  useEffect(() => {
    const heroSvg = heroShapeRef.current;
    const blobFill = blobFillRef.current;
    const blobStroke = blobStrokeRef.current;
    const ghost1 = ghost1Ref.current;
    const ghost2 = ghost2Ref.current;
    const ghost3 = ghost3Ref.current;
    const verticesGroup = blobVerticesRef.current;

    if (!heroSvg || !blobFill || !blobStroke || !ghost1 || !ghost2 || !ghost3 || !verticesGroup) return;

    verticesGroup.innerHTML = '';
    const N_VERTS = 12;
    const vertDots = [];
    for (let i = 0; i < N_VERTS; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', 3);
      c.setAttribute('fill', '#d4ff3a');
      c.setAttribute('opacity', '0.9');
      verticesGroup.appendChild(c);
      vertDots.push(c);
    }

    function catmullRomClosed(pts) {
      const n = pts.length;
      let d = '';
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % n];
        const p3 = pts[(i + 2) % n];
        if (i === 0) d += `M ${p1[0].toFixed(2)},${p1[1].toFixed(2)} `;
        const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
        const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
        const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
        const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += `C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)} `;
      }
      return d + 'Z';
    }

    let mouseFx = 0, mouseFy = 0;
    const onMouseMove = (e) => {
      const rect = heroSvg.getBoundingClientRect();
      mouseFx = ((e.clientX - rect.left) / rect.width - 0.5) * 30;
      mouseFy = ((e.clientY - rect.top) / rect.height - 0.5) * 30;
    };
    const onMouseLeave = () => { mouseFx = 0; mouseFy = 0; };
    
    heroSvg.addEventListener('mousemove', onMouseMove);
    heroSvg.addEventListener('mouseleave', onMouseLeave);

    const heroStart = performance.now();
    let animation;
    function morphLoop() {
      const t = (performance.now() - heroStart) / 1000;
      const cx = 250 + mouseFx;
      const cy = 250 + mouseFy;
      const baseR = 150;
      const pts = [];
      
      for (let i = 0; i < N_VERTS; i++) {
        const angle = (i / N_VERTS) * Math.PI * 2;
        const r = baseR
          + Math.sin(t * 0.7 + i * 0.9) * 32
          + Math.cos(t * 0.5 + i * 1.7) * 22
          + Math.sin(t * 1.1 + i * 0.3) * 12;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        pts.push([x, y]);
      }
      
      const ghostPts1 = [], ghostPts2 = [], ghostPts3 = [];
      for (let i = 0; i < N_VERTS; i++) {
        const angle = (i / N_VERTS) * Math.PI * 2;
        const r1 = baseR + Math.sin((t-0.3) * 0.7 + i * 0.9) * 32 + Math.cos((t-0.3) * 0.5 + i * 1.7) * 22;
        const r2 = baseR + Math.sin((t-0.6) * 0.7 + i * 0.9) * 32 + Math.cos((t-0.6) * 0.5 + i * 1.7) * 22;
        const r3 = baseR + Math.sin((t-0.9) * 0.7 + i * 0.9) * 32 + Math.cos((t-0.9) * 0.5 + i * 1.7) * 22;
        ghostPts1.push([cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1]);
        ghostPts2.push([cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2]);
        ghostPts3.push([cx + Math.cos(angle) * r3, cy + Math.sin(angle) * r3]);
      }
      
      const mainPath = catmullRomClosed(pts);
      blobFill.setAttribute('d', mainPath);
      blobStroke.setAttribute('d', mainPath);
      ghost1.setAttribute('d', catmullRomClosed(ghostPts1));
      ghost2.setAttribute('d', catmullRomClosed(ghostPts2));
      ghost3.setAttribute('d', catmullRomClosed(ghostPts3));
      
      pts.forEach((p, i) => {
        if(!vertDots[i]) return;
        vertDots[i].setAttribute('cx', p[0]);
        vertDots[i].setAttribute('cy', p[1]);
        const pulse = 2 + Math.sin(t * 2 + i) * 1.5;
        vertDots[i].setAttribute('r', Math.max(1.5, pulse));
      });
      
      animation = requestAnimationFrame(morphLoop);
    }
    morphLoop();

    return () => {
      cancelAnimationFrame(animation);
      heroSvg.removeEventListener('mousemove', onMouseMove);
      heroSvg.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <section className="hero bg-grid" id="hero">
      
  <div>
    <div className="badge">
      <span className="live-dot"></span>
      LIVE · INTERACTIVE · MATHEMATICS
    </div>
    <h1>Mathematics,<br/><em>made tangible.</em></h1>
    <p>Pull a vertex. Bend a curve. Watch the numbers answer back in real time. EDOVA is a handcrafted field guide to the shapes, functions, and logic that quietly run the world.</p>
    <div className="cta-group">
      <a href="#playground" className="btn-primary">
        Open the playground
        <i className="fas fa-arrow-right" style={{ fontSize: '12px' }}></i>
      </a>
      <a href="#solutions" className="btn-secondary">
        See a worked solution
      </a>
    </div>
  </div>
  <div className="hero-shape-wrap">
    <div className="shape-meta tl">n = 12 vertices<br/>ω = 0.7 rad/s</div>
    <div className="shape-meta br">r(t) = R + Σ sin(ωt + φᵢ)<br/>continuous morph</div>
    
    <svg viewBox="0 0 500 500" ref={heroShapeRef}>
      <defs>
        <radialGradient id="blobGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d4ff3a" stopOpacity="0.35"/>
          <stop offset="60%" stopColor="#d4ff3a" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#d4ff3a" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4ff3a"/>
          <stop offset="50%" stopColor="#ffb627"/>
          <stop offset="100%" stopColor="#ff5e62"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Background crosshair */}
      <line x1="250" y1="20" x2="250" y2="480" stroke="rgba(240,235,225,0.06)" strokeDasharray="2 6"/>
      <line x1="20" y1="250" x2="480" y2="250" stroke="rgba(240,235,225,0.06)" strokeDasharray="2 6"/>
      
      {/* Ghost outlines (offset) */}
      <path ref={ghost3Ref} fill="none" stroke="rgba(212,255,58,0.08)" strokeWidth="1" strokeDasharray="1 4"/>
      <path ref={ghost2Ref} fill="none" stroke="rgba(212,255,58,0.12)" strokeWidth="1"/>
      <path ref={ghost1Ref} fill="none" stroke="rgba(212,255,58,0.2)" strokeWidth="1"/>
      
      {/* Main filled blob */}
      <path ref={blobFillRef} fill="url(#blobGrad)"/>
      {/* Main outline */}
      <path ref={blobStrokeRef} fill="none" stroke="url(#strokeGrad)" strokeWidth="2" filter="url(#glow)"/>
      
      {/* Vertex dots */}
      <g ref={blobVerticesRef}></g>
      
      {/* Center dot */}
      <circle cx="250" cy="250" r="3" fill="#d4ff3a"/>
      <circle cx="250" cy="250" r="8" fill="none" stroke="#d4ff3a" strokeOpacity="0.4"/>
    </svg>
    
    <span className="float-symbol" style={{ top: '10%', right: '-5%', fontSize: '42px', animation: 'floatY 9s ease-in-out infinite' }}>∫</span>
    <span className="float-symbol" style={{ bottom: '20%', left: '-8%', fontSize: '36px', animation: 'floatY 7s ease-in-out infinite reverse', color: 'var(--accent-2)' }}>π</span>
    <span className="float-symbol" style={{ top: '50%', right: '-10%', fontSize: '28px', animation: 'floatY 11s ease-in-out infinite', color: 'var(--accent-4)' }}>∑</span>
  </div>

    </section>
  );
}

function Marquee() {
  return (
    <div className="marquee-strip">
  <div className="marquee-track">
    <span>geometry</span><span>algebra</span><span>calculus</span><span>topology</span><span>number theory</span><span>trigonometry</span><span>analysis</span><span>combinatorics</span><span>geometry</span><span>algebra</span><span>calculus</span><span>topology</span><span>number theory</span><span>trigonometry</span><span>analysis</span><span>combinatorics</span>
  </div>
</div>
  );
}

function TrianglePlayground() {
  const triangleSVGRef = useRef(null);
  const trianglePathRef = useRef(null);
  const verticesRef = useRef(null);
  const sideLabelsRef = useRef(null);
  const angleArcsRef = useRef(null);
  const centroidRef = useRef(null);
  const centroidLabelRef = useRef(null);
  
  const sideARef = useRef(null);
  const sideBRef = useRef(null);
  const sideCRef = useRef(null);
  const perimRef = useRef(null);
  const angleARef = useRef(null);
  const angleBRef = useRef(null);
  const angleCRef = useRef(null);
  const areaRef = useRef(null);
  const classificationRef = useRef(null);

  useEffect(() => {
    const triSVG = triangleSVGRef.current;
    const triPath = trianglePathRef.current;
    const verticesG = verticesRef.current;
    const sideLabelsG = sideLabelsRef.current;
    const angleArcsG = angleArcsRef.current;
    const centroidEl = centroidRef.current;
    const centroidLabel = centroidLabelRef.current;
    
    if(!triSVG || !triPath || !verticesG) return;
    
    verticesG.innerHTML = '';
    sideLabelsG.innerHTML = '';
    angleArcsG.innerHTML = '';

    const W = 600, H = 450;
    const triangle = {
      A: { x: 100, y: 100, label: 'A' },
      B: { x: 500, y: 130, label: 'B' },
      C: { x: 300, y: 400, label: 'C' }
    };

    const vertexElements = {};
    ['A', 'B', 'C'].forEach(key => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'vertex-handle');
      g.dataset.vertex = key;
      
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('r', 18);
      ring.setAttribute('fill', 'rgba(212,255,58,0.08)');
      ring.setAttribute('stroke', '#d4ff3a');
      ring.setAttribute('stroke-width', '1.5');
      
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', 6);
      dot.setAttribute('fill', '#d4ff3a');
      
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('font-family', 'Fraunces, serif');
      label.setAttribute('font-style', 'italic');
      label.setAttribute('font-size', '20');
      label.setAttribute('font-weight', '600');
      label.setAttribute('fill', '#0d0e14');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.textContent = triangle[key].label;
      label.setAttribute('y', 1);
      
      g.appendChild(ring);
      g.appendChild(dot);
      g.appendChild(label);
      verticesG.appendChild(g);
      vertexElements[key] = { g, ring, dot, label };
      
      const startDrag = (e) => {
        e.preventDefault();
        g.classList.add('dragging');
        const svgRect = triSVG.getBoundingClientRect();
        const scaleX = W / svgRect.width;
        const scaleY = H / svgRect.height;
        
        const onMove = (ev) => {
          const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
          const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
          const x = (clientX - svgRect.left) * scaleX;
          const y = (clientY - svgRect.top) * scaleY;
          triangle[key].x = Math.max(30, Math.min(W - 30, x));
          triangle[key].y = Math.max(30, Math.min(H - 30, y));
          updateTriangle();
        };
        
        const onUp = () => {
          g.classList.remove('dragging');
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('touchend', onUp);
        };
        
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
      };
      
      g.addEventListener('mousedown', startDrag);
      g.addEventListener('touchstart', startDrag, { passive: false });
    });

    function dist(p1, p2) { return Math.hypot(p2.x - p1.x, p2.y - p1.y); }
    function angleAtVertex(p, q1, q2) {
      const v1x = q1.x - p.x, v1y = q1.y - p.y;
      const v2x = q2.x - p.x, v2y = q2.y - p.y;
      const dot = v1x * v2x + v1y * v2y;
      const m1 = Math.hypot(v1x, v1y);
      const m2 = Math.hypot(v2x, v2y);
      if (m1 < 0.001 || m2 < 0.001) return 0;
      return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * 180 / Math.PI;
    }
    function midpoint(p1, p2) { return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }; }
    function describeArc(cx, cy, r, startAngle, endAngle) {
      const start = { x: cx + r * Math.cos(startAngle), y: cy + r * Math.sin(startAngle) };
      const end = { x: cx + r * Math.cos(endAngle), y: cy + r * Math.sin(endAngle) };
      const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
      const sweep = endAngle > startAngle ? 1 : 0;
      return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
    }
    function fmt(n, d = 1) { return n.toFixed(d); }

    function updateTriangle() {
      const { A, B, C } = triangle;
      triPath.setAttribute('d', `M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`);
      
      ['A', 'B', 'C'].forEach(k => {
        vertexElements[k].g.setAttribute('transform', `translate(${triangle[k].x}, ${triangle[k].y})`);
      });
      
      const a = dist(B, C);
      const b = dist(A, C);
      const c = dist(A, B);
      const angleA = angleAtVertex(A, B, C);
      const angleB = angleAtVertex(B, A, C);
      const angleC = angleAtVertex(C, A, B);
      const perim = a + b + c;
      const s = perim / 2;
      const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
      
      const gx = (A.x + B.x + C.x) / 3;
      const gy = (A.y + B.y + C.y) / 3;
      centroidEl.setAttribute('cx', gx);
      centroidEl.setAttribute('cy', gy);
      centroidLabel.setAttribute('x', gx + 12);
      centroidLabel.setAttribute('y', gy + 4);
      
      sideLabelsG.innerHTML = '';
      const sides = [
        { p1: B, p2: C, label: 'a', val: a },
        { p1: A, p2: C, label: 'b', val: b },
        { p1: A, p2: B, label: 'c', val: c }
      ];
      sides.forEach(s => {
        const mid = midpoint(s.p1, s.p2);
        const dx = s.p2.x - s.p1.x;
        const dy = s.p2.y - s.p1.y;
        const len = Math.hypot(dx, dy);
        const nx = -dy / len;
        const ny = dx / len;
        const dir = ((mid.x - gx) * nx + (mid.y - gy) * ny) >= 0 ? 1 : -1;
        const off = 22;
        const lx = mid.x + nx * off * dir;
        const ly = mid.y + ny * off * dir;
        
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', lx);
        t.setAttribute('y', ly);
        t.setAttribute('font-family', 'JetBrains Mono, monospace');
        t.setAttribute('font-size', '13');
        t.setAttribute('fill', '#a8a496');
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'central');
        t.textContent = `${s.label} = ${fmt(s.val)}`;
        sideLabelsG.appendChild(t);
      });
      
      angleArcsG.innerHTML = '';
      const angles = [
        { vertex: A, p1: B, p2: C, val: angleA, name: 'A' },
        { vertex: B, p1: A, p2: C, val: angleB, name: 'B' },
        { vertex: C, p1: A, p2: B, val: angleC, name: 'C' }
      ];
      angles.forEach(ang => {
        const a1 = Math.atan2(ang.p1.y - ang.vertex.y, ang.p1.x - ang.vertex.x);
        const a2 = Math.atan2(ang.p2.y - ang.vertex.y, ang.p2.x - ang.vertex.x);
        const r = 28;
        const path = describeArc(ang.vertex.x, ang.vertex.y, r, Math.min(a1, a2), Math.max(a1, a2));
        const arcEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arcEl.setAttribute('d', path);
        arcEl.setAttribute('fill', 'none');
        arcEl.setAttribute('stroke', '#ffb627');
        arcEl.setAttribute('stroke-width', '1.5');
        arcEl.setAttribute('opacity', '0.6');
        angleArcsG.appendChild(arcEl);
      });
      
      if(sideARef.current) sideARef.current.textContent = fmt(a);
      if(sideBRef.current) sideBRef.current.textContent = fmt(b);
      if(sideCRef.current) sideCRef.current.textContent = fmt(c);
      if(perimRef.current) perimRef.current.textContent = fmt(perim);
      if(angleARef.current) angleARef.current.textContent = fmt(angleA);
      if(angleBRef.current) angleBRef.current.textContent = fmt(angleB);
      if(angleCRef.current) angleCRef.current.textContent = fmt(angleC);
      if(areaRef.current) areaRef.current.textContent = fmt(area);
      
      const anglesArr = [angleA, angleB, angleC];
      const maxAng = Math.max(...anglesArr);
      const tolerance = (v1, v2) => Math.abs(v1 - v2) < 1.5;
      
      let bySide = 'scalene';
      if (tolerance(a, b) && tolerance(b, c)) bySide = 'equilateral';
      else if (tolerance(a, b) || tolerance(b, c) || tolerance(a, c)) bySide = 'isosceles';
      
      let byAngle = 'acute';
      if (Math.abs(maxAng - 90) < 1.5) byAngle = 'right';
      else if (maxAng > 90) byAngle = 'obtuse';
      
      if(classificationRef.current) classificationRef.current.textContent = `${bySide} · ${byAngle} triangle`;
    }

    updateTriangle();
  }, []);

  return (
    <section id="playground">
      
  <div className="section-header reveal-on-scroll">
    <div>
      <div className="section-num">01 — PLAYGROUND</div>
      <h2 className="section-title">Drag the <em>vertices</em>.<br/>Read the triangle.</h2>
    </div>
    <div></div>
    <p className="section-kicker">Every side length, every interior angle, the area — all of it recomputed the instant you move a point. Geometry as a living instrument.</p>
  </div>
  
  <div className="playground-grid reveal-on-scroll">
    <div className="canvas-card">
      <div className="card-label">
        <span><span className="live-dot"></span>SVG · DRAGGABLE</span>
        <span id="dragHint">click + drag any vertex</span>
      </div>
      <svg className="triangle-svg" ref={triangleSVGRef} viewBox="0 0 600 450">
        <defs>
          <pattern id="triGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(240,235,225,0.04)" strokeWidth="1"/>
          </pattern>
          <linearGradient id="triFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4ff3a" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#d4ff3a" stopOpacity="0.04"/>
          </linearGradient>
        </defs>
        <rect width="600" height="450" fill="url(#triGrid)"/>
        
        {/* Triangle */}
        <path ref={trianglePathRef} fill="url(#triFill)" stroke="#d4ff3a" strokeWidth="2" strokeLinejoin="round"/>
        
        {/* Side labels */}
        <g ref={sideLabelsRef}></g>
        {/* Angle arcs */}
        <g ref={angleArcsRef}></g>
        {/* Centroid */}
        <circle ref={centroidRef} r="4" fill="#ff5e62"/>
        <text ref={centroidLabelRef} fontFamily="JetBrains Mono" fontSize="10" fill="#ff5e62" textAnchor="middle">G</text>
        
        {/* Vertices */}
        <g ref={verticesRef}></g>
      </svg>
    </div>
    
    <div>
      <div className="card-label" style={{ marginBottom: '16px' }}>
        <span><span className="live-dot"></span>LIVE READOUTS</span>
        <span>heron's formula</span>
      </div>
      <div className="readout-grid">
        <div className="readout">
          <div className="readout-label">side a</div>
          <div className="readout-value"><span ref={sideARef}>—</span><span className="readout-unit">px</span></div>
        </div>
        <div className="readout">
          <div className="readout-label">side b</div>
          <div className="readout-value"><span ref={sideBRef}>—</span><span className="readout-unit">px</span></div>
        </div>
        <div className="readout">
          <div className="readout-label">side c</div>
          <div className="readout-value"><span ref={sideCRef}>—</span><span className="readout-unit">px</span></div>
        </div>
        <div className="readout">
          <div className="readout-label">perimeter</div>
          <div className="readout-value"><span ref={perimRef}>—</span><span className="readout-unit">px</span></div>
        </div>
        <div className="readout">
          <div className="readout-label">∠A</div>
          <div className="readout-value"><span ref={angleARef}>—</span><span className="readout-unit">°</span></div>
        </div>
        <div className="readout">
          <div className="readout-label">∠B</div>
          <div className="readout-value"><span ref={angleBRef}>—</span><span className="readout-unit">°</span></div>
        </div>
        <div className="readout">
          <div className="readout-label">∠C</div>
          <div className="readout-value"><span ref={angleCRef}>—</span><span className="readout-unit">°</span></div>
        </div>
        <div className="readout">
          <div className="readout-label">area</div>
          <div className="readout-value" style={{ color: 'var(--accent)' }}><span ref={areaRef}>—</span><span className="readout-unit">px²</span></div>
        </div>
      </div>
      
      <div className="classification">
        <div className="classification-label">classification</div>
        <div className="classification-value" ref={classificationRef}>— waiting for input —</div>
      </div>
    </div>
  </div>

    </section>
  );
}

function PolynomialGraph() {
  const plotSVGRef = useRef(null);
  const plotGridRef = useRef(null);
  const plotAxesRef = useRef(null);
  const curvePathRef = useRef(null);
  const curveFillRef = useRef(null);
  const plotPointsRef = useRef(null);
  const equationDisplayRef = useRef(null);
  
  const sliderARef = useRef(null);
  const sliderBRef = useRef(null);
  const sliderCRef = useRef(null);
  const sliderDRef = useRef(null);
  const valARef = useRef(null);
  const valBRef = useRef(null);
  const valCRef = useRef(null);
  const valDRef = useRef(null);
  
  const yIntRef = useRef(null);
  const discRef = useRef(null);
  const rootsRef = useRef(null);
  const critPtsRef = useRef(null);

  useEffect(() => {
    const plotSVG = plotSVGRef.current;
    const plotGrid = plotGridRef.current;
    const plotAxes = plotAxesRef.current;
    const curvePath = curvePathRef.current;
    const curveFill = curveFillRef.current;
    const plotPoints = plotPointsRef.current;
    
    if(!plotSVG || !plotGrid) return;
    
    const PW = 600, PH = 450;
    const xMin = -5, xMax = 5, yMin = -5, yMax = 5;
    const padL = 40, padR = 20, padT = 20, padB = 40;
    const plotW = PW - padL - padR;
    const plotH = PH - padT - padB;
    const sx = x => padL + ((x - xMin) / (xMax - xMin)) * plotW;
    const sy = y => padT + (1 - (y - yMin) / (yMax - yMin)) * plotH;

    function drawPlotGrid() {
      plotGrid.innerHTML = '';
      plotAxes.innerHTML = '';
      
      for (let x = xMin; x <= xMax; x++) {
        const lx = sx(x);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', lx);
        line.setAttribute('y1', padT);
        line.setAttribute('x2', lx);
        line.setAttribute('y2', padT + plotH);
        line.setAttribute('stroke', x === 0 ? 'rgba(240,235,225,0.25)' : 'rgba(240,235,225,0.06)');
        line.setAttribute('stroke-width', x === 0 ? 1.5 : 1);
        plotGrid.appendChild(line);
        
        if (x !== 0) {
          const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          lbl.setAttribute('x', lx);
          lbl.setAttribute('y', padT + plotH + 18);
          lbl.setAttribute('font-family', 'JetBrains Mono, monospace');
          lbl.setAttribute('font-size', '10');
          lbl.setAttribute('fill', '#6b6d7a');
          lbl.setAttribute('text-anchor', 'middle');
          lbl.textContent = x;
          plotAxes.appendChild(lbl);
        }
      }
      
      for (let y = yMin; y <= yMax; y++) {
        const ly = sy(y);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', padL);
        line.setAttribute('y1', ly);
        line.setAttribute('x2', padL + plotW);
        line.setAttribute('y2', ly);
        line.setAttribute('stroke', y === 0 ? 'rgba(240,235,225,0.25)' : 'rgba(240,235,225,0.06)');
        line.setAttribute('stroke-width', y === 0 ? 1.5 : 1);
        plotGrid.appendChild(line);
        
        if (y !== 0) {
          const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          lbl.setAttribute('x', padL - 8);
          lbl.setAttribute('y', ly + 3);
          lbl.setAttribute('font-family', 'JetBrains Mono, monospace');
          lbl.setAttribute('font-size', '10');
          lbl.setAttribute('fill', '#6b6d7a');
          lbl.setAttribute('text-anchor', 'end');
          lbl.textContent = y;
          plotAxes.appendChild(lbl);
        }
      }
      
      const o = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      o.setAttribute('x', sx(0) - 8);
      o.setAttribute('y', sy(0) + 16);
      o.setAttribute('font-family', 'JetBrains Mono, monospace');
      o.setAttribute('font-size', '10');
      o.setAttribute('fill', '#6b6d7a');
      o.setAttribute('text-anchor', 'end');
      o.textContent = '0';
      plotAxes.appendChild(o);
    }
    drawPlotGrid();

    const coeffs = { a: 0.3, b: -0.5, c: -1.5, d: 1 };
    function f(x) {
      return coeffs.a * x ** 3 + coeffs.b * x ** 2 + coeffs.c * x + coeffs.d;
    }

    function plotCurve() {
      let path = '';
      let fillPath = '';
      let started = false;
      let inFill = false;
      const points = [];
      
      for (let px = 0; px <= plotW; px++) {
        const x = xMin + (px / plotW) * (xMax - xMin);
        const y = f(x);
        const py = sy(y);
        points.push({ x, y, px: sx(x), py });
        
        if (py >= padT - 50 && py <= padT + plotH + 50) {
          if (!started) {
            path += `M ${sx(x).toFixed(2)} ${py.toFixed(2)} `;
            started = true;
          } else {
            path += `L ${sx(x).toFixed(2)} ${py.toFixed(2)} `;
          }
        } else {
          started = false;
        }
      }
      
      curvePath.setAttribute('d', path);
      
      let fillD = '';
      inFill = false;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.y >= 0 && p.y <= yMax + 2) {
          if (!inFill) {
            fillD += `M ${p.px.toFixed(2)} ${sy(0).toFixed(2)} L ${p.px.toFixed(2)} ${p.py.toFixed(2)} `;
            inFill = true;
          } else {
            fillD += `L ${p.px.toFixed(2)} ${p.py.toFixed(2)} `;
          }
        } else {
          if (inFill) {
            fillD += `L ${points[i-1].px.toFixed(2)} ${sy(0).toFixed(2)} Z `;
            inFill = false;
          }
        }
      }
      if (inFill) {
        fillD += `L ${points[points.length-1].px.toFixed(2)} ${sy(0).toFixed(2)} Z`;
      }
      curveFill.setAttribute('d', fillD);
      
      const eq = equationDisplayRef.current;
      const fmtNum = n => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2);
      if(eq) {
        eq.innerHTML = `
          <span className="num">${coeffs.a.toFixed(2)}</span><span className="var">x</span>³
          <span className="op">${fmtNum(coeffs.b)}</span><span className="var">x</span>²
          <span className="op">${fmtNum(coeffs.c)}</span><span className="var">x</span>
          <span className="op">${fmtNum(coeffs.d)}</span>
        `;
      }
      
      const roots = [];
      let prevY = f(xMin);
      for (let i = 1; i <= 200; i++) {
        const x = xMin + (i / 200) * (xMax - xMin);
        const y = f(x);
        if (prevY * y < 0) {
          const xr = x - (x - (x - (xMax-xMin)/200)) * y / (y - prevY);
          roots.push(xr);
        }
        prevY = y;
      }
      
      const dA = 3 * coeffs.a;
      const dB = 2 * coeffs.b;
      const dC = coeffs.c;
      const disc = dB * dB - 4 * dA * dC;
      let crits = [];
      if (Math.abs(dA) < 0.001) {
        if (Math.abs(dB) > 0.001) {
          crits.push(-dC / dB);
        }
      } else if (disc > 0) {
        const sqd = Math.sqrt(disc);
        crits.push((-dB + sqd) / (2 * dA));
        crits.push((-dB - sqd) / (2 * dA));
      }
      crits = crits.filter(x => x >= xMin && x <= xMax);
      
      const quadDisc = coeffs.c * coeffs.c - 4 * coeffs.b * coeffs.d;
      
      plotPoints.innerHTML = '';
      
      const yInt = coeffs.d;
      const yIntEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const yIntCirc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      yIntCirc.setAttribute('cx', sx(0));
      yIntCirc.setAttribute('cy', sy(yInt));
      yIntCirc.setAttribute('r', 5);
      yIntCirc.setAttribute('fill', '#ffb627');
      yIntCirc.setAttribute('stroke', '#0d0e14');
      yIntCirc.setAttribute('stroke-width', '2');
      yIntEl.appendChild(yIntCirc);
      plotPoints.appendChild(yIntEl);
      
      roots.forEach(r => {
        if (r < xMin || r > xMax) return;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', sx(r));
        c.setAttribute('cy', sy(0));
        c.setAttribute('r', 5);
        c.setAttribute('fill', '#d4ff3a');
        c.setAttribute('stroke', '#0d0e14');
        c.setAttribute('stroke-width', '2');
        g.appendChild(c);
        plotPoints.appendChild(g);
      });
      
      crits.forEach(cx => {
        const cy = f(cx);
        if (cy < yMin || cy > yMax) return;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', sx(cx));
        c.setAttribute('cy', sy(cy));
        c.setAttribute('r', 5);
        c.setAttribute('fill', '#ff5e62');
        c.setAttribute('stroke', '#0d0e14');
        c.setAttribute('stroke-width', '2');
        g.appendChild(c);
        plotPoints.appendChild(g);
      });
      
      if(yIntRef.current) yIntRef.current.textContent = yInt.toFixed(2);
      if(discRef.current) discRef.current.textContent = quadDisc >= 0 ? quadDisc.toFixed(2) : quadDisc.toFixed(2) + 'i';
      if(rootsRef.current) rootsRef.current.textContent = roots.length > 0 ? roots.map(r => r.toFixed(2)).join(', ') : 'none in view';
      if(critPtsRef.current) critPtsRef.current.textContent = crits.length > 0 ? crits.map(c => c.toFixed(2)).join(', ') : 'none';
    }

    const bindings = [
      { el: sliderARef.current, valEl: valARef.current, k: 'a' },
      { el: sliderBRef.current, valEl: valBRef.current, k: 'b' },
      { el: sliderCRef.current, valEl: valCRef.current, k: 'c' },
      { el: sliderDRef.current, valEl: valDRef.current, k: 'd' }
    ];
    
    bindings.forEach(b => {
      if(!b.el) return;
      b.el.addEventListener('input', () => {
        coeffs[b.k] = parseFloat(b.el.value);
        if(b.valEl) b.valEl.textContent = coeffs[b.k].toFixed(2);
        plotCurve();
      });
    });

    plotCurve();
  }, []);

  return (
    <section id="plots" className="bg-grid-fine">
      
  <div className="section-header reveal-on-scroll">
    <div>
      <div className="section-num">02 — PLOTS</div>
      <h2 className="section-title">A polynomial<br/><em>that obeys your fingers.</em></h2>
    </div>
    <div></div>
    <p className="section-kicker">Four coefficients, four sliders. As you move them, the curve redraws, the roots migrate, and the extrema hunt for new hiding places along the x-axis.</p>
  </div>
  
  <div className="plots-grid reveal-on-scroll">
    <div className="canvas-card">
      <div className="card-label">
        <span><span className="live-dot"></span>f(x) = ax³ + bx² + cx + d</span>
        <span id="plotDomain">x ∈ [-5, 5]</span>
      </div>
      <svg className="plot-svg" ref={plotSVGRef} viewBox="0 0 600 450">
        <defs>
          <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff5e62"/>
            <stop offset="50%" stopColor="#ffb627"/>
            <stop offset="100%" stopColor="#d4ff3a"/>
          </linearGradient>
          <filter id="curveGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Grid */}
        <g ref={plotGridRef}></g>
        {/* Axes */}
        <g ref={plotAxesRef}></g>
        {/* Curve */}
        <path ref={curveFillRef} fill="rgba(212,255,58,0.05)"/>
        <path ref={curvePathRef} fill="none" stroke="url(#curveGrad)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" filter="url(#curveGlow)"/>
        
        {/* Points of interest */}
        <g ref={plotPointsRef}></g>
      </svg>
    </div>
    
    <div>
      <div className="card-label" style={{ marginBottom: '16px' }}>
        <span><span className="live-dot"></span>PARAMETERS</span>
        <span>range [-2, 2]</span>
      </div>
      
      <div className="equation-display" ref={equationDisplayRef}>
        <span className="num">0</span><span className="var">x</span>³ <span className="op">+</span> <span className="num">0</span><span className="var">x</span>² <span className="op">+</span> <span className="num">0</span><span className="var">x</span> <span className="op">+</span> <span className="num">0</span>
      </div>
      
      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-label">cubic term <span className="var">a</span></span>
          <span className="slider-value" ref={valARef}>0.30</span>
        </div>
        <input type="range" ref={sliderARef} min="-1" max="1" step="0.05" defaultValue="0.3"/>
      </div>
      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-label">quadratic term <span className="var">b</span></span>
          <span className="slider-value" ref={valBRef}>-0.50</span>
        </div>
        <input type="range" ref={sliderBRef} min="-2" max="2" step="0.05" defaultValue="-0.5"/>
      </div>
      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-label">linear term <span className="var">c</span></span>
          <span className="slider-value" ref={valCRef}>-1.50</span>
        </div>
        <input type="range" ref={sliderCRef} min="-3" max="3" step="0.05" defaultValue="-1.5"/>
      </div>
      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-label">constant <span className="var">d</span></span>
          <span className="slider-value" ref={valDRef}>1.00</span>
        </div>
        <input type="range" ref={sliderDRef} min="-3" max="3" step="0.05" defaultValue="1"/>
      </div>
      
      <div className="feature-list">
        <div className="feature-item"><span className="label">y-intercept</span><span className="val" ref={yIntRef}>1.00</span></div>
        <div className="feature-item"><span className="label">discriminant</span><span className="val" ref={discRef}>—</span></div>
        <div className="feature-item"><span className="label">real roots</span><span className="val" ref={rootsRef}>—</span></div>
        <div className="feature-item"><span className="label">critical pts</span><span className="val" ref={critPtsRef}>—</span></div>
      </div>
    </div>
  </div>

    </section>
  );
}

function Quiz({ showToast }) {
  const [answered, setAnswered] = useState([false, false, false, false, false]);
  const [selections, setSelections] = useState([]);

  const handleSelect = (qIdx, optIdx) => {
    if (answered[qIdx]) return;
    const newAnswered = [...answered];
    newAnswered[qIdx] = true;
    setAnswered(newAnswered);
    
    const newSelections = [...selections];
    newSelections[qIdx] = optIdx;
    setSelections(newSelections);
  };

  const doneCount = answered.filter(Boolean).length;
  const correctCount = selections.reduce((acc, optIdx, qIdx) => {
    return acc + (optIdx === quizData[qIdx].correct ? 1 : 0);
  }, 0);
  const accuracy = doneCount > 0 ? Math.round((correctCount / doneCount) * 100) + '%' : '—';

  useEffect(() => {
    if (doneCount === quizData.length && doneCount > 0) {
      setTimeout(() => {
        showToast(`Quiz complete — ${correctCount}/${quizData.length} correct`);
      }, 600);
    }
  }, [doneCount, correctCount, showToast]);

  return (
    <section id="quiz">
      
  <div className="section-header reveal-on-scroll">
    <div>
      <div className="section-num">03 — QUIZ</div>
      <h2 className="section-title">Five questions.<br/><em>Immediate feedback.</em></h2>
    </div>
    <div></div>
    <p className="section-kicker">Pick an answer and the card flashes mint when you're right, coral when you're not. No grades, no timers — just the quiet satisfaction of knowing.</p>
  </div>
      <div className="quiz-progress reveal-on-scroll">
        <div className="progress-stat">
          <span className="label">completed</span>
          <span className="val"><span>{doneCount}</span><span className="total">/5</span></span>
        </div>
        <div className="progress-stat" style={{ textAlign: 'center' }}>
          <span className="label">correct</span>
          <span className="val" style={{ color: 'var(--accent-3)' }}><span>{correctCount}</span></span>
        </div>
        <div className="progress-stat" style={{ textAlign: 'right' }}>
          <span className="label">accuracy</span>
          <span className="val"><span>{accuracy}</span></span>
        </div>
      </div>
      
      <div className="quiz-grid reveal-on-scroll">
        {quizData.map((item, qIdx) => {
          const isAnswered = answered[qIdx];
          const selectedOpt = selections[qIdx];
          const isCorrectSelection = selectedOpt === item.correct;
          
          return (
            <div key={qIdx} className="quiz-card">
              <div className="quiz-question-num">QUESTION {String(qIdx + 1).padStart(2, '0')}</div>
              <div className="quiz-question">{item.q}</div>
              <div className="quiz-options">
                {item.options.map((opt, i) => {
                  let btnClass = "quiz-option";
                  if (isAnswered) {
                    btnClass += " answered";
                    if (selectedOpt === i) {
                      btnClass += isCorrectSelection ? " correct" : " incorrect";
                    } else if (item.correct === i) {
                      btnClass += " reveal-correct";
                    }
                  }
                  return (
                    <button key={i} className={btnClass} onClick={() => handleSelect(qIdx, i)}>
                      <span className="letter">{String.fromCharCode(65 + i)}</span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              <div className={`quiz-feedback ${isAnswered ? 'show' : ''} ${isAnswered ? (isCorrectSelection ? 'correct' : 'incorrect') : ''}`}>
                {isAnswered && (
                  <><strong>{isCorrectSelection ? 'Correct.' : 'Not quite.'}</strong> {item.feedback}</>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Solutions({ showToast }) {
  const [step, setStep] = useState(0);
  const [askPanelOpen, setAskPanelOpen] = useState(false);
  const [activeAskStep, setActiveAskStep] = useState(null);

  const [pos, setPos] = useState({ x: typeof window !== 'undefined' ? window.innerWidth - 440 : 800, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, initX: 0, initY: 0 });

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, initX: pos.x, initY: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPos({
      x: dragStart.current.initX + (e.clientX - dragStart.current.x),
      y: dragStart.current.initY + (e.clientY - dragStart.current.y)
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleAsk = (idx) => {
    setActiveAskStep(idx);
    setAskPanelOpen(true);
  };

  const revealNext = () => {
    if (step >= stepsData.length) return;
    const newStep = step + 1;
    setStep(newStep);
    
    if (newStep === stepsData.length) {
      setTimeout(() => showToast('Solution revealed — nice work'), 400);
    }
  };

  const resetSteps = () => {
    setStep(0);
  };

  return (
    <section id="solutions" className="bg-grid-fine" style={{ position: 'relative' }}>
      
  <div className="section-header reveal-on-scroll">
    <div>
      <div className="section-num">04 — SOLUTIONS</div>
      <h2 className="section-title">One problem.<br/><em>Revealed step by step.</em></h2>
    </div>
    <div></div>
    <p className="section-kicker">Mathematics is mostly about the path, not the answer. Walk through the quadratic formula one move at a time — at your own pace.</p>
  </div>
      <div className="solutions-wrap reveal-on-scroll">
        <div className="problem-card">
          <div className="problem-label">WORKED EXAMPLE · QUADRATIC FORMULA</div>
          <div className="problem-text">Solve 2<span style={{ fontStyle: 'italic' }}>x</span>² − 5<span style={{ fontStyle: 'italic' }}>x</span> − 3 = 0</div>
          <div className="problem-prompt">Find both values of <span className="italic-serif">x</span> that satisfy the equation. Tap "next step" to walk through the derivation.</div>
        </div>
        
        <div className="steps-list">
          {stepsData.map((s, i) => (
            <div key={i} className={`step ${s.final ? 'final' : ''} ${i < step ? 'revealed' : ''}`}>
              <div className="step-num">{i + 1}</div>
              <div className="step-title">{s.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div className="step-expression" style={{ marginBottom: 0 }}>{s.expression}</div>
                <button className="ask-btn" onClick={() => handleAsk(i)}>
                  <i className="fas fa-sparkles"></i> Ask
                </button>
              </div>
              {s.note && <div className="step-note">{s.note}</div>}
            </div>
          ))}
        </div>
        
        <div className="reveal-controls">
          <button className="reveal-btn" onClick={revealNext} disabled={step >= stepsData.length}>
            <span>{step >= stepsData.length ? 'Solution complete' : `Reveal step ${step + 1}`}</span>
            <i className="fas fa-arrow-down" style={{ fontSize: '12px' }}></i>
          </button>
          <button className="reset-btn" onClick={resetSteps}>
            <i className="fas fa-rotate-left" style={{ fontSize: '12px', marginRight: '6px' }}></i>
            Reset
          </button>
        </div>
      </div>

      <div 
        className={`ask-panel-draggable ${askPanelOpen ? 'open' : ''}`}
        style={{ left: pos.x, top: pos.y }}
      >
        <div 
          className="ask-panel-header" 
          style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <h3>Discuss Step {activeAskStep !== null ? activeAskStep + 1 : ''}</h3>
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => setAskPanelOpen(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="ask-panel-body">
          {activeAskStep !== null && (
            <div className="ask-context">
              <div className="ask-step-title">{stepsData[activeAskStep].title}</div>
              <div className="ask-step-expr">{stepsData[activeAskStep].expression}</div>
            </div>
          )}
          <div className="chat-placeholder">
            <i className="fas fa-robot" style={{ fontSize: '24px', marginBottom: '12px', opacity: 0.5 }}></i><br/>
            AI backend will connect here.
          </div>
        </div>
        <div className="ask-panel-footer">
          <input type="text" placeholder="Ask how this step occurred..." />
          <button><i className="fas fa-paper-plane"></i></button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
  <div className="footer-grid">
    <div>
      <div className="logo" style={{ marginBottom: '24px' }}>
        <span className="logo-mark">∠</span>
        EDOVA
      </div>
      <p className="footer-quote">
        "Mathematics is the art of giving the same name to different things."
        <span className="author">— Henri Poincaré</span>
      </p>
    </div>
    <div className="footer-col">
      <h4>Sections</h4>
      <a href="#playground">Playground</a>
      <a href="#plots">Function Plots</a>
      <a href="#quiz">Quiz</a>
      <a href="#solutions">Solutions</a>
    </div>
    <div className="footer-col">
      <h4>More</h4>
      <a href="#">Concept library</a>
      <a href="#">Proof archive</a>
      <a href="#">About EDOVA</a>
      <a href="#">Subscribe</a>
    </div>
  </div>
  <div className="footer-bottom">
    <span>© EDOVA — handcrafted with geometry</span>
    <span>v 1.0 · made for explorers</span>
  </div>
</footer>
  );
}

const Toast = forwardRef((props, ref) => {
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  const timerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    show: (text) => {
      setMsg(text);
      setShow(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShow(false), 3000);
    }
  }));

  return (
    <div className={`toast ${show ? 'show' : ''}`}>
      <i className="fas fa-check-circle"></i>
      <span>{msg}</span>
    </div>
  );
});

export default function AxiomMathematical() {
  const toastRef = useRef(null);
  const navProgressRef = useRef(null);

  const showToast = (msg) => {
    toastRef.current?.show(msg);
  };

  useEffect(() => {
    const navProgress = navProgressRef.current;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (navProgress) navProgress.style.width = pct + '%';
    };
    window.addEventListener('scroll', onScroll);
    
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    
    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach(el => revealObserver.observe(el));
    
    setTimeout(() => {
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) el.classList.add('visible');
      });
    }, 100);

    return () => {
      window.removeEventListener('scroll', onScroll);
      elements.forEach(el => revealObserver.unobserve(el));
    };
  }, []);

  return (
    <div className="edova-root">
      <style>{styles}</style>
      <div className="atmosphere"></div>
      <div className="nav-progress" ref={navProgressRef}></div>
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <TrianglePlayground />
        <PolynomialGraph />
        <Quiz showToast={showToast} />
        <Solutions showToast={showToast} />
      </main>
      <Footer />
      <Toast ref={toastRef} />
    </div>
  );
}
