import { ClipboardCheck } from 'lucide-react';

import { PlaceholderScreen } from '../PlaceholderScreen';

export default function ReviewQueue() {
  return (
    <PlaceholderScreen
      icon={ClipboardCheck}
      title="La cola de revisión está en construcción"
      description="Acá vas a calificar las respuestas cortas que quedaron pendientes de revisión."
    />
  );
}
