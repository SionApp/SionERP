import { LayoutGrid } from 'lucide-react';

import { PlaceholderScreen } from '../PlaceholderScreen';

export default function CourseCatalog() {
  return (
    <PlaceholderScreen
      icon={LayoutGrid}
      title="El catálogo está en construcción"
      description="Muy pronto vas a poder filtrar los cursos publicados por track y sumarte a uno."
    />
  );
}
