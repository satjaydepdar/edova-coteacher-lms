import type { Lesson, LessonScene, QuestionScene } from '../types/lesson';

function isQuestionScene(scene: LessonScene): scene is QuestionScene {
  return scene.type === 'mcq' || scene.type === 'scenario_mcq';
}

export interface VideoChunk {
  kind: 'video';
  startFrame: number;
  endFrame: number;
}

export interface QuestionChunk {
  kind: 'question';
  scene: QuestionScene;
}

export type Chunk = VideoChunk | QuestionChunk;

/**
 * Groups consecutive "video" scenes (title/diagram/summary) into single
 * chunks with an absolute frame range on the shared LessonPreview timeline.
 * Question scenes become their own chunks with no timeline presence -
 * LessonPlayer pauses the Player at a video chunk's endFrame and shows the
 * question chunk as a DOM overlay instead.
 */
export function buildChunks(lesson: Lesson): { chunks: Chunk[]; totalFrames: number } {
  const chunks: Chunk[] = [];
  let frame = 0;
  let videoStart: number | null = null;

  for (const scene of lesson.scenes) {
    if (isQuestionScene(scene)) {
      if (videoStart !== null) {
        chunks.push({ kind: 'video', startFrame: videoStart, endFrame: frame });
        videoStart = null;
      }
      chunks.push({ kind: 'question', scene });
      continue;
    }

    if (videoStart === null) {
      videoStart = frame;
    }
    frame += scene.durationInFrames;
  }

  if (videoStart !== null) {
    chunks.push({ kind: 'video', startFrame: videoStart, endFrame: frame });
  }

  return { chunks, totalFrames: frame };
}
