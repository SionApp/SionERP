import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileSectionHeader } from '@/components/mobile/MobileSectionHeader';
import { MobileStatTile } from '@/components/mobile/MobileStatTile';
import { useAuth } from '@/hooks/useAuth';
import { useMobileMode } from '@/hooks/useMobileMode';
import { usePermissions } from '@/hooks/usePermissions';
import { DiscipleshipAnalyticsService } from '@/services/discipleship-analytics.service';
import type { AssignmentTreeNode } from '@/services/discipleship-analytics.service';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Target,
  Plus,
  TrendingUp,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Zap,
  PenLine,
  UserPlus,
  History,
} from 'lucide-react';
import { CreateGoalModal } from '@/components/discipleship/CreateGoalModal';
import { GoalCard } from '@/components/discipleship/GoalCard';
import { GoalAssignmentNode } from '@/components/discipleship/GoalAssignmentNode';
import { CascadeAssignStep } from '@/components/discipleship/CascadeAssignStep';
import { GoalActivityTimeline } from '@/components/discipleship/GoalActivityTimeline';
import type { DiscipleshipGoal } from '@/types/discipleship.types';

export function GoalsDashboard() {
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const isMobileApp = useMobileMode();
  const queryClient = useQueryClient();
  const [goals, setGoals] = useState<DiscipleshipGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assigningGoalId, setAssigningGoalId] = useState<string | null>(null);
  const [assignmentTrees, setAssignmentTrees] = useState<Record<string, AssignmentTreeNode>>({});
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [expandedActivity, setExpandedActivity] = useState<Record<string, boolean>>({});

  const canSeeAll = (permissions?.role_level ?? 0) >= 400;
  const canCreate = (permissions?.role_level ?? 0) >= 200;
  const userLevel = permissions?.hierarchy_level ?? undefined;

  const loadGoals = async (status?: string) => {
    try {
      setLoading(true);
      const data = await DiscipleshipAnalyticsService.getGoals(status);
      setGoals(data ?? []);
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

  const loadAssignmentTree = async (goalId: string) => {
    try {
      const tree = await DiscipleshipAnalyticsService.getAssignmentTree(goalId);
      setAssignmentTrees(prev => ({ ...prev, [goalId]: tree }));
    } catch (error) {
      // No tree yet — ignore
    }
  };

  const toggleExpand = (goalId: string) => {
    const isExpanded = expandedGoals[goalId];
    setExpandedGoals(prev => ({ ...prev, [goalId]: !isExpanded }));
    if (!isExpanded && !assignmentTrees[goalId]) {
      loadAssignmentTree(goalId);
    }
  };

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
    } catch {
      toast.error('Error al prorrogar objetivo');
    }
  };

  const handleCloseIncomplete = async (goalId: string, reason: string, percentage: number) => {
    try {
      await DiscipleshipAnalyticsService.closeIncomplete(goalId, reason, percentage);
      toast.success('Objetivo cerrado');
      loadGoals();
    } catch {
      toast.error('Error al cerrar objetivo');
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const pendingGoals = goals.filter(g => g.status === 'pending_review');

  const getMeasurementBadge = (type?: 'automatic' | 'manual' | string) => {
    if (type === 'manual') {
      return (
        <Badge variant="outline" className="text-xs">
          <PenLine className="h-3 w-3 mr-1" />
          Manual
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        <Zap className="h-3 w-3 mr-1" />
        Automático
      </Badge>
    );
  };

  // ── Dialogs compartidos entre web y mobile (controlados, sin trigger) ──
  const sharedDialogs = (
    <>
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Objetivo Estratégico</DialogTitle>
          </DialogHeader>
          <CreateGoalModal
            onSuccess={handleGoalCreated}
            userLevel={userLevel}
            canSeeAll={canSeeAll}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!assigningGoalId}
        onOpenChange={open => {
          if (!open) setAssigningGoalId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar responsables</DialogTitle>
          </DialogHeader>
          {assigningGoalId && (
            <CascadeAssignStep
              goalId={assigningGoalId}
              userLevel={userLevel}
              canSeeAll={canSeeAll}
              onComplete={() => {
                setAssigningGoalId(null);
                loadAssignmentTree(assigningGoalId);
                loadGoals();
              }}
              onSkip={() => setAssigningGoalId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  // ── Lista de objetivos (compartida — GoalCard + árbol + actividad) ──
  const goalsList = (
    <div className="space-y-4">
      {goals.map(goal => {
        const isExpanded = expandedGoals[goal.id] ?? false;
        const tree = assignmentTrees[goal.id];
        const treeNodes = (tree as unknown as { tree?: AssignmentTreeNode[] } | undefined)?.tree;
        const hasTree = Array.isArray(treeNodes) && treeNodes.length > 0;

        return (
          <div key={goal.id} className="space-y-2">
            <GoalCard
              goal={goal}
              onExtend={handleExtend}
              onCloseIncomplete={handleCloseIncomplete}
              onUpdate={loadGoals}
              canDelete={canSeeAll || goal.created_by === user?.id}
            />

            {/* Assignment tree toggle + assign button */}
            <div className="ml-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => toggleExpand(goal.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronRight className="h-3 w-3 mr-1" />
                  )}
                  {getMeasurementBadge(goal.measurement_type)}
                  <span className="ml-1">Ver árbol de asignaciones</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setExpandedActivity(prev => ({ ...prev, [goal.id]: !prev[goal.id] }))
                  }
                >
                  <History className="h-3 w-3" />
                  Actividad
                </Button>
                {(canSeeAll || (userLevel ?? 0) >= 4) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setAssigningGoalId(goal.id)}
                  >
                    <UserPlus className="h-3 w-3" />
                    Asignar
                  </Button>
                )}
              </div>

              {isExpanded && (
                <div className="mt-2 ml-2 space-y-2">
                  {!tree ? (
                    <p className="text-xs text-muted-foreground py-2">Cargando asignaciones...</p>
                  ) : !hasTree ? (
                    <p className="text-xs text-muted-foreground py-2">Sin asignaciones aún.</p>
                  ) : (
                    (treeNodes ?? []).map(node => (
                      <GoalAssignmentNode
                        key={node.id}
                        node={node}
                        currentUserId={user?.id ?? ''}
                        goalId={goal.id}
                        depth={0}
                        userLevel={userLevel}
                        canSeeAll={canSeeAll}
                        onProgressUpdate={() => {
                          loadGoals();
                          loadAssignmentTree(goal.id);
                        }}
                      />
                    ))
                  )}
                </div>
              )}

              {expandedActivity[goal.id] && (
                <div className="mt-2 ml-2 border-l-2 border-muted pl-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Historial de actividad
                  </p>
                  <GoalActivityTimeline goalId={goal.id} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── Modo mobile exclusivo ──
  if (isMobileApp) {
    return (
      <div className="pb-4">
        {/* Stats: chips compactos horizontales */}
        {loading ? (
          <div className="flex gap-2 px-4 pt-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 w-24 rounded-2xl shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex gap-2 px-4 pt-4 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MobileStatTile label="Activos" value={activeGoals.length} />
            <MobileStatTile label="Completados" value={completedGoals.length} tone="success" />
            <MobileStatTile
              label="En Revisión"
              value={pendingGoals.length}
              tone={pendingGoals.length > 0 ? 'warning' : 'default'}
            />
            <MobileStatTile label="Total" value={goals.length} />
          </div>
        )}

        <MobileSectionHeader
          title="Objetivos"
          action={
            canCreate ? (
              <button
                onClick={() => setShowCreateModal(true)}
                aria-label="Nuevo objetivo"
                className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            ) : undefined
          }
        />

        {loading ? (
          <div className="px-4 space-y-3">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-muted-foreground px-4">
            <Target className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium text-foreground">No hay objetivos</p>
            <p className="text-xs text-center">
              Creá el primer objetivo estratégico para el ministerio
            </p>
          </div>
        ) : (
          <div className="px-4">{goalsList}</div>
        )}

        {sharedDialogs}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Objetivos Estratégicos</h1>
          <p className="text-muted-foreground">Gestiona las metas de crecimiento del ministerio</p>
        </div>
        {canCreate && (
          <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Objetivo
          </Button>
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
            <div className="text-2xl font-bold text-green-500">{completedGoals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Revisión</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingGoals.length}</div>
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

      {/* Goals List with Tree View */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando objetivos...</div>
      ) : goals.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No hay objetivos</h3>
          <p className="text-muted-foreground mb-4">
            Creá el primer objetivo estratégico para el ministerio
          </p>
          {canCreate && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Objetivo
            </Button>
          )}
        </Card>
      ) : (
        goalsList
      )}

      {sharedDialogs}
    </div>
  );
}
