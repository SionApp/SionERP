import { z } from 'zod';

export const userRoles = ['admin', 'pastor', 'staff', 'supervisor', 'server', 'member'] as const;

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  first_name: z.string().min(2, 'Los nombres son requeridos'),
  last_name: z.string().min(2, 'Los apellidos son requeridos'),
  identification_number: z.string().min(8, 'La cédula debe tener al menos 8 caracteres'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 caracteres'),
  role: z.enum(userRoles, {
    errorMap: () => ({ message: 'Rol inválido' }),
  }),
  birth_date: z.string().optional(),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().min(10, 'El teléfono debe tener al menos 10 caracteres'),
});

export const profileUpdateSchema = z.object({
  first_name: z.string().min(2, 'Los nombres son requeridos').optional(),
  last_name: z.string().min(2, 'Los apellidos son requeridos').optional(),
  id_number: z.string().min(8, 'La cédula debe tener al menos 8 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 caracteres'),
  whatsapp: z.boolean().optional(),
  birth_date: z.string().optional(),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  education_level: z.string().optional(),
  how_found_church: z.string().optional(),
  ministry_interest: z.string().optional(),
  first_visit_date: z.string().optional(),
  cell_group: z.string().optional(),
  pastoral_notes: z.string().optional(),
  baptism_date: z.string().optional(),
  baptized: z.boolean().optional(),
  is_active_member: z.boolean().optional(),
  membership_date: z.string().optional(),
  cell_leader_id: z.string().optional(),
});

export const registerUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  first_name: z.string().min(2, 'Los nombres son requeridos'),
  last_name: z.string().min(2, 'Los apellidos son requeridos'),
  id_number: z.string().min(8, 'La cédula debe tener al menos 8 caracteres'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 caracteres'),
  whatsapp: z.boolean().optional(),
  role: z.enum(userRoles, {
    errorMap: () => ({ message: 'Rol inválido' }),
  }),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  birth_date: z.string().optional(),
  baptism_date: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  education_level: z.string().optional(),
  how_found_church: z.string().optional(),
  ministry_interest: z.string().optional(),
  first_visit_date: z.string().optional(),
  cell_group: z.string().optional(),
  membership_date: z.string().optional(),
  pastoral_notes: z.string().optional(),
  baptized: z.boolean().optional(),
  is_active_member: z.boolean().optional(),
});

export const updateUserSchema = registerUserSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type RegisterUserFormData = z.infer<typeof registerUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
