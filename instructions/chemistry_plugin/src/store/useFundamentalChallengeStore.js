import { create } from 'zustand';
import { generateChallenge } from '../utils/fundamentalChallengeLogic';

export const useChallengeStore = create((set, get) => ({
  difficulty: null,
  questions: [],
  currentQuestionIdx: 0,
  answers: [],
  score: 0,
  status: 'idle', // idle, playing, result

  startChallenge: (difficulty) => {
    const questions = generateChallenge(difficulty);
    set({
      difficulty,
      questions,
      currentQuestionIdx: 0,
      answers: [],
      score: 0,
      status: 'playing',
    });
  },

  submitAnswer: (answer) => {
    const { questions, currentQuestionIdx, answers, score } = get();
    const question = questions[currentQuestionIdx];
    const isCorrect = answer === question.correctAnswer;
    
    const newAnswers = [...answers, { answer, isCorrect, question }];
    const newScore = isCorrect ? score + 1 : score;

    set({
      answers: newAnswers,
      score: newScore,
    });
  },

  nextQuestion: () => {
    const { currentQuestionIdx, questions } = get();
    if (currentQuestionIdx < questions.length - 1) {
      set({ currentQuestionIdx: currentQuestionIdx + 1 });
    } else {
      set({ status: 'result' });
    }
  },

  resetChallenge: () => set({ status: 'idle', difficulty: null, questions: [], currentQuestionIdx: 0, answers: [], score: 0 }),
}));
