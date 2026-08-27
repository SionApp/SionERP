import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMobileMode } from '@/hooks/useMobileMode';
import { ReportsContent, ReportsHistory, ReportSchedules } from './reports/report-content';
import { MobileReportsScreen } from '@/components/mobile/screens/ReportsScreen';

const ReportsPage = () => {
  const isMobileApp = useMobileMode();

  if (isMobileApp) {
    return <MobileReportsScreen />;
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Trazabilidad y analítica de la congregación. Exportá en CSV o PDF.
        </p>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
          <TabsTrigger value="schedules">Programación</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="mt-4">
          <ReportsContent />
        </TabsContent>
        <TabsContent value="schedules" className="mt-4">
          <ReportSchedules />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <ReportsHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
