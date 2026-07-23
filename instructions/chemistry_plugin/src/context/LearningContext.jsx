import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { STORAGE_KEY, BADGES, getLevel, getNextLevel } from '../utils/constants';

const defaultState = {
  xp: 0,
  streak: 0,
  badges: [],          // array of badge ids
  moduleStars: { prime: 0, lcm: 0, hcf: 0, challenge: 0 },
  sessionPoints: 0,    // resets each session (teacher can reset)
  completedModules: [],
  challenge: { highScore: 0, attempts: 0 },
};

function reducer(state, action) {
  switch (action.type) {

    case 'EARN_XP': {
      const earned = action.amount || 0;
      const newXP  = state.xp + earned;
      const newBadges = [...state.badges];
      if (newXP >= 100  && !newBadges.includes('explorer'))  newBadges.push('explorer');
      if (newXP >= 600  && !newBadges.includes('champion'))  newBadges.push('champion');
      return {
        ...state,
        xp: newXP,
        sessionPoints: state.sessionPoints + earned,
        badges: newBadges,
        _lastXP: { amount: earned, ts: Date.now() }, // triggers XP toast
      };
    }

    case 'UNLOCK_BADGE': {
      if (state.badges.includes(action.id)) return state;
      return { ...state, badges: [...state.badges, action.id], _newBadge: action.id };
    }

    case 'CLEAR_NEW_BADGE':
      return { ...state, _newBadge: null };

    case 'INC_STREAK': {
      const newStreak = state.streak + 1;
      const newBadges = [...state.badges];
      if (newStreak >= 5 && !newBadges.includes('streak_5')) newBadges.push('streak_5');
      return { ...state, streak: newStreak, badges: newBadges };
    }

    case 'RESET_STREAK':
      return { ...state, streak: 0 };

    case 'SET_MODULE_STARS': {
      const prev = state.moduleStars[action.module] || 0;
      return {
        ...state,
        moduleStars: { ...state.moduleStars, [action.module]: Math.max(prev, action.stars) },
        completedModules: state.completedModules.includes(action.module)
          ? state.completedModules
          : [...state.completedModules, action.module],
      };
    }

    case 'UPDATE_CHALLENGE': {
      const isHigh = action.score > (state.challenge.highScore || 0);
      return {
        ...state,
        challenge: {
          highScore: Math.max(state.challenge.highScore, action.score),
          attempts: (state.challenge.attempts || 0) + 1,
        },
      };
    }

    case 'RESET_SESSION':
      return { ...state, sessionPoints: 0, streak: 0 };

    case 'RESET_ALL':
      return { ...defaultState };

    case 'LOAD':
      return { ...defaultState, ...action.state };

    default:
      return state;
  }
}

const Ctx = createContext(null);

export function LearningProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState, init => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultState, ...JSON.parse(saved), sessionPoints: 0, streak: 0 };
    } catch {}
    return init;
  });

  useEffect(() => {
    try {
      const { _lastXP, _newBadge, ...persisted } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {}
  }, [state]);

  const level     = getLevel(state.xp);
  const nextLevel = getNextLevel(state.xp);

  return (
    <Ctx.Provider value={{ state, dispatch, level, nextLevel }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLearning() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLearning must be inside LearningProvider');
  return ctx;
}
