import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { DiagramNode } from '../../types/lesson';

interface PyramidDiagramProps {
  title: string;
  tiers: DiagramNode[];
}

const BASE_WIDTH = 760;
const TOTAL_HEIGHT = 620;
const STAGGER_FRAMES = 12;

export const PyramidDiagram: React.FC<PyramidDiagramProps> = ({ title, tiers }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = tiers.length;
  const tierHeight = TOTAL_HEIGHT / n;

  const titleProgress = spring({ frame, fps, config: { damping: 200 } });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [-20, 0]);

  return (
    <AbsoluteFill className="bg-white flex flex-col items-center justify-center">
      <div
        style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}
        className="text-4xl font-semibold text-neutral-800 mb-10"
      >
        {title}
      </div>

      <svg width={BASE_WIDTH + 40} height={TOTAL_HEIGHT} viewBox={`0 0 ${BASE_WIDTH + 40} ${TOTAL_HEIGHT}`}>
        {tiers.map((tier, i) => {
          const cx = (BASE_WIDTH + 40) / 2;
          const topWidth = (BASE_WIDTH * i) / n;
          const bottomWidth = (BASE_WIDTH * (i + 1)) / n;
          const y = i * tierHeight;

          const tierFrame = frame - i * STAGGER_FRAMES;
          const progress = spring({ frame: tierFrame, fps, config: { damping: 14, mass: 0.6 } });
          const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateLeft: 'clamp' });
          const slideY = interpolate(progress, [0, 1], [30, 0], { extrapolateLeft: 'clamp' });

          const points = [
            [cx - topWidth / 2, y],
            [cx + topWidth / 2, y],
            [cx + bottomWidth / 2, y + tierHeight],
            [cx - bottomWidth / 2, y + tierHeight],
          ]
            .map((p) => p.join(','))
            .join(' ');

          const labelY = y + tierHeight / 2 - 6;
          const sublabelY = y + tierHeight / 2 + 18;

          return (
            <g key={tier.id} style={{ opacity, transform: `translateY(${slideY}px)` }}>
              <polygon points={points} fill={tier.color} stroke="white" strokeWidth={3} />
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fontSize={26}
                fontWeight={700}
                fill="white"
                style={{ fontFamily: 'system-ui, sans-serif' }}
              >
                {tier.label}
              </text>
              {tier.sublabel ? (
                <text
                  x={cx}
                  y={sublabelY}
                  textAnchor="middle"
                  fontSize={14}
                  fill="rgba(255,255,255,0.9)"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  {tier.sublabel}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
