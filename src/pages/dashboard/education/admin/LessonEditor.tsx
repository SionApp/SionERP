import { FileEdit } from 'lucide-react';

import { PlaceholderScreen } from '../PlaceholderScreen';

export default function LessonEditor() {
  return (
    <PlaceholderScreen
      icon={FileEdit}
      title="El editor de lección está en construcción"
      description="Acá vas a escribir la lección por bloques con preview en vivo del lado del alumno."
    />
  );
}
