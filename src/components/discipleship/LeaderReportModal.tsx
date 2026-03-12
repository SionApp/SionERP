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
import type { CreateReportRequest } from '@/types/discipleship.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RefreshCw, Send } from 'lucide-react';
import { useState } from 'react';
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
    doctrine_attendance: false,
  });

  const handleSubmit = async () => {
    try {
      if (!groupId) {
        toast.error('No se ha proporcionado un ID de grupo válido');
        return;
      }

      setIsSubmitting(true);
      const createData: CreateReportRequest = {
        report_type: 'weekly', // Reporte semanal base unificado
        report_level: 1, // Jerarquía de Líder
        period_start: format(periodStart, 'yyyy-MM-dd'),
        period_end: format(periodEnd, 'yyyy-MM-dd'),
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
        },
      };

      await DiscipleshipService.createReport(createData);

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
      doctrine_attendance: false,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📊 Reporte Semanal del Líder</DialogTitle>
          <DialogDescription>
            Semana del {format(periodStart, 'dd MMM', { locale: es })} al{' '}
            {format(periodEnd, 'dd MMM yyyy', { locale: es })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-8 py-4">
          
          {/* SECCIÓN 1: Reporte Grupal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">📝 REPORTE GRUPAL</h3>
            
            <div className="space-y-3">
              <Label className="text-md font-medium text-muted-foreground block mb-2">Asistencia a la reunión de discipulado:</Label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="attendance_nd">Nuevos Discípulos</Label>
                  <Input
                    id="attendance_nd"
                    type="number"
                    min="0"
                    value={reportData.attendance_nd}
                    onChange={e =>
                      setReportData({ ...reportData, attendance_nd: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance_dm">Disc. Maduros</Label>
                  <Input
                    id="attendance_dm"
                    type="number"
                    min="0"
                    value={reportData.attendance_dm}
                    onChange={e =>
                      setReportData({ ...reportData, attendance_dm: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance_friends">Amigos</Label>
                  <Input
                    id="attendance_friends"
                    type="number"
                    min="0"
                    value={reportData.attendance_friends}
                    onChange={e =>
                      setReportData({ ...reportData, attendance_friends: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attendance_kids">Niños</Label>
                  <Input
                    id="attendance_kids"
                    type="number"
                    min="0"
                    value={reportData.attendance_kids}
                    onChange={e =>
                      setReportData({ ...reportData, attendance_kids: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="group_discipleships">Discipulados realizados en el grupo (Cant.)</Label>
                <Input
                  id="group_discipleships"
                  type="number"
                  min="0"
                  value={reportData.group_discipleships}
                  onChange={e =>
                    setReportData({ ...reportData, group_discipleships: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group_evangelism">Personas evangelizadas en grupo (Cant.)</Label>
                <Input
                  id="group_evangelism"
                  type="number"
                  min="0"
                  value={reportData.group_evangelism}
                  onChange={e =>
                    setReportData({ ...reportData, group_evangelism: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Reporte Personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">👤 REPORTE PERSONAL (LÍDER)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leader_new_disciples_care">Atención a Nuevos Discípulos (Cant.)</Label>
                <Input
                  id="leader_new_disciples_care"
                  type="number"
                  min="0"
                  value={reportData.leader_new_disciples_care}
                  onChange={e =>
                    setReportData({ ...reportData, leader_new_disciples_care: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leader_mature_disciples_care">Atención Personalizada a D.M. (Cant.)</Label>
                <Input
                  id="leader_mature_disciples_care"
                  type="number"
                  min="0"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="spiritual_journal_days">Diario Espiritual personal (Días/Cant.)</Label>
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
                <Label htmlFor="leader_evangelism">Evangelismo personal (Cant.)</Label>
                <Input
                  id="leader_evangelism"
                  type="number"
                  min="0"
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">⛪ ASISTENCIA CONGREGACIONAL</h3>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="service_prayer_leader" 
                    checked={reportData.service_attendance_prayer}
                    onCheckedChange={(checked) => 
                      setReportData({ ...reportData, service_attendance_prayer: checked === true })
                    }
                  />
                  <Label htmlFor="service_prayer_leader" className="font-normal cursor-pointer">🙏 Servicio de Oración</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="service_sunday_leader" 
                    checked={reportData.service_attendance_sunday}
                    onCheckedChange={(checked) => 
                      setReportData({ ...reportData, service_attendance_sunday: checked === true })
                    }
                  />
                  <Label htmlFor="service_sunday_leader" className="font-normal cursor-pointer">⛪ Servicio Dominical</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="doctrine_leader" 
                    checked={reportData.doctrine_attendance}
                    onCheckedChange={(checked) => 
                      setReportData({ ...reportData, doctrine_attendance: checked === true })
                    }
                  />
                  <Label htmlFor="doctrine_leader" className="font-normal cursor-pointer">📖 Asistencia a Doctrina</Label>
                </div>
              </div>
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
