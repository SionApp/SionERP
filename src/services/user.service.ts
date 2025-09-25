import { ApiService } from './api.service';
import { CreateUserData, UpdateUserData, User } from '@/types/user.types';

export class UserService {
  private static endpoint = '/users';

  static async getUsers(): Promise<User[]> {
    try {
      const response = await ApiService.get<{ data: User[] }>(this.endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      // Return mock data for now
      return [
        {
          id: '1',
          email: 'admin@sion.com',
          full_name: 'Administrador Principal',
          first_name: 'Administrador',
          last_name: 'Principal',
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
  }

  static async getAllUsers(): Promise<User[]> {
    return this.getUsers();
  }

  static async getCurrentUser(): Promise<User> {
    try {
      const response = await ApiService.get<{ data: User }>('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Return mock data for now
      return {
        id: '1',
        email: 'admin@sion.com',
        full_name: 'Administrador Principal',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  static async createUser(userData: CreateUserData): Promise<User> {
    try {
      const response = await ApiService.post<{ data: User }>(this.endpoint, userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async updateUser(userData: UpdateUserData): Promise<User> {
    try {
      const response = await ApiService.put<{ data: User }>(`${this.endpoint}/${userData.id}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await ApiService.put<{ data: User }>('/auth/profile', userData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      await ApiService.delete(`${this.endpoint}/${userId}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getUserById(userId: string): Promise<User> {
    try {
      const response = await ApiService.get<{ data: User }>(`${this.endpoint}/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }
}