import { supabase } from '@/integrations/supabase/client';
import { CreateUserData, UpdateUserData, User } from '@/types/user.types';
import { ApiService } from './api.service';

export class UserService {
  static async getUsers(): Promise<User[]> {
    try {
      const res = await ApiService.get<{ users: User[] }>('/users');
      
      // Add full_name field from first_name + last_name
      return (res?.users || []).map(user => ({
        ...user,
        full_name: `${user.first_name} ${user.last_name}`.trim()
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
        full_name: `${user.first_name} ${user.last_name}`.trim()
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
        first_name: userData.full_name?.split(' ')[0] || userData.nombres || '',
        last_name: userData.full_name?.split(' ').slice(1).join(' ') || userData.apellidos || '',
        phone: userData.phone || userData.telefono || '',
        address: userData.address || userData.direccion || '',
        id_number: userData.cedula || '',
        password_hash: userData.password || 'temp', // This should be hashed
        role: (userData.role === 'admin' ? 'pastor' : userData.role || 'server') as string,
        birth_date: userData.birth_date,
        baptized: userData.bautizado || false,
        whatsapp: userData.whatsapp || false,
        marital_status: userData.marital_status,
        occupation: userData.occupation,
        education_level: userData.education_level,
        how_found_church: userData.how_found_church,
        ministry_interest: userData.ministry_interest,
        first_visit_date: userData.first_visit_date,
        cell_group: userData.cell_group,
        pastoral_notes: userData.pastoral_notes,
        is_active_member: userData.is_active_member || false
      };

      const { data, error } = await supabase
        .from('users')
        .insert(dbData as never)
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        full_name: `${data.first_name} ${data.last_name}`.trim()
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
      ) as never;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userData.id)
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        full_name: `${data.first_name} ${data.last_name}`.trim()
      };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      
      if (!authUser.user) {
        throw new Error('No authenticated user');
      }

      // Only update the fields that are provided and remove undefined values
      const updateData = Object.fromEntries(
        Object.entries(userData).filter(([key, value]) => key !== 'id' && value !== undefined)
      ) as never;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('email', authUser.user.email)
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        full_name: `${data.first_name} ${data.last_name}`.trim()
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getUserById(userId: string): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        full_name: `${data.first_name} ${data.last_name}`.trim()
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }
}