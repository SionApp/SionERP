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
  1: {
    level: 1,
    label: 'Pastoral',
    icon: Crown,
    variant: 'default',
    description: 'Nivel Pastoral',
  },
  2: {
    level: 2,
    label: 'Coordinador General',
    icon: Shield,
    variant: 'secondary',
    description: 'Coordinador General',
  },
  3: {
    level: 3,
    label: 'Coordinador',
    icon: Shield,
    variant: 'outline',
    description: 'Coordinador de zona',
  },
  4: {
    level: 4,
    label: 'Supervisor Auxiliar',
    icon: Users,
    variant: 'outline',
    description: 'Supervisor Auxiliar',
  },
  5: {
    level: 5,
    label: 'Líder',
    icon: User,
    variant: 'secondary',
    description: 'Líder de célula',
  },
};

export const getDiscipleshipLevelConfig = (level?: number): DiscipleshipLevelConfig => {
  if (!level || level < 1 || level > 5 || level === null) {
    return {
      level: 0,
      label: 'Sin nivel',
      icon: User,
      variant: 'secondary',
      description: 'Sin nivel de discipulado',
    };
  }
  return DISCILEDSHIP_LEVELS[level as DiscipleshipLevel] || DISCILEDSHIP_LEVELS[5];
};

export const getDiscipleshipLevelLabel = (level?: number): string => {
  return getDiscipleshipLevelConfig(level).label;
};
