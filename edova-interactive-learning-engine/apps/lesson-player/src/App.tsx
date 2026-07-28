import lessonData from '@lessons/waste-management-5rs/lesson.json';
import type { Lesson } from './types/lesson';
import { LessonPlayer } from './remotion/LessonPlayer';

const lesson = lessonData as unknown as Lesson;

function App() {
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-xl font-medium text-neutral-700">{lesson.title}</h1>
      <LessonPlayer lesson={lesson} />
    </div>
  );
}

export default App;
