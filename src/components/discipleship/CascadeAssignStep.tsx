import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import { Globe, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Assignee {
  user_id: string;
  user_name: string;
  hierarchy_level: number;
}

interface CascadeAssignStepProps {
  goalId: string;
  userLevel?: number;
  canSeeAll?: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const LEVEL_LABELS: Record<number, string> = {
  4: 'Coordinadores',
  3: 'Supervisores Generales',
  2: 'Supervisores Auxiliares',
  1: 'Líderes',
};

export function CascadeAssignStep({
  goalId,
  userLevel,
  canSeeAll = false,
  onComplete,
  onSkip,
}: CascadeAssignStepProps) {
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [targetValues, setTargetValues] = useState<Record<string, number>>({});

  useEffect(() => {
    DiscipleshipAnalyticsService.getAvailableAssignees(goalId)
      .then((data) => {
        setAssignees(data);
        const initialChecked: Record<string, boolean> = {};
        const initialTargets: Record<string, number> = {};
        data.forEach((a) => {
          initialChecked[a.user_id] = true;
          initialTargets[a.user_id] = 0;
        });
        setChecked(initialChecked);
        setTargetValues(initialTargets);
      })
      .catch(() => setAssignees([]))
      .finally(() => setLoading(false));
  }, [goalId]);

  const handleToggle = (userId: string) => {
    setChecked((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleTargetChange = (userId: string, value: number) => {
    setTargetValues((prev) => ({ ...prev, [userId]: value }));
  };

  const handleConfirm = async () => {
    const selected = assignees.filter((a) => checked[a.user_id]);
    if (selected.length === 0) {
      onSkip();
      return;
    }
    try {
      setIsSubmitting(true);
      await DiscipleshipAnalyticsService.createAssignments(goalId, {
        assignments: selected.map((a) => ({
          assigned_to: a.user_id,
          target_value: targetValues[a.user_id] ?? 0,
          parent_assignment_id: null,
        })),
      });
      toast.success('Objetivo asignado exitosamente');
      onComplete();
    } catch {
      toast.error('Error al asignar el objetivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchZones = async () => {
    try {
      setIsSubmitting(true);
      await DiscipleshipAnalyticsService.batchAssignToZones(goalId);
      toast.success('Objetivo asignado a todas las zonas');
      onComplete();
    } catch {
      toast.error('Error al asignar a todas las zonas');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agrupar por hierarchy_level
  const grouped = assignees.reduce<Record<number, Assignee[]>>((acc, a) => {
    if (!acc[a.hierarchy_level]) acc[a.hierarchy_level] = [];
    acc[a.hierarchy_level].push(a);
    return acc;
  }, {});
  const levels = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a); // de mayor a menor nivel

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b">
        <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Asignar responsables</h3>
          <p className="text-sm text-muted-foreground">
            {assignees.length === 0
              ? 'Todos los disponibles ya están asignados a este objetivo.'
              : 'Todos seleccionados por defecto. Desmarcá los que no correspondan.'}
          </p>
        </div>
      </div>

      {assignees.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay personas disponibles para asignar.
        </p>
      ) : (
        <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
          {levels.map((level) => (
            <div key={level}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {LEVEL_LABELS[level] ?? `Nivel ${level}`}
                </Badge>
              </div>
              <div className="space-y-2 ml-1">
                {grouped[level].map((a) => (
                  <div key={a.user_id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`a-${a.user_id}`}
                      checked={checked[a.user_id] ?? true}
                      onCheckedChange={() => handleToggle(a.user_id)}
                    />
                    <Label htmlFor={`a-${a.user_id}`} className="flex-1 cursor-pointer font-medium">
                      {a.user_name}
                    </Label>
                    {checked[a.user_id] && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">
                          Meta:
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          className="w-24 h-8 text-sm"
                          value={targetValues[a.user_id] ?? 0}
                          onChange={(e) =>
                            handleTargetChange(a.user_id, parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {canSeeAll && (
        <div className="flex items-center gap-2 p-3 border border-dashed rounded-lg">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground flex-1">
            O asigná directamente a todos los coordinadores de todas las zonas
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={handleBatchZones}
          >
            Asignar a todas las zonas
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={isSubmitting}>
          Omitir por ahora
        </Button>
        <Button
          type="button"
          disabled={isSubmitting || assignees.length === 0}
          onClick={handleConfirm}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Asignando...
            </>
          ) : (
            'Confirmar asignación'
          )}
        </Button>
      </div>
    </div>
  );
}
