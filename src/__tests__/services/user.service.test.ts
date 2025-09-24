import { UserService } from '@/services/user.service';
import { supabase } from '@/integrations/supabase/client';
import { RegisterUserFormData } from '@/schemas/user.schemas';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
        order: jest.fn(),
      })),
      insert: jest.fn(),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is authenticated', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await UserService.getCurrentUser();
      expect(result).toBeNull();
    });

    it('should return user data when authenticated', async () => {
      const mockUser = { id: 'user-id' };
      const mockUserData = {
        id: 'user-id',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await UserService.getCurrentUser();
      expect(result).toEqual(mockUserData);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData: RegisterUserFormData = {
        nombres: 'John',
        apellidos: 'Doe',
        cedula: '12345678',
        correo: 'john@example.com',
        telefono: '1234567890',
        direccion: '123 Main St',
        password: 'password123',
        role: 'server',
        bautizado: false,
        whatsapp: false,
        is_active_member: false,
      };

      const mockInsert = jest.fn().mockResolvedValue({
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await UserService.createUser(userData);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          role: 'server',
        }),
      ]);
    });

    it('should throw error when creation fails', async () => {
      const userData: RegisterUserFormData = {
        nombres: 'John',
        apellidos: 'Doe',
        cedula: '12345678',
        correo: 'john@example.com',
        telefono: '1234567890',
        direccion: '123 Main St',
        password: 'password123',
        role: 'server',
        bautizado: false,
        whatsapp: false,
        is_active_member: false,
      };

      const mockInsert = jest.fn().mockResolvedValue({
        error: new Error('Database error'),
      });

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      } as any);

      await expect(UserService.createUser(userData)).rejects.toThrow();
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: '1', first_name: 'John', last_name: 'Doe' },
        { id: '2', first_name: 'Jane', last_name: 'Smith' },
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockUsers,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({
        order: mockOrder,
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await UserService.getAllUsers();
      expect(result).toEqual(mockUsers);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });
  });
});