import { LineChart } from 'lucide-react';

import { PlaceholderScreen } from '../PlaceholderScreen';

export default function StudentProgress() {
  return (
    <PlaceholderScreen
      icon={LineChart}
      title="El progreso de alumnos está en construcción"
      description="Acá vas a ver quién avanza, quién quedó atrás y dónde abandonan más."
    />
  );
}
