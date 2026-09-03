import { BookOpen } from 'lucide-react';

import { PlaceholderScreen } from '../PlaceholderScreen';

export default function CourseDetail() {
  return (
    <PlaceholderScreen
      icon={BookOpen}
      title="El temario del curso está en construcción"
      description="Acá vas a ver los módulos, las lecciones y tu progreso en este curso."
    />
  );
}
