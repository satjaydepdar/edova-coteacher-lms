import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface TitleSceneProps {
  title: string;
  subtitle?: string;
}

export const TitleScene: React.FC<TitleSceneProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame, fps, config: { damping: 200 } });
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [24, 0]);

  return (
    <AbsoluteFill className="bg-linear-to-b from-green-50 to-white flex flex-col items-center justify-center">
      <div style={{ opacity, transform: `translateY(${y}px)` }} className="text-center">
        <div className="text-6xl font-bold text-green-900">{title}</div>
        {subtitle ? <div className="text-2xl text-green-700 mt-4">{subtitle}</div> : null}
      </div>
    </AbsoluteFill>
  );
};
