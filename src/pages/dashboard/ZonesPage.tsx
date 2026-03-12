import ZoneManagement from '@/components/discipleship/ZoneManagement';

const ZonesPage = () => {
  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Zonas Territoriales</h1>
        <p className="text-muted-foreground w-full md:w-2/3">
          Administra la distribución de zonas geográficas, asigna supervisores, grupos y miembros a diferentes niveles territoriales.
        </p>
      </div>
      <ZoneManagement />
    </div>
  );
};

export default ZonesPage;
