import { useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { AnimatePresence } from 'framer-motion';
import type { Lesson } from '../types/lesson';
import { LessonPreview } from './LessonPreview';
import { QuestionOverlay } from '../components/QuestionOverlay';
import { buildChunks } from './chunks';

interface LessonPlayerProps {
  lesson: Lesson;
}

export function LessonPlayer({ lesson }: LessonPlayerProps) {
  const { chunks, totalFrames } = useMemo(() => buildChunks(lesson), [lesson]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const playerRef = useRef<PlayerRef>(null);

  const currentChunk = chunks[chunkIndex];
  const playerWidth = 960;
  const playerHeight = (playerWidth * lesson.height) / lesson.width;

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !currentChunk || currentChunk.kind !== 'video') {
      return;
    }

    const { startFrame, endFrame } = currentChunk;
    player.seekTo(startFrame);
    player.play();

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      if (e.detail.frame >= endFrame - 1) {
        player.pause();
        player.removeEventListener('frameupdate', handleFrameUpdate);
        setChunkIndex((i) => Math.min(i + 1, chunks.length - 1));
      }
    };

    player.addEventListener('frameupdate', handleFrameUpdate);
    return () => player.removeEventListener('frameupdate', handleFrameUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunkIndex]);

  const handleContinue = () => {
    setChunkIndex((i) => Math.min(i + 1, chunks.length - 1));
  };

  return (
    <div className="relative" style={{ width: playerWidth, height: playerHeight }}>
      <Player
        ref={playerRef}
        component={LessonPreview}
        inputProps={{ lesson }}
        durationInFrames={totalFrames}
        compositionWidth={lesson.width}
        compositionHeight={lesson.height}
        fps={lesson.fps}
        style={{ width: playerWidth, height: playerHeight }}
        controls={false}
      />
      <AnimatePresence>
        {currentChunk?.kind === 'question' ? (
          <QuestionOverlay key={currentChunk.scene.id} scene={currentChunk.scene} onContinue={handleContinue} />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
