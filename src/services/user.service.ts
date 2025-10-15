import { CreateUserData, UpdateUserData, UpdateUserRequest, User } from '@/types/user.types';
import { ApiService } from './api.service';

export class UserService {
  static async getUsers(): Promise<User[]> {
    try {
      const res = await ApiService.get<{ users: User[] }>('/users');

      // Add full_name field from first_name + last_name
      return (res?.users || []).map(user => ({
        ...user,
        full_name: `${user.first_name} ${user.last_name}`.trim(),
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  static async getAllUsers(): Promise<User[]> {
    return this.getUsers();
  }

  static async getCurrentUser(): Promise<User> {
    try {
      const user = await ApiService.get<User>('/users/me');
      return {
        ...user,
        full_name: `${user.first_name} ${user.last_name}`.trim(),
      };
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  static async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Transform CreateUserData to match database schema
      const dbData = {
        email: userData.email || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        phone: userData.phone || '',
        address: userData.address || '',
        id_number: userData.identification_number || '',
        password_hash: userData.password || 'temp', // This should be hashed
        role: (userData.role === 'admin' ? 'pastor' : userData.role || 'server') as string,
        birth_date: userData.birth_date,
        baptized: userData.baptized || false,
        whatsapp: userData.whatsapp || false,
        marital_status: userData.marital_status,
        occupation: userData.occupation,
        education_level: userData.education_level,
        how_found_church: userData.how_found_church,
        ministry_interest: userData.ministry_interest,
        first_visit_date: userData.first_visit_date,
        cell_group: userData.cell_group,
        pastoral_notes: userData.pastoral_notes,
        is_active_member: userData.is_active_member || false,
        baptism_date: userData.baptism_date,
        membership_date: userData.membership_date,
        emergency_contact_name: userData.emergency_contact_name,
        emergency_contact_phone: userData.emergency_contact_phone,
      };

      const data = await ApiService.post<User>('/users', dbData);
      console.log('res', data);

      return {
        ...data,
        full_name: `${data.first_name} ${data.last_name}`.trim(),
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async updateUser(userData: UpdateUserData): Promise<User> {
    try {
      // Only update the fields that are provided and remove undefined values
      const updateData = Object.fromEntries(
        Object.entries(userData).filter(([key, value]) => key !== 'id' && value !== undefined)
      ) as UpdateUserRequest;

      console.log('updateData', updateData);

      const data = await ApiService.put<User>(`/users/${userData.id}`, updateData);

      return {
        ...data,
      };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      // Only update the fields that are provided and remove undefined values
      const updateData = Object.fromEntries(
        Object.entries(userData).filter(([key, value]) => key !== 'id' && value !== undefined)
      ) as never;

      const res = await ApiService.put<User>(`/users/me/${userData.id}`, updateData);
      console.log('res', res);

      return {
        ...res,
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      const error = await ApiService.delete<User>(`/users/${userId}`);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getUserById(userId: string): Promise<User> {
    try {
      const data = await ApiService.get<User>(`/users/${userId}`);
      console.log(data, 'backend');
      return {
        ...data,
        full_name: `${data.first_name} ${data.last_name}`.trim(),
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }
}
