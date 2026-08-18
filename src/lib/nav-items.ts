import type { ComponentType } from 'react';
import {
  BarChart3,
  Calendar,
  Heart,
  Home,
  Music2,
  Settings,
  Shield,
  Sparkles,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { ROLE_LEVELS } from '@/lib/permissions';

export interface MenuItemConfig {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  requiredModule?: string;
  minRole: number;
  /** pastor + staff con has_admin_access */
  requireAdminAccess?: boolean;
  /** Además de rol+módulo instalado, requiere pertenecer al equipo del módulo (ver NavGate.hasModuleAccess) */
  requiresMembership?: boolean;
}

// Single source of truth for navigation. Consumed by the sidebar (desktop),
// the bottom nav and the mobile "Más" sheet — so a new module is added in ONE
// place and shows up everywhere, instead of drifting between hardcoded lists.
export const menuItems: MenuItemConfig[] = [
  { title: 'Inicio', url: '/dashboard', icon: Home, minRole: ROLE_LEVELS.member },
  { title: 'Mi Perfil', url: '/dashboard/profile', icon: UserCog, minRole: ROLE_LEVELS.member },
  { title: 'Usuarios', url: '/dashboard/users', icon: Users, minRole: ROLE_LEVELS.staff },
  {
    title: 'Registro',
    url: '/dashboard/register-user',
    icon: UserPlus,
    minRole: ROLE_LEVELS.staff,
  },
  { title: 'Roles', url: '/dashboard/roles', icon: Shield, minRole: 0, requireAdminAccess: true },
  {
    title: 'Discipulado',
    url: '/dashboard/discipleship',
    icon: Heart,
    requiredModule: 'discipleship',
    minRole: ROLE_LEVELS.member,
  },
  {
    title: 'Eventos',
    url: '/dashboard/events',
    icon: Calendar,
    requiredModule: 'events',
    minRole: ROLE_LEVELS.member,
  },
  {
    title: 'Música',
    url: '/dashboard/music',
    icon: Music2,
    requiredModule: 'music',
    minRole: ROLE_LEVELS.member,
    requiresMembership: true,
  },
  {
    title: 'Reportes',
    url: '/dashboard/reports',
    icon: BarChart3,
    requiredModule: 'reports',
    minRole: ROLE_LEVELS.supervisor,
  },
  {
    title: 'Configuración',
    url: '/dashboard/settings',
    icon: Settings,
    minRole: 0,
    requireAdminAccess: true,
  },
];

// Super-admin only (role === 'admin'): module install/billing.
export const superAdminItems: MenuItemConfig[] = [
  { title: 'Gestión de Módulos', url: '/dashboard/modules', icon: Sparkles, minRole: 0 },
];

interface NavGate {
  permissions: { has_admin_access?: boolean } | null | undefined;
  hasAccess: (minRole: number) => boolean;
  isModuleInstalled: (key: string) => boolean;
  /** For items with requiresMembership: true — is the user actually part of that module's team? */
  hasModuleAccess?: (key: string) => boolean;
}

/** Shared gating: role/admin access + module installed (+ team membership when requiresMembership). */
export function filterNavItems(items: MenuItemConfig[], gate: NavGate): MenuItemConfig[] {
  return items.filter(item => {
    if (item.requireAdminAccess) {
      if (!gate.permissions?.has_admin_access) return false;
    } else if (!gate.hasAccess(item.minRole)) {
      return false;
    }
    if (!item.requiredModule || item.requiredModule === 'base') return true;
    if (!gate.isModuleInstalled(item.requiredModule)) return false;
    if (item.requiresMembership && gate.permissions && !gate.permissions.has_admin_access) {
      return gate.hasModuleAccess?.(item.requiredModule) ?? true;
    }
    return true;
  });
}
