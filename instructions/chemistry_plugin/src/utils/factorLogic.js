export const isPrime = (num) => {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
};

export const getPrimeFactors = (num) => {
  const factors = [];
  let d = 2;
  let temp = num;
  while (temp > 1) {
    while (temp % d === 0) {
      factors.push(d);
      temp /= d;
    }
    d++;
    if (d * d > temp) {
      if (temp > 1) factors.push(temp);
      break;
    }
  }
  return factors.sort((a, b) => a - b);
};

export const validateFactors = (original, f1, f2) => {
  return parseInt(f1) * parseInt(f2) === original;
};

export const getInitialExamples = () => [60, 72, 84, 100];
