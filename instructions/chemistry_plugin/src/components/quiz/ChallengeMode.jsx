import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, TreePine, ArrowUpDown, GitMerge, CheckCircle, XCircle } from 'lucide-react';
import { useChallenge } from '../../hooks/useChallenge';
import { DIFFICULTY_CONFIG } from '../../utils/constants';
import QuestionCard from './QuestionCard';
import ScoreBoard from './ScoreBoard';
import { slideUp } from '../../utils/animations';
import clsx from 'clsx';

const TOPICS = [
  {
    id: 'prime',
    label: 'Prime Factorization',
    icon: <TreePine size={28} className="text-purple-600" />,
    bg: 'bg-purple-50 border-purple-300',
    activeBg: 'bg-purple-100 border-purple-500',
    desc: 'Prime factors, factor trees, building blocks of numbers',
    color: 'text-purple-700',
  },
  {
    id: 'lcm',
    label: 'LCM',
    icon: <ArrowUpDown size={28} className="text-indigo-600" />,
    bg: 'bg-indigo-50 border-indigo-300',
    activeBg: 'bg-indigo-100 border-indigo-500',
    desc: 'Lowest Common Multiple — when sequences first meet',
    color: 'text-indigo-700',
  },
  {
    id: 'hcf',
    label: 'HCF',
    icon: <GitMerge size={28} className="text-orange-600" />,
    bg: 'bg-orange-50 border-orange-300',
    activeBg: 'bg-orange-100 border-orange-500',
    desc: 'Highest Common Factor — the greatest shared divisor',
    color: 'text-orange-700',
  },
];

function TopicPicker({ selected, onSelect, onNext }) {
  return (
    <motion.div variants={slideUp} initial="hidden" animate="visible" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Choose a Topic</h2>
        <p className="text-slate-500 text-sm">Select what you want to be tested on</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TOPICS.map((t) => (
          <motion.button
            key={t.id}
            onClick={() => onSelect(t.id)}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={clsx(
              'rounded-2xl p-6 text-center border-2 transition-all duration-200 flex flex-col items-center gap-3',
              selected === t.id ? t.activeBg : t.bg,
            )}
          >
            <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              {t.icon}
            </div>
            <h3 className={clsx('font-bold text-lg', t.color)}>{t.label}</h3>
            <p className="text-xs text-slate-500">{t.desc}</p>
            {selected === t.id && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <CheckCircle size={12} className="text-white" />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <button
        disabled={!selected}
        onClick={onNext}
        className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next: Choose Difficulty <ChevronRight size={20} />
      </button>
    </motion.div>
  );
}

function DifficultyPicker({ selected, topic, onSelect, onStart, onBack }) {
  const topicObj = TOPICS.find(t => t.id === topic);
  return (
    <motion.div variants={slideUp} initial="hidden" animate="visible" className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full text-sm text-slate-600 mb-3">
          {topicObj?.icon} {topicObj?.label}
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Choose Difficulty</h2>
        <p className="text-slate-500 text-sm">How hard do you want it?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
          <motion.button
            key={key}
            id={`difficulty-pick-${key}`}
            onClick={() => onSelect(key)}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className={clsx(
              'bg-white rounded-2xl p-5 text-left border-2 transition-all duration-200 shadow-sm',
              selected === key ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <div className="text-3xl mb-3">{config.icon}</div>
            <h3 className={clsx('font-bold text-lg mb-1', config.color)}>{config.label}</h3>
            <p className="text-xs text-slate-500">{config.description}</p>
            <p className="text-xs text-slate-400 mt-2">{config.questions} questions</p>
          </motion.button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 py-3">← Back</button>
        <button
          id="start-challenge-btn"
          onClick={() => onStart(selected)}
          className="btn-primary flex-1 py-3 text-base flex items-center justify-center gap-2"
        >
          Start Challenge <ChevronRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}

export default function ChallengeMode({ onScoreUpdate }) {
  const {
    phase, topic, difficulty,
    currentQuestion, currentIndex, totalQuestions,
    userAnswers, score, totalAnswered, percentage,
    selectedOption, showExplanation, isLastQuestion,
    setTopic, setDifficulty, startChallenge, submitAnswer, nextQuestion, restartChallenge,
  } = useChallenge();

  React.useEffect(() => {
    if (phase === 'results' && onScoreUpdate) {
      onScoreUpdate(score, totalQuestions, percentage, score);
    }
  }, [phase]);

  const [setupPhase, setSetupPhase] = React.useState('topic'); // 'topic' | 'difficulty'

  // Sync setup sub-phase when restarting
  React.useEffect(() => {
    if (phase === 'topic') setSetupPhase('topic');
  }, [phase]);

  return (
    <div className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">

        {/* Step 1: Topic picker */}
        {phase === 'topic' && setupPhase === 'topic' && (
          <motion.div key="topic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TopicPicker
              selected={topic}
              onSelect={setTopic}
              onNext={() => setSetupPhase('difficulty')}
            />
          </motion.div>
        )}

        {/* Step 2: Difficulty picker */}
        {phase === 'topic' && setupPhase === 'difficulty' && (
          <motion.div key="difficulty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DifficultyPicker
              selected={difficulty}
              topic={topic}
              onSelect={setDifficulty}
              onStart={(diff) => startChallenge(diff, topic)}
              onBack={() => setSetupPhase('topic')}
            />
          </motion.div>
        )}

        {/* Playing */}
        {phase === 'playing' && currentQuestion && (
          <motion.div
            key={`q-${currentIndex}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-5"
          >
            {/* Score bar */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Score: <strong className="text-emerald-600">{score}</strong> / {totalAnswered}</span>
              <span className="text-slate-500 capitalize">{difficulty} · {TOPICS.find(t => t.id === topic)?.label}</span>
            </div>

            <QuestionCard
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={totalQuestions}
              selectedOption={selectedOption}
              showExplanation={showExplanation}
              onAnswer={submitAnswer}
            />

            {showExplanation && (
              <motion.button
                id="next-question-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={nextQuestion}
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
              >
                {isLastQuestion ? '📊 See Results' : 'Next Question'}
                <ChevronRight size={18} />
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Results */}
        {phase === 'results' && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ScoreBoard
              score={score}
              total={totalQuestions}
              percentage={percentage}
              userAnswers={userAnswers}
              difficulty={difficulty}
              topic={topic}
              onRestart={restartChallenge}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
