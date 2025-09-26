import { z } from 'zod';

export const userRoles = ['admin', 'pastor', 'staff', 'supervisor', 'server', 'member'] as const;

export const createUserSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email demasiado largo'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100, 'Contraseña demasiado larga'),
  full_name: z.string().min(1, 'El nombre completo es requerido').max(100, 'Nombre demasiado largo').trim(),
  phone: z.string().max(20, 'Teléfono demasiado largo').optional(),
  role: z.enum(userRoles, {
    errorMap: () => ({ message: 'Rol inválido' })
  }),
  birth_date: z.string().optional(),
  address: z.string().max(500, 'Dirección demasiado larga').optional(),
  emergency_contact_name: z.string().max(100, 'Nombre de contacto demasiado largo').optional(),
  emergency_contact_phone: z.string().max(20, 'Teléfono de contacto demasiado largo').optional()
});

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1, 'El nombre completo es requerido').max(100, 'Nombre demasiado largo').trim(),
  nombres: z.string().min(1, 'Los nombres son requeridos').max(50, 'Nombres demasiado largos').trim().optional(),
  apellidos: z.string().min(1, 'Los apellidos son requeridos').max(50, 'Apellidos demasiado largos').trim().optional(),
  email: z.string().email('Email inválido').max(255, 'Email demasiado largo'),
  telefono: z.string().max(20, 'Teléfono demasiado largo').optional(),
  phone: z.string().max(20, 'Teléfono demasiado largo').optional(),
  whatsapp: z.boolean().optional(),
  birth_date: z.string().optional(),
  direccion: z.string().max(500, 'Dirección demasiado larga').optional(),
  address: z.string().max(500, 'Dirección demasiado larga').optional(),
  emergency_contact_name: z.string().max(100, 'Nombre de contacto demasiado largo').optional(),
  emergency_contact_phone: z.string().max(20, 'Teléfono de contacto demasiado largo').optional(),
  marital_status: z.string().max(50, 'Estado civil demasiado largo').optional(),
  occupation: z.string().max(100, 'Ocupación demasiado larga').optional(),
  education_level: z.string().max(50, 'Nivel educativo demasiado largo').optional(),
  how_found_church: z.string().max(200, 'Descripción demasiado larga').optional(),
  ministry_interest: z.string().max(200, 'Interés ministerial demasiado largo').optional(),
  first_visit_date: z.string().optional(),
  cell_group: z.string().max(100, 'Grupo celular demasiado largo').optional()
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
    errorMap: () => ({ message: 'Rol inválido' })
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
  is_active_member: z.boolean().optional()
});

export const updateUserSchema = registerUserSchema.partial().extend({
  id: z.string().uuid()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type RegisterUserFormData = z.infer<typeof registerUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;