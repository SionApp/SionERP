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
} from 'lucide-react';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import { useDiscipleship } from '@/hooks/useDiscipleship';

interface CreateGoalModalProps {
  onSuccess: () => void;
}

const goalTypeOptions = [
  { value: 'growth', label: 'Crecimiento de Miembros', icon: Users, color: 'text-blue-500' },
  { value: 'attendance', label: 'Asistencia Promedio', icon: TrendingUp, color: 'text-green-500' },
  { value: 'conversions', label: 'Conversiones', icon: Target, color: 'text-purple-500' },
  { value: 'baptisms', label: 'Bautismos', icon: Droplets, color: 'text-cyan-500' },
  { value: 'new_groups', label: 'Nuevos Grupos', icon: Church, color: 'text-orange-500' },
  { value: 'multiplications', label: 'Multiplicaciones', icon: Church, color: 'text-pink-500' },
  { value: 'spiritual_health', label: 'Salud Espiritual', icon: Heart, color: 'text-red-500' },
];

export function CreateGoalModal({ onSuccess }: CreateGoalModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    goal_type: '',
    title: '',
    description: '',
    target_metric: '',
    target_value: 0,
    deadline: '',
    priority: 2,
    zone_id: '',
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
    };

    const data = {
      ...formData,
      target_metric: metricMap[formData.goal_type] || '',
    };

    try {
      setIsSubmitting(true);
      await DiscipleshipAnalyticsService.createGoal(data);
      onSuccess();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Error al crear objetivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Goal Type */}
      <div className="space-y-2">
        <Label>Tipo de Objetivo</Label>
        <Select
          value={formData.goal_type}
          onValueChange={(value) =>
            setFormData({ ...formData, goal_type: value })
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
