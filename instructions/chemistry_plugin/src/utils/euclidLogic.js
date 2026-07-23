export function calculateEuclidSteps(a, b) {
  const steps = [];
  let currentA = Math.max(a, b);
  let currentB = Math.min(a, b);

  if (currentA === 0 || currentB === 0) return steps;

  while (currentB !== 0) {
    const q = Math.floor(currentA / currentB);
    const r = currentA % currentB;
    steps.push({ a: currentA, b: currentB, q, r });
    currentA = currentB;
    currentB = r;
  }
  return steps;
}
