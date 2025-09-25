import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ZoneManagement from "@/components/discipleship/ZoneManagement";
import DiscipleshipMap from "@/components/discipleship/DiscipleshipMap";

const ZonesPage = () => {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Zonas de Discipulado y Mapa
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra las zonas geográficas y visualiza las células en el mapa
        </p>
      </header>

      <section aria-labelledby="zones-management">
        <ZoneManagement />
      </section>

      <section aria-labelledby="zones-map">
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Células</CardTitle>
            <CardDescription>
              Vista interactiva con datos de demostración; puedes cargar tu token público de Mapbox para mapas reales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DiscipleshipMap />
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ZonesPage;
