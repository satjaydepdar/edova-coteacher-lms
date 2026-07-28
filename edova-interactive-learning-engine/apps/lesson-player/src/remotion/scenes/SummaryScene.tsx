import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface SummarySceneProps {
  title: string;
  recapLines: string[];
}

const STAGGER_FRAMES = 8;

export const SummaryScene: React.FC<SummarySceneProps> = ({ title, recapLines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill className="bg-linear-to-b from-green-50 to-white flex flex-col items-center justify-center gap-8">
      <div style={{ opacity: titleOpacity }} className="text-4xl font-bold text-green-900">
        {title}
      </div>
      <div className="flex flex-col gap-4">
        {recapLines.map((line, i) => {
          const lineFrame = frame - (i + 1) * STAGGER_FRAMES;
          const progress = spring({ frame: lineFrame, fps, config: { damping: 14, mass: 0.6 } });
          const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateLeft: 'clamp' });
          const x = interpolate(progress, [0, 1], [-24, 0], { extrapolateLeft: 'clamp' });

          return (
            <div key={line} style={{ opacity, transform: `translateX(${x}px)` }} className="text-2xl text-green-800">
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
