import { create } from 'zustand';
import { generateQuestions } from '../utils/euclidChallengeLogic';

const useChallengeStore = create((set, get) => ({
  status: 'idle', // 'idle', 'playing', 'finished'
  difficulty: 'easy',
  questions: [],
  currentQuestionIndex: 0,
  userAnswers: [], // Array of objects { questionId, userAnswer, isCorrect }
  score: 0,

  startChallenge: (difficulty) => {
    const questions = generateQuestions(difficulty);
    set({
      status: 'playing',
      difficulty,
      questions,
      currentQuestionIndex: 0,
      userAnswers: [],
      score: 0
    });
  },

  submitAnswer: (answer) => {
    const state = get();
    const currentQ = state.questions[state.currentQuestionIndex];
    const isCorrect = answer.trim().toLowerCase() === currentQ.correctAnswer.toLowerCase();

    const newUserAnswers = [...state.userAnswers, {
      questionId: currentQ.id,
      userAnswer: answer,
      isCorrect
    }];

    set({
      userAnswers: newUserAnswers,
      score: isCorrect ? state.score + 1 : state.score
    });
  },

  nextQuestion: () => {
    const state = get();
    if (state.currentQuestionIndex < state.questions.length - 1) {
      set({ currentQuestionIndex: state.currentQuestionIndex + 1 });
    } else {
      set({ status: 'finished' });
    }
  },

  resetChallenge: () => {
    set({
      status: 'idle',
      questions: [],
      currentQuestionIndex: 0,
      userAnswers: [],
      score: 0
    });
  }
}));

export default useChallengeStore;
