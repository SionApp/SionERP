import { CheckCircle2 } from 'lucide-react';

import { PlaceholderScreen } from '../PlaceholderScreen';

export default function QuizResult() {
  return (
    <PlaceholderScreen
      icon={CheckCircle2}
      title="El resultado del quiz está en construcción"
      description="Acá vas a ver tu puntaje y el repaso de cada respuesta."
    />
  );
}
