import { FileText } from 'lucide-react';

import { PlaceholderScreen } from '../PlaceholderScreen';

export default function LessonViewer() {
  return (
    <PlaceholderScreen
      icon={FileText}
      title="El visor de lección está en construcción"
      description="Acá vas a leer la lección paso a paso, guardando tu avance en cada uno."
    />
  );
}
