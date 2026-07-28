import { create } from 'zustand';
import type { QuestionOption } from '../types/lesson';

type RevealStage = 'unanswered' | 'misconception' | 'final';

interface LessonStoreState {
  answers: Record<string, { optionId: string; correct: boolean }>;
  revealStage: Record<string, RevealStage>;
  selectOption: (sceneId: string, option: QuestionOption) => void;
  reset: () => void;
}

const MISCONCEPTION_DISPLAY_MS = 2200;

export const useLessonStore = create<LessonStoreState>((set) => ({
  answers: {},
  revealStage: {},
  selectOption: (sceneId, option) => {
    set((state) => ({
      answers: { ...state.answers, [sceneId]: { optionId: option.id, correct: option.correct } },
      revealStage: { ...state.revealStage, [sceneId]: option.correct ? 'final' : 'misconception' },
    }));

    if (!option.correct) {
      setTimeout(() => {
        set((state) => ({
          revealStage: { ...state.revealStage, [sceneId]: 'final' },
        }));
      }, MISCONCEPTION_DISPLAY_MS);
    }
  },
  reset: () => set({ answers: {}, revealStage: {} }),
}));
