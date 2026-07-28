import { motion, AnimatePresence } from 'framer-motion';
import type { QuestionScene } from '../types/lesson';
import { useLessonStore } from '../store/lessonStore';
import { BinSortAnimation } from './BinSortAnimation';

interface QuestionOverlayProps {
  scene: QuestionScene;
  onContinue: () => void;
}

export function QuestionOverlay({ scene, onContinue }: QuestionOverlayProps) {
  const answer = useLessonStore((s) => s.answers[scene.id]);
  const revealStage = useLessonStore((s) => s.revealStage[scene.id] ?? 'unanswered');
  const selectOption = useLessonStore((s) => s.selectOption);

  const selectedOption = scene.options.find((o) => o.id === answer?.optionId);
  const correctOption = scene.options.find((o) => o.correct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ type: 'spring', damping: 22, stiffness: 220 }}
      className="absolute inset-0 flex items-center justify-center bg-black/40 p-8"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 max-h-full overflow-y-auto">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
          Question {scene.sourceRef}
        </p>
        <h2 className="text-xl font-semibold text-neutral-900 mb-5">{scene.prompt}</h2>

        <div className="flex flex-col gap-3">
          {scene.options.map((option) => {
            const isSelected = answer?.optionId === option.id;
            const showCorrectHighlight = revealStage === 'final' && option.correct;
            const showIncorrectHighlight = isSelected && !option.correct;
            const dimmed = !!answer && !showCorrectHighlight && !showIncorrectHighlight;

            return (
              <button
                key={option.id}
                type="button"
                disabled={!!answer}
                onClick={() => selectOption(scene.id, option)}
                className={[
                  'text-left rounded-xl border-2 px-4 py-3 transition-colors',
                  showCorrectHighlight ? 'border-green-600 bg-green-50' : '',
                  showIncorrectHighlight ? 'border-red-500 bg-red-50' : '',
                  !answer ? 'border-neutral-200 hover:border-green-400 cursor-pointer' : '',
                  dimmed ? 'border-neutral-200 opacity-50' : '',
                ].join(' ')}
              >
                {scene.optionRenderStyle === 'table' && option.tableRow ? (
                  <div className="flex gap-3">
                    <span className="font-semibold text-neutral-800 min-w-[110px]">{option.tableRow.label}</span>
                    <span className="text-neutral-700">{option.tableRow.value}</span>
                  </div>
                ) : (
                  <span className="text-neutral-800">{option.text}</span>
                )}
              </button>
            );
          })}
        </div>

        {scene.scenarioAnimation ? (
          <BinSortAnimation scenario={scene.scenarioAnimation} revealed={revealStage === 'final'} />
        ) : null}

        <AnimatePresence mode="wait">
          {revealStage === 'misconception' && selectedOption?.misconception ? (
            <motion.div
              key="misconception"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 overflow-hidden"
            >
              <span className="font-semibold">Not quite. </span>
              {selectedOption.misconception}
            </motion.div>
          ) : null}

          {revealStage === 'final' ? (
            <motion.div
              key="final"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-900 overflow-hidden"
            >
              <span className="font-semibold">{answer?.correct ? 'Correct. ' : 'The correct answer: '}</span>
              {correctOption?.correctRationale}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {revealStage === 'final' ? (
          <button
            type="button"
            onClick={onContinue}
            className="mt-5 w-full rounded-xl bg-green-700 text-white font-semibold py-3 hover:bg-green-800 transition-colors cursor-pointer"
          >
            Continue
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
