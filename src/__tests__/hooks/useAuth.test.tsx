import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as any);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as any);
  });

  test('should initialize with null user and loading true', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  test('should handle successful login', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser as any, session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const loginResult = await result.current.signIn('test@example.com', 'password');
      expect(loginResult.error).toBeNull();
    });
  });

  test('should handle failed login', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' } as any,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const loginResult = await result.current.signIn('test@example.com', 'wrongpassword');
      expect(loginResult.error).toBeDefined();
      expect(loginResult.error?.message).toBe('Invalid credentials');
    });
  });
});
