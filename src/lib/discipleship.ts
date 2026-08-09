import { Crown, Shield, Users, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type DiscipleshipLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface DiscipleshipLevelConfig {
  level: DiscipleshipLevel;
  label: string;
  icon: LucideIcon;
  variant: 'default' | 'secondary' | 'outline' | 'destructive' | null;
  description: string;
}

export const DISCILEDSHIP_LEVELS: Record<DiscipleshipLevel, DiscipleshipLevelConfig> = {
  0: {
    level: 0,
    label: 'Sin nivel',
    icon: User,
    variant: 'secondary',
    description: 'Sin nivel de discipulado',
  },
  1: {
    level: 1,
    label: 'Líder',
    icon: User,
    variant: 'secondary',
    description: 'Líder de Grupo',
  },
  2: {
    level: 2,
    label: 'Sup. Auxiliar',
    icon: Users,
    variant: 'outline',
    description: 'Supervisor Auxiliar',
  },
  3: {
    level: 3,
    label: 'Sup. General',
    icon: Shield,
    variant: 'outline',
    description: 'Supervisor General',
  },
  4: {
    level: 4,
    label: 'Coordinador',
    icon: Shield,
    variant: 'default',
    description: 'Coordinador de zona',
  },
  5: {
    level: 5,
    label: 'Pastoral',
    icon: Crown,
    variant: 'default',
    description: 'Nivel Pastoral',
  },
};

export const getDiscipleshipLevelConfig = (level?: number): DiscipleshipLevelConfig => {
  const safeLevel = !level || level < 1 || level > 5 ? 0 : (level as DiscipleshipLevel);
  return DISCILEDSHIP_LEVELS[safeLevel];
};

export const getDiscipleshipLevelLabel = (level?: number): string => {
  return getDiscipleshipLevelConfig(level).label;
};
