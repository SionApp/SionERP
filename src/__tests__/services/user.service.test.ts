import { UserService } from '@/services/user.service';
import { ApiService } from '@/services/api.service';

vi.mock('@/services/api.service', () => ({
  ApiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllUsers', () => {
    test('should fetch and map users with full_name', async () => {
      const rawUsers = [
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
      ];

      vi.mocked(ApiService.get).mockResolvedValue({ users: rawUsers });

      const result = await UserService.getAllUsers();

      expect(ApiService.get).toHaveBeenCalledWith('/users');
      expect(result[0].full_name).toBe('John Doe');
      expect(result[1].full_name).toBe('Jane Smith');
    });

    test('should return empty array when API returns no users', async () => {
      vi.mocked(ApiService.get).mockResolvedValue({ users: [] });

      const result = await UserService.getAllUsers();

      expect(result).toEqual([]);
    });

    test('should propagate errors from the API', async () => {
      vi.mocked(ApiService.get).mockRejectedValue(new Error('Network error'));

      await expect(UserService.getAllUsers()).rejects.toThrow('Network error');
    });
  });

  describe('getCurrentUser', () => {
    test('should fetch and return the current user from /users/me', async () => {
      const rawUser = {
        id: '1',
        first_name: 'Daniel',
        last_name: 'Rodríguez',
        email: 'pastor@test.com',
      };

      vi.mocked(ApiService.get).mockResolvedValue(rawUser);

      const result = await UserService.getCurrentUser();

      expect(ApiService.get).toHaveBeenCalledWith('/users/me');
      expect(result.first_name).toBe('Daniel');
      expect(result.email).toBe('pastor@test.com');
    });
  });
});
