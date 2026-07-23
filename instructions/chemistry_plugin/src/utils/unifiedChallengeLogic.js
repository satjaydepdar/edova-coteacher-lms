export const generateChallenge = (difficulty, selectedTopics = ['prime', 'lcm', 'hcf', 'euclid', 'fundamental']) => {
  const questions = [];
  
  // Topic mapping to human readable names
  const topicNames = {
    prime: 'Prime Factorization',
    lcm: 'LCM',
    hcf: 'HCF',
    euclid: 'Euclid Division Algorithm',
    fundamental: 'Fundamental Theorem',
    irrational: 'Irrational Numbers'
  };

  // Generate 5-10 questions based on difficulty
  const numQuestions = difficulty === 'hard' ? 10 : 5;

  for (let i = 0; i < numQuestions; i++) {
    const topic = selectedTopics[i % selectedTopics.length];
    const num1 = Math.floor(Math.random() * (difficulty === 'hard' ? 100 : 20)) + 10;
    const num2 = Math.floor(Math.random() * (difficulty === 'hard' ? 50 : 10)) + 5;

    if (topic === 'prime') {
      const val = num1 * 2;
      const factor = isPrime(num1) ? num1 : 2;
      questions.push({
        topic: topicNames.prime,
        question: `Identify a prime factor of ${val}.`,
        options: [String(factor), String(val), String(val - 1), '1'].sort(() => Math.random() - 0.5),
        correctAnswer: String(factor),
        explanation: `${factor} is a prime number that divides ${val} exactly.`,
      });
    } else if (topic === 'lcm') {
      questions.push({
        topic: topicNames.lcm,
        question: `Find the Least Common Multiple (LCM) of 4 and 6.`,
        options: ['12', '24', '10', '2'],
        correctAnswer: '12',
        explanation: '12 is the smallest number that both 4 and 6 can divide into.',
      });
    } else if (topic === 'hcf') {
      questions.push({
        topic: topicNames.hcf,
        question: `Find the Highest Common Factor (HCF) of 15 and 20.`,
        options: ['5', '1', '10', '60'],
        correctAnswer: '5',
        explanation: '5 is the largest number that divides both 15 and 20.',
      });
    } else if (topic === 'euclid') {
      questions.push({
        topic: topicNames.euclid,
        question: `Using Euclid's algorithm, if 17 = 5 × 3 + r, what is the value of r?`,
        options: ['2', '3', '5', '0'],
        correctAnswer: '2',
        explanation: '17 divided by 5 gives a quotient of 3 and a remainder of 2.',
      });
    } else if (topic === 'fundamental') {
      questions.push({
        topic: topicNames.fundamental,
        question: `Which set of numbers represents the prime signature of 12?`,
        options: ['2, 2, 3', '2, 6', '3, 4', '1, 12'],
        correctAnswer: '2, 2, 3',
        explanation: '12 = 2 × 2 × 3, where 2 and 3 are prime numbers.',
      });
    } else {
      const irrationalQuestions = [
        {
          question: `Why does the decimal for 1/8 terminate?`,
          options: ['Because 8 only has 2 as a prime factor.', 'Because 8 is an even number.', 'Because it is a small fraction.', 'Because 8 is not prime.'],
          correctAnswer: 'Because 8 only has 2 as a prime factor.',
          explanation: 'A fraction terminates only if its simplified denominator has prime factors consisting solely of 2s and/or 5s. 8 is 2³. '
        },
        {
          question: `Which of these indicates that a number is irrational?`,
          options: ['It never stops and never repeats.', 'It is a very long repeating decimal.', 'It is a fraction with a large denominator.', 'It has a negative sign.'],
          correctAnswer: 'It never stops and never repeats.',
          explanation: 'Irrational numbers, like √2 or π, have decimal expansions that are infinite and chaotic, with no repeating loop.'
        },
        {
          question: `What type of decimal will 3/15 produce?`,
          options: ['Terminating', 'Repeating', 'Irrational', 'None of these'],
          correctAnswer: 'Terminating',
          explanation: 'First, simplify 3/15 to 1/5. Since the denominator is 5, which fits the 2s and 5s rule, it terminates.'
        }
      ];
      
      const selectedQ = irrationalQuestions[Math.floor(Math.random() * irrationalQuestions.length)];
      
      questions.push({
        topic: topicNames.irrational,
        ...selectedQ
      });
    }
  }

  return questions.sort(() => Math.random() - 0.5);
};

function isPrime(num) {
  for(let i = 2, s = Math.sqrt(num); i <= s; i++) {
    if(num % i === 0) return false;
  }
  return num > 1;
}
