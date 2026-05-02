import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { DiscipleshipGoal } from '@/types/discipleship.types';

interface GoalReviewModalProps {
  goal: DiscipleshipGoal;
  onExtend: (goalId: string, newDeadline: string, reason: string) => void;
  onCloseIncomplete: (goalId: string, reason: string, percentage: number) => void;
}

export function GoalReviewModal({
  goal,
  onExtend,
  onCloseIncomplete,
}: GoalReviewModalProps) {
  const [showExtend, setShowExtend] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');
  const [reason, setReason] = useState('');

  const handleExtend = () => {
    if (!newDeadline || !reason) {
      toast.error('Completa todos los campos');
      return;
    }
    onExtend(goal.id, newDeadline, reason);
    setShowExtend(false);
    setNewDeadline('');
    setReason('');
  };

  const handleClose = () => {
    if (!reason) {
      toast.error('Ingresa la razón del cierre');
      return;
    }
    onCloseIncomplete(goal.id, reason, goal.progress_percentage);
    setShowClose(false);
    setReason('');
  };

  return (
    <div className="space-y-6">
      {/* Información del Goal */}
      <div className="p-4 bg-accent/20 rounded-lg space-y-2">
        <h4 className="font-semibold">{goal.title}</h4>
        <p className="text-sm text-muted-foreground">{goal.description}</p>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Meta: {goal.target_value}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Actual: {goal.current_value} ({goal.progress_percentage.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Prórroga */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowExtend(!showExtend)}
        >
          <Clock className="h-4 w-4 mr-2" />
          Conceder Prórroga
        </Button>

        {showExtend && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="new-deadline">Nueva Fecha Límite</Label>
              <Input
                id="new-deadline"
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extend-reason">Razón de la Prórroga</Label>
              <Textarea
                id="extend-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explicación de por qué se necesita más tiempo..."
                rows={3}
              />
            </div>
            <Button onClick={handleExtend} className="w-full">
              Confirmar Prórroga
            </Button>
          </div>
        )}
      </div>

      {/* Cierre Incompleto */}
      <div className="space-y-2">
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setShowClose(!showClose)}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Cerrar como Incompleto ({goal.progress_percentage.toFixed(1)}%)
        </Button>

        {showClose && (
          <div className="space-y-4 p-4 border border-destructive/30 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="close-reason">
                Razón del Cierre Incompleto
              </Label>
              <Textarea
                id="close-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Se alcanzó el ${goal.progress_percentage.toFixed(1)}% de la meta. Razón...`}
                rows={3}
              />
            </div>
            <Button variant="destructive" onClick={handleClose} className="w-full">
              Confirmar Cierre Incompleto
            </Button>
          </div>
        )}
      </div>

      {/* Info adicional */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• La prórroga notificará al creador y su jerarquía superior</p>
        <p>• El cierre incompleto quedará registrado con el porcentaje alcanzado</p>
        <p>• Ambas acciones son irreversibles</p>
      </div>
    </div>
  );
}
