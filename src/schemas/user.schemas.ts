import { z } from 'zod';

// Edit user schema
export const editUserSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 caracteres'),
  id_number: z.string().min(6, 'La cédula debe tener al menos 6 caracteres'),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  role: z.enum(['pastor', 'staff', 'supervisor', 'server']),
  baptized: z.boolean(),
  whatsapp: z.boolean(),
  pastoral_notes: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  education_level: z.string().optional(),
  how_found_church: z.string().optional(),
  ministry_interest: z.string().optional(),
  cell_group: z.string().optional(),
});

// Register user schema
export const registerUserSchema = z.object({
  // Basic info
  nombres: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres'),
  cedula: z.string().min(8, 'La cédula debe tener al menos 8 caracteres'),
  correo: z.string().email('Correo electrónico inválido'),
  telefono: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  direccion: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  
  // Extended fields
  birth_date: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  education_level: z.string().optional(),
  how_found_church: z.string().optional(),
  ministry_interest: z.string().optional(),
  first_visit_date: z.string().optional(),
  
  // Church membership
  bautizado: z.boolean().default(false),
  fecha_bautizo: z.string().optional(),
  is_active_member: z.boolean().default(false),
  membership_date: z.string().optional(),
  
  // Cell group
  cell_group: z.string().optional(),
  
  // Role and preferences
  role: z.enum(['pastor', 'staff', 'supervisor', 'server'] as const),
  whatsapp: z.boolean().default(false),
  pastoral_notes: z.string().optional(),
});

// Profile update schema
export const profileUpdateSchema = z.object({
  // Basic info
  nombres: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres'),
  telefono: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  direccion: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  
  // Extended fields
  birth_date: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  education_level: z.string().optional(),
  how_found_church: z.string().optional(),
  ministry_interest: z.string().optional(),
  first_visit_date: z.string().optional(),
  
  // Church membership
  cell_group: z.string().optional(),
  
  // Preferences
  whatsapp: z.boolean().default(false),
});

// Inferred types
export type EditUserFormData = z.infer<typeof editUserSchema>;
export type RegisterUserFormData = z.infer<typeof registerUserSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;