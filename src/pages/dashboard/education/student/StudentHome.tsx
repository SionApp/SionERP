import { LayoutDashboard } from 'lucide-react';

import { PlaceholderScreen } from '../PlaceholderScreen';

export default function StudentHome() {
  return (
    <PlaceholderScreen
      icon={LayoutDashboard}
      title="Tu inicio está en camino"
      description="Acá vas a ver tus cursos en curso, tu avance general y los quizzes pendientes."
    />
  );
}
