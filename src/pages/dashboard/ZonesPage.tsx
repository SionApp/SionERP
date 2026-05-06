import { useState } from 'react';
import ZoneManagement from '@/components/discipleship/ZoneManagement';
import ZoneMapView from '@/components/zones/ZoneMapView';
import { Button } from '@/components/ui/button';
import { Map, List } from 'lucide-react';

const ZonesPage = () => {
  const [view, setView] = useState<'list' | 'map'>('list');

  return (
    <div className="space-y-3 sm:space-y-6 animate-fade-in p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Zonas Territoriales</h1>
          <p className="text-sm sm:text-base text-muted-foreground w-full md:w-2/3">
            Administra la distribución de zonas geográficas, asigna supervisores, grupos y miembros a diferentes niveles territoriales.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            Lista
          </Button>
          <Button
            variant={view === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('map')}
            className="gap-2"
          >
            <Map className="h-4 w-4" />
            Mapa
          </Button>
        </div>
      </div>

      {view === 'map' ? <ZoneMapView /> : <ZoneManagement />}
    </div>
  );
};

export default ZonesPage;
