import { UserRole } from './user.types';

export interface Invitation {
  email: string;
  first_name: string;
  last_name: string;
  assigned_role: UserRole;
  phone?: string;
  id_number?: string;
  status?: InvitationStatus;
  expires_at?: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'resent';
