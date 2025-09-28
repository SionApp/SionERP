import { hasPermission, canAccessRoute } from '@/lib/permissions';
import type { User } from '@/types/user.types';

describe('Permission Utils', () => {
  const mockPastorUser: User = {
    id: '1',
    first_name: 'Pastor',
    last_name: 'Test',
    full_name: 'Pastor Test',
    email: 'pastor@test.com',
    role: 'pastor',
    phone: '123456789',
    id_number: '123456789',
    address: 'Test Address',
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const mockServerUser: User = {
    ...mockPastorUser,
    full_name: 'Server Test',
    role: 'server',
  };

  describe('hasPermission', () => {
    test('pastor should have all permissions', () => {
      expect(hasPermission(mockPastorUser, 'users', 'create')).toBe(true);
      expect(hasPermission(mockPastorUser, 'users', 'delete')).toBe(true);
      expect(hasPermission(mockPastorUser, 'reports', 'view')).toBe(true);
    });

    test('server should have limited permissions', () => {
      expect(hasPermission(mockServerUser, 'users', 'view')).toBe(true);
      expect(hasPermission(mockServerUser, 'users', 'create')).toBe(false);
      expect(hasPermission(mockServerUser, 'users', 'delete')).toBe(false);
    });

    test('should handle invalid resource/action combinations', () => {
      expect(hasPermission(mockServerUser, 'invalid' as any, 'view')).toBe(false);
      expect(hasPermission(mockServerUser, 'users', 'invalid' as any)).toBe(false);
    });
  });

  describe('canAccessRoute', () => {
    test('should allow pastor to access all routes', () => {
      expect(canAccessRoute(mockPastorUser, '/dashboard/users')).toBe(true);
      expect(canAccessRoute(mockPastorUser, '/dashboard/reports')).toBe(true);
      expect(canAccessRoute(mockPastorUser, '/dashboard/discipleship')).toBe(true);
    });

    test('should restrict server access to certain routes', () => {
      expect(canAccessRoute(mockServerUser, '/dashboard')).toBe(true);
      expect(canAccessRoute(mockServerUser, '/dashboard/profile')).toBe(true);
      expect(canAccessRoute(mockServerUser, '/dashboard/users')).toBe(false);
      expect(canAccessRoute(mockServerUser, '/dashboard/reports')).toBe(false);
    });

    test('should handle public routes', () => {
      expect(canAccessRoute(null, '/')).toBe(true);
      expect(canAccessRoute(null, '/about')).toBe(true);
      expect(canAccessRoute(null, '/contact')).toBe(true);
    });
  });
});