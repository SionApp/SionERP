import {
  BarChart3,
  CalendarDays,
  Church,
  GraduationCap,
  LucideIcon,
  Map,
  Package,
} from 'lucide-react';

export interface ModuleMeta {
  icon: LucideIcon;
  gradient: string;
  bg: string;
  text: string;
  features: string[];
}

const MODULE_META: Record<string, ModuleMeta> = {
  discipleship: {
    icon: Church,
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    features: [
      'Grupos de células y jerarquía',
      'Asistencia y seguimiento semanal',
      'Reportes de líderes',
      'Alertas automáticas',
      'Objetivos estratégicos',
    ],
  },
  zones: {
    icon: Map,
    gradient: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    features: [
      'Gestión de zonas geográficas',
      'Mapa interactivo de la iglesia',
      'Estadísticas por zona',
      'Asignación de líderes y grupos',
    ],
  },
  events: {
    icon: CalendarDays,
    gradient: 'from-orange-500 to-amber-600',
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    features: [
      'Gestión de eventos y cultos',
      'Registro de asistentes',
      'Recordatorios automáticos',
    ],
  },
  reports: {
    icon: BarChart3,
    gradient: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    features: [
      'Reportes ejecutivos del ministerio',
      'Exportación de datos',
      'Análisis histórico y comparativo',
      'Métricas cruzadas entre módulos',
    ],
  },
  education: {
    icon: GraduationCap,
    gradient: 'from-indigo-500 to-violet-600',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    features: [
      'Currículos y lecciones por pénsum',
      'Asignación de contenido a discípulos',
      'Seguimiento de progreso',
    ],
  },
};

const FALLBACK_META: ModuleMeta = {
  icon: Package,
  gradient: 'from-slate-500 to-gray-600',
  bg: 'bg-slate-500/10',
  text: 'text-slate-600 dark:text-slate-400',
  features: [],
};

export function getModuleMeta(key: string): ModuleMeta {
  return MODULE_META[key] ?? FALLBACK_META;
}
