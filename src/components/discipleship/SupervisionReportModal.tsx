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
import { Textarea } from '@/components/ui/textarea';
import { DiscipleshipService } from '@/services/discipleship.service';
import type { CreateReportRequest } from '@/types/discipleship.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SupervisionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  periodStart: Date;
  periodEnd: Date;
  hierarchyLevel: number; // 2: Auxiliar, 3: General, 4: Coordinador
}

export function SupervisionReportModal({
  isOpen,
  onClose,
  onSuccess,
  periodStart,
  periodEnd,
  hierarchyLevel,
}: SupervisionReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportData, setReportData] = useState({
    // Trabajo de Supervisión
    new_disciples_care: 0,
    team_care: 0,
    visited_groups: 0,
    // Vida Espiritual Personal
    spiritual_journal_days: 0,
    personal_evangelism: 0,
    service_attendance_prayer: false,
    service_attendance_sunday: false,
    // Métricas de la Zona/Sector
    zone_total_discipleships: 0,
    zone_total_evangelism: 0,
    // Comentarios
    comments: '',
  });

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const createData: CreateReportRequest = {
        report_type: 'weekly', // Unificado a Semanal
        report_level: hierarchyLevel,
        period_start: format(periodStart, 'yyyy-MM-dd'),
        period_end: format(periodEnd, 'yyyy-MM-dd'),
        report_data: {
          new_disciples_care: reportData.new_disciples_care,
          team_care: reportData.team_care,
          visited_groups: reportData.visited_groups,
          spiritual_journal_days: reportData.spiritual_journal_days,
          personal_evangelism: reportData.personal_evangelism,
          service_attendance_prayer: reportData.service_attendance_prayer,
          service_attendance_sunday: reportData.service_attendance_sunday,
          zone_total_discipleships: reportData.zone_total_discipleships,
          zone_total_evangelism: reportData.zone_total_evangelism,
          comments: reportData.comments,
        },
      };

      await DiscipleshipService.createReport(createData);

      toast.success('Reporte de supervisión enviado exitosamente');
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
      new_disciples_care: 0,
      team_care: 0,
      visited_groups: 0,
      spiritual_journal_days: 0,
      personal_evangelism: 0,
      service_attendance_prayer: false,
      service_attendance_sunday: false,
      zone_total_discipleships: 0,
      zone_total_evangelism: 0,
      comments: '',
    });
  };

  // Nombres descriptivos según el nivel
  const getLevelName = (level: number) => {
    switch (level) {
      case 2:
        return 'Supervisor Auxiliar';
      case 3:
        return 'Supervisor General';
      case 4:
        return 'Coordinador';
      default:
        return 'Supervisión';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reporte Semanal - {getLevelName(hierarchyLevel)}</DialogTitle>
          <DialogDescription>
            Semana del {format(periodStart, 'dd MMM', { locale: es })} al{' '}
            {format(periodEnd, 'dd MMM yyyy', { locale: es })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-8 py-4">
          
          {/* SECCIÓN 1: Trabajo de Supervisión */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">📘 Trabajo de Supervisión</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_disciples_care">1️⃣ Atención a nuevos discípulos (Cant.)</Label>
                <Input
                  id="new_disciples_care"
                  type="number"
                  min="0"
                  value={reportData.new_disciples_care}
                  onChange={e =>
                    setReportData({ ...reportData, new_disciples_care: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team_care">2️⃣ Atención a equipo de trabajo (Cant.)</Label>
                <Input
                  id="team_care"
                  type="number"
                  min="0"
                  placeholder="Líderes, D.M. o Sup."
                  value={reportData.team_care}
                  onChange={e =>
                    setReportData({ ...reportData, team_care: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visited_groups">3️⃣ Grupos de Discipulado visitados (Cant.)</Label>
                <Input
                  id="visited_groups"
                  type="number"
                  min="0"
                  value={reportData.visited_groups}
                  onChange={e =>
                    setReportData({ ...reportData, visited_groups: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Vida Espiritual Personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">🕊️ Vida Espiritual Personal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spiritual_journal_days">4️⃣ Diario espiritual personal (Cant.)</Label>
                <Input
                  id="spiritual_journal_days"
                  type="number"
                  min="0"
                  value={reportData.spiritual_journal_days}
                  onChange={e =>
                    setReportData({ ...reportData, spiritual_journal_days: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personal_evangelism">5️⃣ Personas evangelizadas (Cant.)</Label>
                <Input
                  id="personal_evangelism"
                  type="number"
                  min="0"
                  value={reportData.personal_evangelism}
                  onChange={e =>
                    setReportData({
                      ...reportData,
                      personal_evangelism: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <Label>6️⃣ Asistencia a servicios congregacionales</Label>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="service_prayer" 
                    checked={reportData.service_attendance_prayer}
                    onCheckedChange={(checked) => 
                      setReportData({ ...reportData, service_attendance_prayer: checked === true })
                    }
                  />
                  <Label htmlFor="service_prayer" className="font-normal cursor-pointer">🙏 Servicio de Oración</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="service_sunday" 
                    checked={reportData.service_attendance_sunday}
                    onCheckedChange={(checked) => 
                      setReportData({ ...reportData, service_attendance_sunday: checked === true })
                    }
                  />
                  <Label htmlFor="service_sunday" className="font-normal cursor-pointer">⛪ Servicio Dominical</Label>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Métricas de Zona/Sector */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">📊 Métricas de Zona / Sector</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone_discipleships">7️⃣ Total de Discipulados en la Zona (Cant.)</Label>
                <Input
                  id="zone_discipleships"
                  type="number"
                  min="0"
                  value={reportData.zone_total_discipleships}
                  onChange={e =>
                    setReportData({ ...reportData, zone_total_discipleships: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone_evangelism">8️⃣ Total de Evangelismos en la Zona (Cant.)</Label>
                <Input
                  id="zone_evangelism"
                  type="number"
                  min="0"
                  value={reportData.zone_total_evangelism}
                  onChange={e =>
                    setReportData({ ...reportData, zone_total_evangelism: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: Comentarios */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">📝 Comentarios</h3>
            <div className="space-y-2">
              <Label htmlFor="comments">9️⃣ Motivos de oración, necesidades u observaciones</Label>
              <Textarea
                id="comments"
                placeholder="Escribe tus observaciones de la semana..."
                value={reportData.comments}
                onChange={e => setReportData({ ...reportData, comments: e.target.value })}
                rows={4}
              />
            </div>
          </div>

        </div>
        
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
