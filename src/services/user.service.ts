import { supabase } from '@/integrations/supabase/client';
import { User, CreateUserData } from '@/types/user.types';
import { EditUserFormData, RegisterUserFormData, ProfileUpdateFormData } from '@/schemas/user.schemas';

export class UserService {
  /**
   * Get current authenticated user data
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return userData;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  static async createUser(userData: RegisterUserFormData): Promise<void> {
    try {
      // Hash password (should be done in backend in production)
      const passwordHash = btoa(userData.password);

      const createData: CreateUserData = {
        first_name: userData.nombres,
        last_name: userData.apellidos,
        id_number: userData.cedula,
        email: userData.correo,
        phone: userData.telefono,
        address: userData.direccion,
        role: userData.role,
        password_hash: passwordHash,
        
        // Extended fields
        birth_date: userData.birth_date || null,
        marital_status: userData.marital_status || null,
        occupation: userData.occupation || null,
        education_level: userData.education_level || null,
        how_found_church: userData.how_found_church || null,
        ministry_interest: userData.ministry_interest || null,
        first_visit_date: userData.first_visit_date || null,
        
        // Church membership
        baptized: userData.bautizado,
        baptism_date: userData.bautizado && userData.fecha_bautizo 
          ? new Date(userData.fecha_bautizo).toISOString() 
          : null,
        is_active_member: userData.is_active_member,
        membership_date: userData.membership_date 
          ? new Date(userData.membership_date).toISOString() 
          : null,
        
        // Cell group and preferences
        cell_group: userData.cell_group || null,
        whatsapp: userData.whatsapp,
        pastoral_notes: userData.pastoral_notes || null,
      };

      const { error } = await supabase
        .from('users')
        .insert([createData]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, userData: EditUserFormData): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          phone: userData.phone,
          id_number: userData.id_number,
          address: userData.address,
          role: userData.role,
          baptized: userData.baptized,
          whatsapp: userData.whatsapp,
          pastoral_notes: userData.pastoral_notes || null,
          marital_status: userData.marital_status || null,
          occupation: userData.occupation || null,
          education_level: userData.education_level || null,
          how_found_church: userData.how_found_church || null,
          ministry_interest: userData.ministry_interest || null,
          cell_group: userData.cell_group || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Update current user profile
   */
  static async updateProfile(profileData: ProfileUpdateFormData): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user');

      const updateData = {
        nombres: profileData.nombres,
        apellidos: profileData.apellidos,
        telefono: profileData.telefono,
        direccion: profileData.direccion,
        birth_date: profileData.birth_date || null,
        marital_status: profileData.marital_status || null,
        occupation: profileData.occupation || null,
        education_level: profileData.education_level || null,
        how_found_church: profileData.how_found_church || null,
        ministry_interest: profileData.ministry_interest || null,
        first_visit_date: profileData.first_visit_date || null,
        cell_group: profileData.cell_group || null,
        whatsapp: profileData.whatsapp,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
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
}