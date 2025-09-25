import { z } from 'zod';

export const userRoles = ['admin', 'pastor', 'staff', 'supervisor', 'server', 'member'] as const;

export const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  full_name: z.string().min(1, 'El nombre completo es requerido'),
  phone: z.string().optional(),
  role: z.enum(userRoles, {
    errorMap: () => ({ message: 'Rol inválido' })
  }),
  birth_date: z.string().optional(),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional()
});

export const updateUserSchema = createUserSchema.partial().extend({
  id: z.string().uuid()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;