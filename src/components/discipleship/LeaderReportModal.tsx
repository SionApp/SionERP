import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DiscipleshipService } from '@/services/discipleship.service';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import type { ActiveAssignment } from '@/services/discipleship-analytics.service';
import type { CreateReportRequest } from '@/types/discipleship.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  Baby,
  BookOpen,
  BookText,
  Church,
  Flame,
  GraduationCap,
  Megaphone,
  RefreshCw,
  Send,
  Smile,
  Target,
  User,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface LeaderReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  periodStart: Date;
  periodEnd: Date;
  groupId: string;
}

export function LeaderReportModal({
  isOpen,
  onClose,
  onSuccess,
  periodStart,
  periodEnd,
  groupId,
}: LeaderReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualAssignments, setManualAssignments] = useState<ActiveAssignment[]>([]);
  const [manualValues, setManualValues] = useState<Record<string, number>>({});
  const [reportData, setReportData] = useState({
    // Métricas del Grupo
    attendance_nd: 0,
    attendance_dm: 0,
    attendance_friends: 0,
    attendance_kids: 0,
    group_discipleships: 0,
    group_evangelism: 0,

    // Vida del Líder
    leader_new_disciples_care: 0,
    leader_mature_disciples_care: 0,
    spiritual_journal_days: 0,
    leader_evangelism: 0,

    // Asistencia Congregacional
    service_attendance_prayer: false,
    service_attendance_sunday: false,
    doctrine_attendance: 0,

    // Estado del Grupo
    is_multiplying: false,
  });

  // Compute current ISO week string (YYYY-WNN)
  const getCurrentIsoWeek = (): string => {
    const now = periodStart;
    const jan4 = new Date(now.getFullYear(), 0, 4);
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const diffMs = now.getTime() - startOfWeek1.getTime();
    const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isOpen) return;
    const isoWeek = getCurrentIsoWeek();
    DiscipleshipAnalyticsService.getActiveManualAssignments(isoWeek)
      .then(assignments => {
        setManualAssignments(assignments);
        const initial: Record<string, number> = {};
        assignments.forEach(a => {
          initial[a.assignment_id] = 0;
        });
        setManualValues(initial);
      })
      .catch(() => {
        // Non-blocking: don't show error, just skip the section
        setManualAssignments([]);
      });
  }, [isOpen]);

  const handleSubmit = async () => {
    try {
      if (!groupId) {
        toast.error('No se ha proporcionado un ID de grupo válido');
        return;
      }

      setIsSubmitting(true);
      const periodStartStr = format(periodStart, 'yyyy-MM-dd');
      const periodEndStr = format(periodEnd, 'yyyy-MM-dd');
      const createData: CreateReportRequest = {
        report_type: 'leader', // Reporte de líder de célula
        report_level: 1, // Jerarquía de Líder
        period_start: periodStartStr,
        period_end: periodEndStr,
        report_data: {
          group_id: groupId,
          attendance_nd: reportData.attendance_nd,
          attendance_dm: reportData.attendance_dm,
          attendance_friends: reportData.attendance_friends,
          attendance_kids: reportData.attendance_kids,
          group_discipleships: reportData.group_discipleships,
          group_evangelism: reportData.group_evangelism,

          leader_new_disciples_care: reportData.leader_new_disciples_care,
          leader_mature_disciples_care: reportData.leader_mature_disciples_care,
          spiritual_journal_days: reportData.spiritual_journal_days,
          leader_evangelism: reportData.leader_evangelism,

          service_attendance_prayer: reportData.service_attendance_prayer,
          service_attendance_sunday: reportData.service_attendance_sunday,
          doctrine_attendance: reportData.doctrine_attendance,

          is_multiplying: reportData.is_multiplying,
        },
      };

      const result = await DiscipleshipService.createReport(createData);
      const newReportId = result?.report_id ?? null;

      // Submit manual goal progress (non-blocking — report is already saved)
      const progressPromises = manualAssignments
        .filter(a => manualValues[a.assignment_id] > 0)
        .map(a =>
          DiscipleshipAnalyticsService.submitManualProgress(
            a.assignment_id,
            manualValues[a.assignment_id],
            newReportId,
            periodStartStr,
            periodEndStr
          ).catch(() => {
            toast.warning('Reporte guardado, progreso del objetivo no se sincronizó');
          })
        );
      await Promise.allSettled(progressPromises);

      toast.success('Reporte de líder enviado exitosamente');
      onSuccess();
      onClose();
      resetForm();
    } catch (error: unknown) {
      console.error('Error submitting report:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'Error al enviar el reporte');
      } else {
        toast.error('Error al enviar el reporte');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setReportData({
      attendance_nd: 0,
      attendance_dm: 0,
      attendance_friends: 0,
      attendance_kids: 0,
      group_discipleships: 0,
      group_evangelism: 0,
      leader_new_disciples_care: 0,
      leader_mature_disciples_care: 0,
      spiritual_journal_days: 0,
      leader_evangelism: 0,
      service_attendance_prayer: false,
      service_attendance_sunday: false,
      doctrine_attendance: 0,
      is_multiplying: false,
    });
    setManualAssignments([]);
    setManualValues({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reporte Semanal del Líder</DialogTitle>
          <DialogDescription>
            Semana del {format(periodStart, 'dd MMM', { locale: es })} al{' '}
            {format(periodEnd, 'dd MMM yyyy', { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* SECCIÓN 1: Reporte Grupal */}
          <div className="p-5 border rounded-xl bg-card text-card-foreground shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Reporte Grupal</h3>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-muted-foreground block mb-2">
                Asistencia a la reunión de discipulado
              </Label>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="doctrine_attendance"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    Doctrina
                  </Label>
                  <Input
                    id="doctrine_attendance"
                    type="number"
                    min="0"
                    className="bg-background"
                    value={reportData.doctrine_attendance}
                    onChange={e =>
                      setReportData({
                        ...reportData,
                        doctrine_attendance: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="attendance_nd"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    Nuevos Discípulos
                  </Label>
                  <Input
                    id="attendance_nd"
                    type="number"
                    min="0"
                    className="bg-background"
                    value={reportData.attendance_nd}
                    onChange={e =>
                      setReportData({ ...reportData, attendance_nd: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="attendance_dm"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    Disc. Maduros
                  </Label>
                  <Input
                    id="attendance_dm"
                    type="number"
                    min="0"
                    className="bg-background"
                    value={reportData.attendance_dm}
                    onChange={e =>
                      setReportData({ ...reportData, attendance_dm: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="attendance_friends"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Smile className="h-4 w-4 text-muted-foreground" />
                    Amigos
                  </Label>
                  <Input
                    id="attendance_friends"
                    type="number"
                    min="0"
                    className="bg-background"
                    value={reportData.attendance_friends}
                    onChange={e =>
                      setReportData({
                        ...reportData,
                        attendance_friends: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="attendance_kids"
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <Baby className="h-4 w-4 text-muted-foreground" />
                    Niños
                  </Label>
                  <Input
                    id="attendance_kids"
                    type="number"
                    min="0"
                    className="bg-background"
                    value={reportData.attendance_kids}
                    onChange={e =>
                      setReportData({
                        ...reportData,
                        attendance_kids: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t">
              <div className="space-y-2">
                <Label
                  htmlFor="group_discipleships"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  Discipulados realizados en el grupo
                </Label>
                <Input
                  id="group_discipleships"
                  type="number"
                  min="0"
                  className="bg-background"
                  value={reportData.group_discipleships}
                  onChange={e =>
                    setReportData({
                      ...reportData,
                      group_discipleships: parseInt(e.target.value) || 0,
                    })
                  }
                />
                {reportData.attendance_dm > 0 &&
                  reportData.group_discipleships < reportData.attendance_dm && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Con {reportData.attendance_dm} disc. maduros se esperan al menos{' '}
                      {reportData.attendance_dm} discipulados — reportaste{' '}
                      {reportData.group_discipleships}.
                    </p>
                  )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="group_evangelism"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  Personas evangelizadas en grupo
                </Label>
                <Input
                  id="group_evangelism"
                  type="number"
                  min="0"
                  className="bg-background"
                  value={reportData.group_evangelism}
                  onChange={e =>
                    setReportData({
                      ...reportData,
                      group_evangelism: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Reporte Personal */}
          <div className="p-5 border rounded-xl bg-card text-card-foreground shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg">
                <User className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Reporte Personal (Líder)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label
                  htmlFor="leader_new_disciples_care"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  Atención a Nuevos Discípulos
                </Label>
                <Input
                  id="leader_new_disciples_care"
                  type="number"
                  min="0"
                  className="bg-background"
                  value={reportData.leader_new_disciples_care}
                  onChange={e =>
                    setReportData({
                      ...reportData,
                      leader_new_disciples_care: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="leader_mature_disciples_care"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Atención Personalizada a D.M.
                </Label>
                <Input
                  id="leader_mature_disciples_care"
                  type="number"
                  min="0"
                  className="bg-background"
                  value={reportData.leader_mature_disciples_care}
                  onChange={e =>
                    setReportData({
                      ...reportData,
                      leader_mature_disciples_care: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <Label
                  htmlFor="spiritual_journal_days"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <BookText className="h-4 w-4 text-muted-foreground" />
                  Diario Espiritual personal (Días)
                </Label>
                <Input
                  id="spiritual_journal_days"
                  type="number"
                  min="0"
                  className="bg-background"
                  value={reportData.spiritual_journal_days}
                  onChange={e =>
                    setReportData({
                      ...reportData,
                      spiritual_journal_days: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="leader_evangelism"
                  className="flex items-center gap-2 text-sm font-medium"
                >
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  Evangelismo personal
                </Label>
                <Input
                  id="leader_evangelism"
                  type="number"
                  min="0"
                  className="bg-background"
                  value={reportData.leader_evangelism}
                  onChange={e =>
                    setReportData({
                      ...reportData,
                      leader_evangelism: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Asistencia a Servicios / Doctrina */}
          <div className="p-5 border rounded-xl bg-card text-card-foreground shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg">
                <Church className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Asistencia Congregacional</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                htmlFor="service_prayer_leader"
                className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                  reportData.service_attendance_prayer
                    ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <Checkbox
                  id="service_prayer_leader"
                  checked={reportData.service_attendance_prayer}
                  onCheckedChange={checked =>
                    setReportData({ ...reportData, service_attendance_prayer: checked === true })
                  }
                />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Servicio de Oración
                </div>
              </label>

              <label
                htmlFor="service_sunday_leader"
                className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                  reportData.service_attendance_sunday
                    ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <Checkbox
                  id="service_sunday_leader"
                  checked={reportData.service_attendance_sunday}
                  onCheckedChange={checked =>
                    setReportData({ ...reportData, service_attendance_sunday: checked === true })
                  }
                />
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Church className="h-4 w-4 text-slate-500" />
                  Servicio Dominical
                </div>
              </label>
            </div>
          </div>

          {/* SECCIÓN 4: Estado del Grupo */}
          <div className="p-5 border rounded-xl bg-card text-card-foreground shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg">
                <Flame className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Estado del Grupo</h3>
            </div>

            <label
              htmlFor="is_multiplying"
              className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                reportData.is_multiplying
                  ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Checkbox
                id="is_multiplying"
                checked={reportData.is_multiplying}
                onCheckedChange={checked =>
                  setReportData({ ...reportData, is_multiplying: checked === true })
                }
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Flame className="h-4 w-4 text-amber-500" />
                  ¿Está este grupo en proceso de multiplicación?
                </div>
                <p className="text-xs text-muted-foreground ml-7">
                  Marcar si están formando un nuevo líder y el grupo se dividirá pronto
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* SECCIÓN: Objetivos Manuales */}
        {manualAssignments.length > 0 && (
          <div className="p-5 border rounded-xl bg-card text-card-foreground shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Objetivos manuales</h3>
                <p className="text-sm text-muted-foreground">Reportá tu avance para esta semana</p>
              </div>
            </div>
            <div className="space-y-3">
              {manualAssignments.map(a => (
                <div key={a.assignment_id} className="space-y-1">
                  <Label htmlFor={`goal-${a.assignment_id}`} className="text-sm font-medium">
                    {a.goal_title}
                    {a.already_reported_for_period && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (ya reportado esta semana)
                      </span>
                    )}
                  </Label>
                  <Input
                    id={`goal-${a.assignment_id}`}
                    type="number"
                    min={0}
                    className="bg-background"
                    value={manualValues[a.assignment_id] ?? 0}
                    onChange={e =>
                      setManualValues({
                        ...manualValues,
                        [a.assignment_id]: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Reporte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
