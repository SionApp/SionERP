import { z } from 'zod';

export const userRoles = ['admin', 'pastor', 'staff', 'supervisor', 'server', 'member'] as const;

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  full_name: z.string().min(1, 'El nombre completo es requerido'),
  phone: z.string().optional(),
  role: z.enum(userRoles, {
    errorMap: () => ({ message: 'Rol inválido' }),
  }),
  birth_date: z.string().optional(),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1, 'El nombre completo es requerido'),
  nombres: z.string().min(1, 'Los nombres son requeridos').optional(),
  apellidos: z.string().min(1, 'Los apellidos son requeridos').optional(),
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.boolean().optional(),
  birth_date: z.string().optional(),
  direccion: z.string().optional(),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  education_level: z.string().optional(),
  how_found_church: z.string().optional(),
  ministry_interest: z.string().optional(),
  first_visit_date: z.string().optional(),
  cell_group: z.string().optional(),
});

export const registerUserSchema = z.object({
  email: z.string().email('Email inválido'),
  correo: z.string().email('Email inválido').optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  full_name: z.string().min(1, 'El nombre completo es requerido'),
  nombres: z.string().optional(),
  apellidos: z.string().optional(),
  cedula: z.string().optional(),
  telefono: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.boolean().optional(),
  role: z.enum(userRoles, {
    errorMap: () => ({ message: 'Rol inválido' }),
  }),
  birth_date: z.string().optional(),
  direccion: z.string().optional(),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  education_level: z.string().optional(),
  how_found_church: z.string().optional(),
  ministry_interest: z.string().optional(),
  first_visit_date: z.string().optional(),
  cell_group: z.string().optional(),
  fecha_bautizo: z.string().optional(),
  membership_date: z.string().optional(),
  pastoral_notes: z.string().optional(),
  bautizado: z.boolean().optional(),
  is_active_member: z.boolean().optional(),
});

export const updateUserSchema = registerUserSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type RegisterUserFormData = z.infer<typeof registerUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
