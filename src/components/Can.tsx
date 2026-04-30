import { usePermissions } from '@/hooks/usePermissions';

interface CanProps {
  /** Minimum role level required */
  I: number;
  /** If true, renders children when user does NOT have access */
  not?: boolean;
  /** What to render when access is denied */
  children: React.ReactNode;
  /** Optional fallback to render when access is denied (instead of null) */
  fallback?: React.ReactNode;
}

/**
 * Conditional rendering based on role level.
 *
 * Usage:
 *   <Can I={ROLE_LEVELS.admin}>
 *     <Button onClick={deleteUser}>Eliminar</Button>
 *   </Can>
 *
 *   <Can I={ROLE_LEVELS.admin} fallback={<Button disabled>Eliminar</Button>}>
 *     <Button onClick={deleteUser}>Eliminar</Button>
 *   </Can>
 */
export function Can({ I, not = false, children, fallback = null }: CanProps) {
  const { permissions } = usePermissions();
  const hasAccess = !!permissions && permissions.role_level >= I;
  const effective = not ? !hasAccess : hasAccess;

  return <>{effective ? children : fallback}</>;
}
