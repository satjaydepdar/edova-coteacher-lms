import { calculateEuclidSteps } from './euclidLogic';

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateIncorrectOptions = (correctAnswer, isPair) => {
  const options = [correctAnswer];
  while (options.length < 4) {
    let wrong;
    if (isPair) {
      // Correct pair is like "18, 12"
      const parts = correctAnswer.split(',').map(n => parseInt(n.trim(), 10));
      wrong = `${parts[0] + getRandomInt(-5, 5)}, ${Math.max(0, parts[1] + getRandomInt(-5, 5))}`;
    } else {
      const num = parseInt(correctAnswer, 10);
      wrong = (num + getRandomInt(1, 5) * (Math.random() > 0.5 ? 1 : -1)).toString();
      if (parseInt(wrong, 10) < 0) wrong = "0";
    }
    if (!options.includes(wrong)) {
      options.push(wrong);
    }
  }
  return options.sort(() => Math.random() - 0.5);
};

export const generateQuestions = (difficulty) => {
  const questions = [];
  const types = ['quotient', 'remainder', 'nextPair', 'hcf'];
  
  for (let i = 0; i < 5; i++) {
    let a, b, steps;
    
    // Ensure we get a meaningful division depending on difficulty
    do {
      if (difficulty === 'easy') {
        a = getRandomInt(20, 50);
        b = getRandomInt(5, 20);
      } else if (difficulty === 'medium') {
        a = getRandomInt(50, 200);
        b = getRandomInt(15, 60);
      } else {
        a = getRandomInt(200, 1000);
        b = getRandomInt(50, 300);
      }
      steps = calculateEuclidSteps(a, b);
    } while (steps.length < 2 || (difficulty === 'hard' && steps.length < 3));

    const type = types[i % types.length];
    // Pick a random step for the question
    const stepIndex = type === 'hcf' ? steps.length - 1 : getRandomInt(0, steps.length - 2);
    const step = steps[stepIndex];
    
    let questionText = '';
    let correctAnswer = '';
    let explanation = '';
    let isPair = false;

    if (type === 'quotient') {
      questionText = `What is the quotient when dividing ${step.a} by ${step.b}? (${step.a} ÷ ${step.b} = ?)`;
      correctAnswer = step.q.toString();
      explanation = `${step.b} fits into ${step.a} exactly ${step.q} times. Formula: ${step.a} = ${step.b} × ${step.q} + ${step.r}`;
    } else if (type === 'remainder') {
      questionText = `What is the remainder when dividing ${step.a} by ${step.b}?`;
      correctAnswer = step.r.toString();
      explanation = `${step.a} = ${step.b} × ${step.q} + ${step.r}. The leftover value after filling ${step.q} containers of ${step.b} is ${step.r}.`;
    } else if (type === 'nextPair') {
      questionText = `After the step (${step.a}, ${step.b}), what is the next pair of numbers to divide?`;
      correctAnswer = `${step.b}, ${step.r}`;
      isPair = true;
      explanation = `Since ${step.a} = ${step.b} × ${step.q} + ${step.r}, the next step takes the divisor (${step.b}) and the remainder (${step.r}) to form the new pair (${step.b}, ${step.r}).`;
    } else if (type === 'hcf') {
      questionText = `Find the final HCF of ${a} and ${b}.`;
      correctAnswer = steps[steps.length - 1].b.toString();
      explanation = `Using the Euclid algorithm, the final non-zero remainder (or the last divisor when remainder is 0) is ${correctAnswer}.`;
    }

    questions.push({
      id: i,
      type,
      questionText,
      correctAnswer,
      explanation,
      options: difficulty !== 'hard' ? generateIncorrectOptions(correctAnswer, isPair) : null,
      isInputForm: difficulty === 'hard'
    });
  }

  return questions;
};
