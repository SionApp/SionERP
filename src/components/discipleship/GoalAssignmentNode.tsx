import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AssignmentTreeNode } from '@/services/discipleship-analytics.service';
import { GitBranch } from 'lucide-react';
import { useState } from 'react';
import { CascadeAssignStep } from './CascadeAssignStep';

interface GoalAssignmentNodeProps {
  node: AssignmentTreeNode;
  currentUserId: string;
  goalId: string;
  depth?: number;
  userLevel?: number;
  canSeeAll?: boolean;
  onProgressUpdate?: () => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Activo', variant: 'default' },
  completed: { label: 'Completado', variant: 'secondary' },
  overdue: { label: 'Vencido', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
  pending: { label: 'Pendiente', variant: 'outline' },
};

export function GoalAssignmentNode({
  node,
  currentUserId,
  goalId,
  depth = 0,
  userLevel,
  canSeeAll = false,
  onProgressUpdate,
}: GoalAssignmentNodeProps) {
  const [showReassign, setShowReassign] = useState(false);
  const isOwner = node.assigned_to === currentUserId;
  const progressValue = node.target_value > 0
    ? Math.min((node.current_value / node.target_value) * 100, 100)
    : 0;
  const statusInfo = statusConfig[node.status] ?? { label: node.status, variant: 'outline' as const };

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-muted pl-4' : ''} space-y-2`}>
      <div className="p-3 border rounded-lg bg-card space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate">
              {node.assigned_to_name || node.assigned_to}
            </span>
            <Badge variant={statusInfo.variant} className="text-xs flex-shrink-0">
              {statusInfo.label}
            </Badge>
          </div>
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs flex-shrink-0"
              onClick={() => setShowReassign(true)}
            >
              <GitBranch className="h-3 w-3 mr-1" />
              Re-asignar
            </Button>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>
              {node.current_value} / {node.target_value} ({progressValue.toFixed(0)}%)
            </span>
          </div>
          <Progress value={progressValue} className="h-1.5" />
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="space-y-2">
          {node.children.map((child) => (
            <GoalAssignmentNode
              key={child.id}
              node={child}
              currentUserId={currentUserId}
              goalId={goalId}
              depth={depth + 1}
              userLevel={userLevel}
              canSeeAll={canSeeAll}
              onProgressUpdate={onProgressUpdate}
            />
          ))}
        </div>
      )}

      <Dialog open={showReassign} onOpenChange={setShowReassign}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Re-asignar objetivo a subordinados</DialogTitle>
          </DialogHeader>
          <CascadeAssignStep
            goalId={goalId}
            userLevel={userLevel}
            canSeeAll={canSeeAll}
            onComplete={() => {
              setShowReassign(false);
              onProgressUpdate?.();
            }}
            onSkip={() => setShowReassign(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
