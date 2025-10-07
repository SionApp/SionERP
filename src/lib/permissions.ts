import type { User } from '@/types/user.types';

export type Resource = 'users' | 'reports' | 'discipleship' | 'livestreams';
export type Action = 'view' | 'create' | 'edit' | 'delete';

const PERMISSIONS_MATRIX: Record<string, Record<Resource, Action[]>> = {
  pastor: {
    users: ['view', 'create', 'edit', 'delete'],
    reports: ['view', 'create', 'edit', 'delete'],
    discipleship: ['view', 'create', 'edit', 'delete'],
    livestreams: ['view', 'create', 'edit', 'delete'],
  },
  staff: {
    users: ['view', 'create', 'edit'],
    reports: ['view', 'create', 'edit'],
    discipleship: ['view', 'create', 'edit'],
    livestreams: ['view', 'create', 'edit'],
  },
  supervisor: {
    users: ['view', 'edit'],
    reports: ['view'],
    discipleship: ['view', 'edit'],
    livestreams: ['view'],
  },
  server: {
    users: ['view'],
    reports: [],
    discipleship: ['view'],
    livestreams: ['view'],
  },
};

export function hasPermission(user: User | null, resource: Resource, action: Action): boolean {
  if (!user) return false;

  const userPermissions = PERMISSIONS_MATRIX[user.role];
  if (!userPermissions) return false;

  const resourcePermissions = userPermissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
}

export function canAccessRoute(user: User | null, route: string): boolean {
  // Public routes
  const publicRoutes = ['/', '/about', '/services', '/contact', '/gallery'];
  if (publicRoutes.includes(route)) return true;

  // Require authentication for dashboard routes
  if (route.startsWith('/dashboard')) {
    if (!user) return false;

    // Basic dashboard access for all authenticated users
    if (route === '/dashboard' || route === '/dashboard/profile') return true;

    // Admin routes
    if (route.includes('/users') || route.includes('/reports')) {
      return hasPermission(user, 'users', 'view') || hasPermission(user, 'reports', 'view');
    }

    // Discipleship routes
    if (route.includes('/discipleship')) {
      return hasPermission(user, 'discipleship', 'view');
    }

    return true; // Allow other dashboard routes for authenticated users
  }

  return true; // Allow other routes by default
}
