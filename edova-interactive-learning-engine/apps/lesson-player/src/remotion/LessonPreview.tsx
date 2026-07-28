import { Series } from 'remotion';
import type { Lesson } from '../types/lesson';
import { TitleScene } from './scenes/TitleScene';
import { SummaryScene } from './scenes/SummaryScene';
import { DiagramSceneRenderer } from './DiagramSceneRenderer';

interface LessonPreviewProps {
  lesson: Lesson;
}

/**
 * Renders every "video" scene (title/diagram/summary) back to back on one
 * timeline. Question scenes have no timeline presence - LessonPlayer pauses
 * this composition at chunk boundaries and shows a QuestionOverlay instead.
 */
export const LessonPreview: React.FC<LessonPreviewProps> = ({ lesson }) => {
  return (
    <Series>
      {lesson.scenes.map((scene) => {
        if (scene.type === 'title') {
          return (
            <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
              <TitleScene title={scene.title} subtitle={scene.subtitle} />
            </Series.Sequence>
          );
        }
        if (scene.type === 'diagram') {
          return (
            <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
              <DiagramSceneRenderer title={scene.title} diagram={scene.diagram} />
            </Series.Sequence>
          );
        }
        if (scene.type === 'summary') {
          return (
            <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
              <SummaryScene title={scene.title} recapLines={scene.recapLines} />
            </Series.Sequence>
          );
        }
        return null;
      })}
    </Series>
  );
};
