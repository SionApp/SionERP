import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { LeaderReportModal } from '@/components/discipleship/LeaderReportModal';
import { useLeaderDiscipleshipData } from '@/hooks/useLeaderDiscipleshipData';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { CreateReportRequest } from '@/types/discipleship.types';
import { endOfWeek, format, startOfWeek, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Plus,
  RefreshCw,
  Send,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function LeaderDashboard() {
  const { stats, myReports, goals, groups, loading, error, refetch, refetchReports } =
    useLeaderDiscipleshipData();

  // Report form state
  const [showReportModal, setShowReportModal] = useState(false);

  // Get current week dates
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const currentWeekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });
  const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 });
  const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 });

  // Check if report for this week already exists
  const hasCurrentWeekReport = myReports.some((report: { period_start: string }) => {
    const reportStart = new Date(report.period_start);
    return reportStart >= lastWeekStart && reportStart <= currentWeekEnd;
  });

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  const myGroup = groups[0]; // El líder generalmente tiene un grupo asignado

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Mi Célula</h1>
          <p className="text-sm sm:text-base text-muted-foreground truncate">
            {myGroup ? myGroup.group_name : 'Dashboard de líder de célula'}
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <Button
            disabled={hasCurrentWeekReport || !myGroup}
            onClick={() => setShowReportModal(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="truncate">
              {hasCurrentWeekReport ? 'Reporte enviado' : 'Nuevo Reporte'}
            </span>
          </Button>

          {myGroup && (
            <LeaderReportModal
              isOpen={showReportModal}
              onClose={() => setShowReportModal(false)}
              onSuccess={refetchReports}
              periodStart={lastWeekStart}
              periodEnd={lastWeekEnd}
              groupId={myGroup.id}
            />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myGroup?.member_count || stats?.total_members || 0}
            </div>
            <p className="text-xs text-muted-foreground">{myGroup?.active_members || 0} activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Prom.</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.average_attendance || 0}%</div>
            <p className="text-xs text-muted-foreground">Últimas 4 semanas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Reunión</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myGroup?.meeting_day || 'No definido'}</div>
            <p className="text-xs text-muted-foreground">
              {myGroup?.meeting_time || ''} - {myGroup?.meeting_location || ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado Reporte</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {hasCurrentWeekReport ? (
              <>
                <div className="text-2xl font-bold text-green-600">
                  <CheckCircle className="h-6 w-6 inline" />
                </div>
                <p className="text-xs text-muted-foreground">Reporte semanal enviado</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-600">
                  <Clock className="h-6 w-6 inline" />
                </div>
                <p className="text-xs text-muted-foreground">Pendiente de enviar</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals Section */}
      {goals && goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Mis Objetivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {goals.map(
                (goal: {
                  id: string;
                  target_metric?: string;
                  description?: string;
                  current_value?: number;
                  target_value?: number;
                  progress_percentage?: number;
                }) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{goal.target_metric || goal.description}</span>
                      <span className="text-sm text-muted-foreground">
                        {goal.current_value || 0} / {goal.target_value || 0}
                      </span>
                    </div>
                    <Progress value={goal.progress_percentage || 0} className="h-2" />
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mis Reportes Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No has enviado reportes aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReports.slice(0, 5).map(report => {
                const reportData = report.report_data as {
                  attendance?: number;
                  conversions?: number;
                };
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        Semana {format(new Date(report.period_start), 'dd MMM', { locale: es })} -{' '}
                        {format(new Date(report.period_end), 'dd MMM', { locale: es })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Asistencia: {reportData?.attendance || 0} • Conversiones:{' '}
                        {reportData?.conversions || 0}
                      </p>
                    </div>
                    <Badge
                      variant={
                        report.status === 'approved'
                          ? 'default'
                          : report.status === 'submitted'
                            ? 'secondary'
                            : report.status === 'revision_required'
                              ? 'destructive'
                              : 'outline'
                      }
                    >
                      {report.status === 'approved'
                        ? 'Aprobado'
                        : report.status === 'submitted'
                          ? 'Pendiente'
                          : report.status === 'revision_required'
                            ? 'Revisar'
                            : 'Borrador'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
