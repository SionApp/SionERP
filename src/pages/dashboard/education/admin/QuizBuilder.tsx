import { ListChecks } from 'lucide-react';

import { PlaceholderScreen } from '../PlaceholderScreen';

export default function QuizBuilder() {
  return (
    <PlaceholderScreen
      icon={ListChecks}
      title="El constructor de quiz está en construcción"
      description="Acá vas a armar las preguntas, marcar la correcta y ajustar el puntaje mínimo."
    />
  );
}
