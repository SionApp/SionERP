import { DiscipleshipService } from '@/services/discipleship.service';
import type { DiscipleshipHierarchy } from '@/types/discipleship.types';

export interface DiscipleshipAccess {
  canAccess: boolean;
  level: number | null;
  isFullAccess: boolean; // true para pastor/staff
  hierarchy?: DiscipleshipHierarchy;
}

/**
 * Determina el acceso de un usuario al módulo de discipulado
 * 
 * Reglas:
 * - Pastor y Staff: Acceso completo sin filtros (isFullAccess = true)
 * - Supervisor y Server: Acceso según hierarchy_level en discipleship_hierarchy
 * - Sin hierarchy_level: Sin acceso al módulo
 */
export async function getDiscipleshipAccess(
  userId: string,
  userRole: string
): Promise<DiscipleshipAccess> {
  // Pastor y Staff tienen acceso completo sin filtros
  if (userRole === 'pastor' || userRole === 'staff') {
    return {
      canAccess: true,
      level: null, // null significa sin filtros
      isFullAccess: true,
    };
  }

  // Otros roles necesitan tener hierarchy_level asignado
  try {
    const hierarchy = await DiscipleshipService.getHierarchy(userId);
    
    if (!hierarchy || hierarchy.length === 0) {
      return {
        canAccess: false,
        level: null,
        isFullAccess: false,
      };
    }

    return {
      canAccess: true,
      level: hierarchy[0].hierarchy_level,
      isFullAccess: false,
      hierarchy: hierarchy[0],
    };
  } catch (error) {
    console.error('Error loading discipleship hierarchy:', error);
    return {
      canAccess: false,
      level: null,
      isFullAccess: false,
    };
  }
}

/**
 * Obtiene el nivel de discipulado para mostrar el dashboard correcto
 * Si es acceso completo (pastor/staff), retorna nivel 5 (Pastoral)
 */
export function getDashboardLevel(access: DiscipleshipAccess): number {
  if (access.isFullAccess) {
    return 5; // Pastoral dashboard para acceso completo
  }
  return access.level || 1; // Default a nivel 1 si no hay nivel
}

