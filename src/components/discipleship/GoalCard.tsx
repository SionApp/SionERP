import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Target,
  TrendingUp,
  Users,
  Church,
  Droplets,
  GitBranch,
  Heart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { DiscipleshipGoal } from '@/types/discipleship.types';
import { GoalReviewModal } from './GoalReviewModal';

interface GoalCardProps {
  goal: DiscipleshipGoal;
  onExtend: (goalId: string, newDeadline: string, reason: string) => void;
  onCloseIncomplete: (goalId: string, reason: string, percentage: number) => void;
  onUpdate: () => void;
}

const goalTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
  growth: { icon: Users, label: 'Crecimiento', color: 'text-blue-500' },
  attendance: { icon: TrendingUp, label: 'Asistencia', color: 'text-green-500' },
  conversions: { icon: Target, label: 'Conversiones', color: 'text-purple-500' },
  baptisms: { icon: Droplets, label: 'Bautismos', color: 'text-cyan-500' },
  new_groups: { icon: GitBranch, label: 'Nuevos Grupos', color: 'text-orange-500' },
  multiplications: { icon: Church, label: 'Multiplicaciones', color: 'text-pink-500' },
  spiritual_health: { icon: Heart, label: 'Salud Espiritual', color: 'text-red-500' },
};

export function GoalCard({ goal, onExtend, onCloseIncomplete, onUpdate }: GoalCardProps) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const config = goalTypeConfig[goal.goal_type] || goalTypeConfig.growth;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'pending_review': return 'bg-yellow-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Crítica';
      case 2: return 'Normal';
      case 3: return 'Baja';
      default: return 'Normal';
    }
  };

  const handleExtend = (newDeadline: string, reason: string) => {
    onExtend(goal.id, newDeadline, reason);
    setShowReviewModal(false);
  };

  const handleCloseIncomplete = (reason: string) => {
    onCloseIncomplete(goal.id, reason, goal.progress_percentage);
    setShowReviewModal(false);
  };

  return (
    <Card className="relative overflow-hidden border-l-4" style={{ borderLeftColor: config.color.replace('text-', '#') }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <config.icon className={`h-5 w-5 ${config.color}`} />
            <div>
              <CardTitle className="text-base">{goal.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{config.label}</p>
            </div>
          </div>
          <Badge className={getStatusColor(goal.status)}>
            {goal.status === 'completed' ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : goal.status === 'pending_review' ? (
              <Clock className="h-3 w-3 mr-1" />
            ) : goal.status === 'failed' ? (
              <AlertTriangle className="h-3 w-3 mr-1" />
            ) : null}
            {goal.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">
              {goal.current_value} / {goal.target_value} ({goal.progress_percentage.toFixed(1)}%)
            </span>
          </div>
          <Progress value={goal.progress_percentage} className="h-2" />
        </div>

        {/* Description */}
        {goal.description && (
          <p className="text-sm text-muted-foreground">{goal.description}</p>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {goal.deadline ? format(new Date(goal.deadline), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Prioridad: {getPriorityLabel(goal.priority)}</span>
          </div>
          {goal.zone_name && (
            <div className="flex items-center gap-1 col-span-2">
              <Church className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Zona: {goal.zone_name}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {goal.status === 'pending_review' || goal.status === 'failed' ? (
          <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Revisar Objetivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Revisar Objetivo: {goal.title}</DialogTitle>
              </DialogHeader>
              <GoalReviewModal
                goal={goal}
                onExtend={handleExtend}
                onCloseIncomplete={handleCloseIncomplete}
              />
            </DialogContent>
          </Dialog>
        ) : goal.status === 'active' ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newDeadline = prompt('Nueva fecha límite (YYYY-MM-DD):', goal.deadline);
                const reason = prompt('Razón de la prórroga:', '');
                if (newDeadline && reason) {
                  onExtend(goal.id, newDeadline, reason);
                }
              }}
            >
              <Clock className="h-4 w-4 mr-2" />
              Prórroga
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
