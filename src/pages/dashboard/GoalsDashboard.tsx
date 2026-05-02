import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Target,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import { CreateGoalModal } from '@/components/discipleship/CreateGoalModal';
import { GoalCard } from '@/components/discipleship/GoalCard';

export function GoalsDashboard() {
  const { permissions } = usePermissions();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadGoals = async (status?: string) => {
    try {
      setLoading(true);
      const data = await DiscipleshipAnalyticsService.getGoals(status);
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error('Error al cargar objetivos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const handleGoalCreated = () => {
    setShowCreateModal(false);
    loadGoals();
    toast.success('Objetivo creado exitosamente');
  };

  const handleExtend = async (goalId: string, newDeadline: string, reason: string) => {
    try {
      await DiscipleshipAnalyticsService.extendGoal(goalId, newDeadline, reason);
      toast.success('Prórroga concedida');
      loadGoals();
    } catch (error) {
      toast.error('Error al prorrogar objetivo');
    }
  };

  const handleCloseIncomplete = async (goalId: string, reason: string, percentage: number) => {
    try {
      await DiscipleshipAnalyticsService.closeIncomplete(goalId, reason, percentage);
      toast.success('Objetivo cerrado');
      loadGoals();
    } catch (error) {
      toast.error('Error al cerrar objetivo');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; class: string }> = {
      active: { label: 'Activo', class: 'bg-green-500' },
      completed: { label: 'Completado', class: 'bg-blue-500' },
      failed: { label: 'Fallido', class: 'bg-red-500' },
      pending_review: { label: 'En revisión', class: 'bg-yellow-500' },
      cancelled: { label: 'Cancelado', class: 'bg-gray-500' },
    };
    const statusConfig = config[status] || config.active;
    return <Badge class={statusConfig.class}>{statusConfig.label}</Badge>;
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const pendingGoals = goals.filter(g => g.status === 'pending_review');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Objetivos Estratégicos</h1>
          <p className="text-muted-foreground">
            Gestiona las metas de crecimiento del ministerio
          </p>
        </div>
        {permissions?.role_level >= 200 && (
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Objetivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Objetivo Estratégico</DialogTitle>
              </DialogHeader>
              <CreateGoalModal onSuccess={handleGoalCreated} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objetivos Activos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {completedGoals.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Revisión</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {pendingGoals.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Objetivos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goals.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando objetivos...
        </div>
      ) : goals.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No hay objetivos</h3>
          <p className="text-muted-foreground mb-4">
            Crea tu primer objetivo estraégico para el ministerio
          </p>
          {permissions?.role_level >= 200 && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Objetivo
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onExtend={handleExtend}
              onCloseIncomplete={handleCloseIncomplete}
              onUpdate={loadGoals}
            />
          ))}
        </div>
      )}
    </div>
  );
}
