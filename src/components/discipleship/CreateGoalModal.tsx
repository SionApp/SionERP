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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Target,
  Users,
  TrendingUp,
  Droplets,
  Church,
  Heart,
  Info,
  Sparkles,
} from 'lucide-react';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import { useDiscipleship } from '@/hooks/useDiscipleship';
import { CascadeAssignStep } from './CascadeAssignStep';

interface CreateGoalModalProps {
  onSuccess: () => void;
  userLevel?: number;
  canSeeAll?: boolean;
}

const goalTypeOptions = [
  { value: 'growth', label: 'Crecimiento de Miembros', icon: Users, color: 'text-blue-500' },
  { value: 'attendance', label: 'Asistencia Promedio', icon: TrendingUp, color: 'text-green-500' },
  { value: 'conversions', label: 'Conversiones', icon: Target, color: 'text-purple-500' },
  { value: 'baptisms', label: 'Bautismos', icon: Droplets, color: 'text-cyan-500' },
  { value: 'new_groups', label: 'Nuevos Grupos', icon: Church, color: 'text-orange-500' },
  { value: 'multiplications', label: 'Multiplicaciones', icon: Church, color: 'text-pink-500' },
  { value: 'spiritual_health', label: 'Salud Espiritual', icon: Heart, color: 'text-red-500' },
  { value: 'personalizado', label: 'Personalizado', icon: Sparkles, color: 'text-violet-500' },
];

export function CreateGoalModal({ onSuccess, userLevel, canSeeAll = false }: CreateGoalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'cascade'>('form');
  const [newGoalId, setNewGoalId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    goal_type: '',
    title: '',
    description: '',
    target_metric: '',
    target_value: 0,
    deadline: '',
    priority: 2,
    zone_id: '',
    measurement_type: 'manual' as 'automatic' | 'manual',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.goal_type || !formData.title || !formData.target_value || !formData.deadline) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    // Auto-select target_metric based on goal_type
    const metricMap: Record<string, string> = {
      growth: 'member_count',
      attendance: 'attendance',
      conversions: 'conversions',
      baptisms: 'baptisms',
      new_groups: 'group_count',
      multiplications: 'multiplication_count',
      spiritual_health: 'spiritual_temperature',
      personalizado: 'custom',
    };

    const data = {
      ...formData,
      target_metric: metricMap[formData.goal_type] || '',
    };

    try {
      setIsSubmitting(true);
      const result = await DiscipleshipAnalyticsService.createGoal(data);
      const goalId: string = result?.goal_id ?? result?.id ?? '';
      if (goalId) {
        setNewGoalId(goalId);
        setStep('cascade');
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Error al crear objetivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'cascade' && newGoalId) {
    return (
      <CascadeAssignStep
        goalId={newGoalId}
        userLevel={userLevel}
        canSeeAll={canSeeAll}
        onComplete={() => {
          onSuccess();
          setStep('form');
          setNewGoalId(null);
        }}
        onSkip={() => {
          onSuccess();
          setStep('form');
          setNewGoalId(null);
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Goal Type */}
      <div className="space-y-2">
        <Label>Tipo de Objetivo</Label>
        <Select
          value={formData.goal_type}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              goal_type: value,
              // Personalizado siempre es manual — no hay forma de medirlo automáticamente
              measurement_type: value === 'personalizado' ? 'manual' : formData.measurement_type,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un tipo..." />
          </SelectTrigger>
          <SelectContent>
            {goalTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <option.icon className={`h-4 w-4 ${option.color}`} />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label>Título</Label>
        <Input
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
          placeholder="Ej: Alcanzar 150 miembros"
        />
      </div>

      {/* Measurement Type — oculto para personalizado (siempre manual) */}
      {formData.goal_type === 'personalizado' ? (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
          <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-violet-700 dark:text-violet-300">
            El objetivo personalizado se mide manualmente. Los asignados reportarán el avance en su reporte semanal.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Tipo de Medición</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={formData.measurement_type === 'automatic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, measurement_type: 'automatic' })}
            >
              Automático
            </Button>
            <Button
              type="button"
              variant={formData.measurement_type === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, measurement_type: 'manual' })}
            >
              Manual
            </Button>
          </div>
          {formData.measurement_type === 'automatic' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                El avance se toma automáticamente del reporte semanal de los asignados. No necesitan completar ningún campo extra.
              </p>
            </div>
          )}
          {formData.measurement_type === 'manual' && (
            <p className="text-sm text-muted-foreground">
              Los usuarios asignados reportarán el avance manualmente cada semana desde su reporte semanal.
            </p>
          )}
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label>Descripción (Opcional)</Label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Detalles adicionales sobre el objetivo..."
          rows={3}
        />
      </div>

      {/* Target Value & Deadline */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valor Meta</Label>
          <Input
            type="number"
            value={formData.target_value || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                target_value: parseInt(e.target.value) || 0,
              })
            }
            placeholder="Ej: 150"
          />
        </div>
        <div className="space-y-2">
          <Label>Fecha Límite</Label>
          <Input
            type="date"
            value={formData.deadline}
            onChange={(e) =>
              setFormData({ ...formData, deadline: e.target.value })
            }
          />
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label>Prioridad</Label>
        <Select
          value={formData.priority.toString()}
          onValueChange={(value) =>
            setFormData({ ...formData, priority: parseInt(value) })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona prioridad..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Crítica</SelectItem>
            <SelectItem value="2">Normal</SelectItem>
            <SelectItem value="3">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando...' : 'Crear Objetivo'}
        </Button>
      </div>
    </form>
  );
}
