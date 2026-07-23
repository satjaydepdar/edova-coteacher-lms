import { isPrime, getPrimeFactors } from './factorLogic';

const generateRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const DIFFICULTIES = {
  easy: { min: 10, max: 50, types: ['prime_factorization', 'fill_missing'] },
  medium: { min: 50, max: 150, types: ['prime_factorization', 'identify_wrong', 'fill_missing'] },
  hard: { min: 150, max: 500, types: ['prime_factorization', 'identify_wrong', 'check_uniqueness'] },
};

export const generateChallenge = (difficulty) => {
  const config = DIFFICULTIES[difficulty];
  const questions = [];

  for (let i = 0; i < 5; i++) {
    const type = config.types[Math.floor(Math.random() * config.types.length)];
    const num = generateRandomNumber(config.min, config.max);
    const correctFactors = getPrimeFactors(num);

    let question = {};

    switch (type) {
      case 'prime_factorization':
        question = {
          type,
          number: num,
          question: `What is the prime factorization of ${num}?`,
          options: generateOptions(correctFactors, num),
          correctAnswer: correctFactors.join(' × '),
          explanation: `${num} = ${correctFactors.join(' × ')}. All these factors are prime numbers.`
        };
        break;
      case 'fill_missing':
        const missingIndex = Math.floor(Math.random() * correctFactors.length);
        const displayFactors = [...correctFactors];
        const missingValue = displayFactors[missingIndex];
        displayFactors[missingIndex] = '?';
        question = {
          type,
          number: num,
          question: `Complete the prime factorization: ${num} = ${displayFactors.join(' × ')}`,
          options: generateValueOptions(missingValue),
          correctAnswer: missingValue.toString(),
          explanation: `When we divide ${num} by the other factors, we get ${missingValue}, which is prime.`
        };
        break;
      case 'identify_wrong':
        const isWrong = Math.random() > 0.5;
        let factorStr = correctFactors.join(' × ');
        if (isWrong) {
          const wrongFactors = [...correctFactors];
          wrongFactors[0] = wrongFactors[0] + 1;
          factorStr = wrongFactors.join(' × ');
        }
        question = {
          type,
          number: num,
          question: `Is "${num} = ${factorStr}" a correct prime factorization?`,
          options: ['Yes', 'No'],
          correctAnswer: isWrong ? 'No' : 'Yes',
          explanation: isWrong ? `No, the product of ${factorStr} does not equal ${num} or includes composite numbers.` : `Yes, ${factorStr} equals ${num} and all factors are prime.`
        };
        break;
      case 'check_uniqueness':
        question = {
          type,
          number: num,
          question: `Can ${num} be represented by a different set of prime factors (other than reordering)?`,
          options: ['Yes', 'No'],
          correctAnswer: 'No',
          explanation: "According to the Fundamental Theorem of Arithmetic, every integer greater than 1 has a unique prime factorization."
        };
        break;
    }
    questions.push(question);
  }

  return questions;
};

const generateOptions = (correct, num) => {
  const options = new Set([correct.join(' × ')]);
  let attempts = 0;
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
  
  while (options.size < 4 && attempts < 100) {
    const wrong = [...correct];
    if (wrong.length > 0) {
      const idx = Math.floor(Math.random() * wrong.length);
      wrong[idx] = primes[Math.floor(Math.random() * primes.length)];
      options.add(wrong.sort((a, b) => a - b).join(' × '));
    }
    attempts++;
  }
  
  while (options.size < 4) {
    const randomCount = correct.length > 0 ? correct.length : 2;
    const fake = Array.from({length: randomCount}, () => primes[Math.floor(Math.random() * primes.length)]);
    options.add(fake.sort((a, b) => a - b).join(' × '));
  }
  
  return Array.from(options).sort(() => Math.random() - 0.5);
};

const generateValueOptions = (correct) => {
  const options = new Set([correct.toString()]);
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
  
  let i = 0;
  while (options.size < 4 && i < primes.length) {
    options.add(primes[i].toString());
    i++;
  }
  
  return Array.from(options).sort(() => Math.random() - 0.5);
};
