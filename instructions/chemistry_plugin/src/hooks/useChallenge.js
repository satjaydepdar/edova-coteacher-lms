import { useState, useCallback, useRef } from 'react';
import { generateQuestions } from '../utils/math';
import { DIFFICULTY_CONFIG } from '../utils/constants';

/**
 * useChallenge — manages quiz state and progression
 */
export function useChallenge() {
  const [topic, setTopic] = useState(null); // null | 'prime' | 'lcm' | 'hcf'
  const [difficulty, setDifficulty] = useState('easy');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [phase, setPhase] = useState('topic'); // topic | setup | playing | results
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const timerRef = useRef(null);

  const startChallenge = useCallback((diff = difficulty, selectedTopic = topic) => {
    const count = DIFFICULTY_CONFIG[diff]?.questions || 10;
    const qs = generateQuestions(count, diff, selectedTopic);
    setQuestions(qs);
    setCurrentIndex(0);
    setUserAnswers([]);
    setSelectedOption(null);
    setShowExplanation(false);
    setPhase('playing');
    setDifficulty(diff);
  }, [difficulty, topic]);

  const submitAnswer = useCallback((answer) => {
    if (selectedOption !== null) return; // already answered
    const question = questions[currentIndex];
    const isCorrect = String(answer) === String(question.correctAnswer);

    setSelectedOption(answer);
    setShowExplanation(true);
    setUserAnswers(prev => [
      ...prev,
      { questionId: question.id, answer, isCorrect, question },
    ]);
  }, [selectedOption, questions, currentIndex]);

  const nextQuestion = useCallback(() => {
    setShowExplanation(false);
    setSelectedOption(null);

    if (currentIndex + 1 >= questions.length) {
      setPhase('results');
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, questions.length]);

  const restartChallenge = useCallback(() => {
    setPhase('topic');
    setTopic(null);
    setQuestions([]);
    setCurrentIndex(0);
    setUserAnswers([]);
    setSelectedOption(null);
    setShowExplanation(false);
  }, []);

  const currentQuestion = questions[currentIndex] || null;
  const score = userAnswers.filter(a => a.isCorrect).length;
  const totalAnswered = userAnswers.length;
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? (currentIndex / totalQuestions) * 100 : 0;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  const isLastQuestion = currentIndex === questions.length - 1;

  return {
    // State
    phase,
    topic,
    difficulty,
    currentQuestion,
    currentIndex,
    totalQuestions,
    userAnswers,
    score,
    totalAnswered,
    progress,
    percentage,
    selectedOption,
    showExplanation,
    isLastQuestion,
    // Actions
    setTopic,
    setDifficulty,
    startChallenge,
    submitAnswer,
    nextQuestion,
    restartChallenge,
  };
}
