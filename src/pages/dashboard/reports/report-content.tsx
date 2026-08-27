import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3,
  Calendar,
  Download,
  FileText,
  PieChart,
  Plus,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ReportsService } from '@/services/reports.service';
import { UserService } from '@/services/user.service';
import type {
  LabelValue,
  ReportFrequency,
  ReportType,
  UpsertReportScheduleInput,
} from '@/types/report.types';
import { downloadReportCSV, printReportPDF, type ReportSection } from './report-export';

// ── Small presentational bits ──
function MetricTiles({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(it => (
        <div key={it.label} className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">{it.label}</p>
          <p className="text-xl font-bold tabular-nums">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

function BarList({ data }: { data: LabelValue[] }) {
  const max = Math.max(1, ...data.map(d => d.value));
  if (data.length === 0) return <p className="py-2 text-sm text-muted-foreground">Sin datos.</p>;
  return (
    <div className="space-y-1.5">
      {data.map(d => (
        <div key={d.label} className="relative overflow-hidden rounded-md border border-border/60">
          <div
            className="absolute inset-y-0 left-0 bg-primary/10"
            style={{ width: `${Math.round((d.value / max) * 100)}%` }}
          />
          <div className="relative flex items-center justify-between px-3 py-1.5 text-sm">
            <span className="capitalize">{d.label}</span>
            <span className="font-semibold tabular-nums">{d.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportBlock({
  title,
  Icon,
  loading,
  sections,
  children,
  reportType,
}: {
  title: string;
  Icon: typeof Users;
  loading: boolean;
  sections: ReportSection[];
  children: React.ReactNode;
  reportType: ReportType;
}) {
  async function exportAs(format: 'csv' | 'pdf') {
    if (format === 'csv') downloadReportCSV(title, sections);
    else printReportPDF(title, sections);
    try {
      await ReportsService.logGeneration(reportType, format, title);
    } catch {
      /* logging is best-effort */
    }
    toast.success(`Reporte exportado (${format.toUpperCase()})`);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {!loading && (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              onClick={() => exportAs('csv')}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1"
              onClick={() => exportAs('pdf')}
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <Skeleton className="h-28 w-full" /> : children}
      </CardContent>
    </Card>
  );
}

export function ReportsContent() {
  const users = useQuery({
    queryKey: ['report-users'],
    queryFn: () => ReportsService.getUsersReport(),
  });
  const growth = useQuery({
    queryKey: ['report-growth'],
    queryFn: () => ReportsService.getGrowthReport(),
  });
  const demo = useQuery({
    queryKey: ['report-demographics'],
    queryFn: () => ReportsService.getDemographicsReport(),
  });
  const acts = useQuery({
    queryKey: ['report-activities'],
    queryFn: () => ReportsService.getActivitiesReport(),
  });

  const u = users.data;
  const d = demo.data;
  const a = acts.data;

  return (
    <div className="space-y-4">
      <ReportBlock
        title="Reporte de Usuarios"
        Icon={Users}
        loading={users.isLoading}
        reportType="users"
        sections={
          u
            ? [
                {
                  heading: 'Resumen',
                  rows: [
                    { label: 'Total', value: u.total },
                    { label: 'Miembros activos', value: u.active_members },
                    { label: 'Bautizados', value: u.baptized },
                    { label: 'Nuevos este mes', value: u.new_this_month },
                  ],
                },
                { heading: 'Por rol', rows: u.by_role },
              ]
            : []
        }
      >
        {u && (
          <>
            <MetricTiles
              items={[
                { label: 'Total', value: u.total },
                { label: 'Activos', value: u.active_members },
                { label: 'Bautizados', value: u.baptized },
                { label: 'Nuevos/mes', value: u.new_this_month },
              ]}
            />
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Por rol</p>
              <BarList data={u.by_role} />
            </div>
          </>
        )}
      </ReportBlock>

      <ReportBlock
        title="Reporte de Crecimiento"
        Icon={TrendingUp}
        loading={growth.isLoading}
        reportType="growth"
        sections={growth.data ? [{ heading: 'Nuevos por mes', rows: growth.data.monthly }] : []}
      >
        {growth.data && <BarList data={growth.data.monthly} />}
      </ReportBlock>

      <ReportBlock
        title="Reporte Demográfico"
        Icon={PieChart}
        loading={demo.isLoading}
        reportType="demographics"
        sections={
          d
            ? [
                { heading: 'Por edad', rows: d.by_age },
                { heading: 'Estado civil', rows: d.by_marital_status },
                { heading: 'Por rol', rows: d.by_role },
              ]
            : []
        }
      >
        {d && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Por edad</p>
              <BarList data={d.by_age} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Estado civil</p>
              <BarList data={d.by_marital_status} />
            </div>
          </div>
        )}
      </ReportBlock>

      <ReportBlock
        title="Reporte de Actividades"
        Icon={BarChart3}
        loading={acts.isLoading}
        reportType="activities"
        sections={
          a
            ? [
                {
                  heading: 'Resumen',
                  rows: [
                    { label: 'Eventos', value: a.total_events },
                    { label: 'Próximos', value: a.upcoming_events },
                    { label: 'Inscriptos', value: a.total_registrations },
                  ],
                },
                { heading: 'Top eventos', rows: a.top_events },
              ]
            : []
        }
      >
        {a && (
          <>
            <MetricTiles
              items={[
                { label: 'Eventos', value: a.total_events },
                { label: 'Próximos', value: a.upcoming_events },
                { label: 'Inscriptos', value: a.total_registrations },
              ]}
            />
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Top eventos por inscriptos
              </p>
              <BarList data={a.top_events} />
            </div>
          </>
        )}
      </ReportBlock>
    </div>
  );
}

const REPORT_LABEL: Record<ReportType, string> = {
  users: 'Usuarios',
  growth: 'Crecimiento',
  demographics: 'Demográfico',
  activities: 'Actividades',
};

export function ReportsHistory() {
  const { data: generations = [], isLoading } = useQuery({
    queryKey: ['report-generations'],
    queryFn: () => ReportsService.getGenerations(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (generations.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Todavía no se generó ningún reporte.
      </p>
    );
  }
  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {generations.map(g => (
        <div key={g.id} className="flex items-center justify-between px-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{g.title || REPORT_LABEL[g.report_type]}</p>
            <p className="text-xs text-muted-foreground">
              {g.generated_by || 'Sistema'} ·{' '}
              {new Date(g.generated_at).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <Badge variant="secondary" className="uppercase">
            {g.format}
          </Badge>
        </div>
      ))}
    </div>
  );
}

const FREQUENCY_LABEL: Record<ReportFrequency, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
};

function NewScheduleDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('users');
  const [format, setFormat] = useState<'csv' | 'pdf'>('pdf');
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<ReportFrequency>('weekly');
  const [recipientIds, setRecipientIds] = useState<string[]>([]);

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-report-schedule'],
    queryFn: () => UserService.getAllUsers(),
    enabled: open,
  });
  const eligible = users.filter(u => ['supervisor', 'staff', 'pastor', 'admin'].includes(u.role));

  const create = useMutation({
    mutationFn: (input: UpsertReportScheduleInput) => ReportsService.createSchedule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success('Programación creada');
      setOpen(false);
      setTitle('');
      setRecipientIds([]);
    },
    onError: () => toast.error('No se pudo crear la programación'),
  });

  function toggleRecipient(id: string) {
    setRecipientIds(prev => (prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nueva programación
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva programación de reporte</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Reporte mensual de crecimiento"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de reporte</Label>
              <Select value={reportType} onValueChange={v => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(REPORT_LABEL) as ReportType[]).map(t => (
                    <SelectItem key={t} value={t}>
                      {REPORT_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frecuencia</Label>
              <Select value={frequency} onValueChange={v => setFrequency(v as ReportFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Formato</Label>
            <Select value={format} onValueChange={v => setFormat(v as 'csv' | 'pdf')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Destinatarios</Label>
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
              {eligible.length === 0 && (
                <p className="text-xs text-muted-foreground">Sin usuarios elegibles.</p>
              )}
              {eligible.map(u => (
                <label key={u.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={recipientIds.includes(u.id)}
                    onCheckedChange={() => toggleRecipient(u.id)}
                  />
                  {u.first_name} {u.last_name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!title || recipientIds.length === 0 || create.isPending}
            onClick={() =>
              create.mutate({
                report_type: reportType,
                format,
                title,
                frequency,
                recipient_user_ids: recipientIds,
              })
            }
          >
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReportSchedules() {
  const queryClient = useQueryClient();
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['report-schedules'],
    queryFn: () => ReportsService.getSchedules(),
  });

  const toggleActive = useMutation({
    mutationFn: (s: (typeof schedules)[number]) =>
      ReportsService.updateSchedule(s.id, {
        report_type: s.report_type,
        format: s.format,
        title: s.title,
        frequency: s.frequency,
        recipient_user_ids: s.recipient_user_ids,
        active: !s.active,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report-schedules'] }),
    onError: () => toast.error('No se pudo actualizar la programación'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => ReportsService.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success('Programación eliminada');
    },
    onError: () => toast.error('No se pudo eliminar la programación'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          El sistema avisa por email a los destinatarios cuando el reporte está listo.
        </p>
        <NewScheduleDialog />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Todavía no hay reportes programados.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {schedules.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.title}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {REPORT_LABEL[s.report_type]} · {FREQUENCY_LABEL[s.frequency]} · próxima:{' '}
                  {new Date(s.next_run_at).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={s.active}
                  onCheckedChange={() => toggleActive.mutate(s)}
                  aria-label="Activo"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => remove.mutate(s.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
