import { motion } from 'framer-motion';
import type { ScenarioAnimation } from '../types/lesson';

interface BinSortAnimationProps {
  scenario: ScenarioAnimation;
  revealed: boolean;
}

export function BinSortAnimation({ scenario, revealed }: BinSortAnimationProps) {
  const { bins, items } = scenario;

  return (
    <div className="mt-4">
      {!revealed ? (
        <div className="flex gap-2 justify-center mb-3 flex-wrap">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layoutId={`scenario-item-${item.id}`}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white shadow bg-neutral-500"
            >
              {item.label}
            </motion.div>
          ))}
        </div>
      ) : null}

      <div className="flex gap-3 justify-center">
        {bins.map((bin) => (
          <div
            key={bin.id}
            className="flex-1 rounded-lg p-2 min-h-16"
            style={{ backgroundColor: bin.color }}
          >
            <div className="text-center text-xs font-semibold text-white mb-1.5">{bin.label}</div>
            <div className="flex gap-1.5 flex-wrap justify-center">
              {revealed
                ? items
                    .filter((item) => item.correctBinId === bin.id)
                    .map((item) => (
                      <motion.div
                        key={item.id}
                        layoutId={`scenario-item-${item.id}`}
                        className="rounded-full px-2 py-1 text-[10px] font-medium text-white shadow bg-black/25"
                      >
                        {item.label}
                      </motion.div>
                    ))
                : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
