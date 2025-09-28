import { UserService } from '@/services/user.service';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('UserService', () => {
  const mockFrom = supabase.from as jest.Mock;
  const mockSelect = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });
  });

  describe('getAllUsers', () => {
    test('should fetch all users successfully', async () => {
      const mockUsers = [
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
      ];

      mockSelect.mockResolvedValue({
        data: mockUsers,
        error: null,
      });

      const result = await UserService.getAllUsers();

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toEqual(mockUsers);
    });

    test('should handle database errors', async () => {
      const mockError = { message: 'Database connection failed' };
      mockSelect.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(UserService.getAllUsers()).rejects.toThrow('Database connection failed');
    });
  });

  describe('createUser', () => {
    test('should create user successfully', async () => {
      const newUser = {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone: '1234567890',
        id_number: '12345678',
        address: 'Test Address',
        role: 'server' as const,
      };

      const createdUser = { ...newUser, id: '123' };

      mockInsert.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [createdUser],
          error: null,
        }),
      });

      const result = await UserService.createUser(newUser);

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockInsert).toHaveBeenCalledWith(newUser);
      expect(result).toEqual(createdUser);
    });
  });

  describe('updateUser', () => {
    test('should update user successfully', async () => {
      const userId = '123';
      const updates = { first_name: 'Updated Name' };
      const updatedUser = { id: userId, ...updates };

      mockUpdate.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [updatedUser],
            error: null,
          }),
        }),
      });

      const result = await UserService.updateUser({ id: userId, ...updates });

      expect(mockFrom).toHaveBeenCalledWith('users');
      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(result).toEqual(updatedUser);
    });
  });
});