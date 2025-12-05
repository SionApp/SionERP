import { Invitation } from '@/types/invitation.types';
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
        id_number: userData.id_number || '',
        role: userData.role,
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

      // Remove empty strings and undefined values to send clean data to backend
      const cleanData = Object.fromEntries(
        Object.entries(dbData).filter(([_, value]) => {
          // Keep the value if it's not an empty string and not undefined
          // Also keep false and 0 values
          return value !== '' && value !== undefined && value !== null;
        })
      );

      const data = await ApiService.post<User>('/users', cleanData);
      console.log('res', data);

      return {
        ...data,
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
        Object.entries(userData).filter(([key, value]) => {
          // Exclude the id field and filter out empty strings, undefined, and null
          return key !== 'id' && value !== undefined && value !== '' && value !== null;
        })
      ) as UpdateUserRequest;

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
      // Only update the fields that are provided and remove undefined values, empty strings, and null
      const updateData = Object.fromEntries(
        Object.entries(userData).filter(([key, value]) => {
          return key !== 'id' && value !== undefined && value !== '' && value !== null;
        })
      ) as never;

      const res = await ApiService.put<User>(`/users/me`, updateData);

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
      return {
        ...data,
      };
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  static async loadInvitations(): Promise<Invitation[]> {
    try {
      const res = await ApiService.get<Invitation[]>('/invitations');
      return res || [];
    } catch (error) {
      console.error('Error loading invitations:', error);
      throw error;
    }
  }

  static async inviteUser(userData: Invitation): Promise<Invitation | null> {
    try {
      const res = await ApiService.post<Invitation>('/invitations', userData);
      return res || null;
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  }

  static async resendInvitation(invitationId: string): Promise<Invitation | null> {
    try {
      const res = await ApiService.post<Invitation>(`/invitations/${invitationId}/resend`);
      return res || null;
    } catch (error) {
      console.error('Error resending invitation:', error);
      throw error;
    }
  }

  static async acceptInvitation(invitationId: string): Promise<Invitation | null> {
    try {
      const res = await ApiService.post<Invitation>(`/invitations/${invitationId}/accept`);
      return res || null;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }
}
