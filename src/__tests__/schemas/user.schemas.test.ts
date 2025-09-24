import { editUserSchema, registerUserSchema, profileUpdateSchema } from '@/schemas/user.schemas';

describe('User Schemas', () => {
  describe('editUserSchema', () => {
    it('should validate valid user data', () => {
      const validData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        id_number: '123456',
        address: '123 Main St',
        role: 'server' as const,
        baptized: false,
        whatsapp: true,
      };

      const result = editUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
        phone: '1234567890',
        id_number: '123456',
        address: '123 Main St',
        role: 'server' as const,
        baptized: false,
        whatsapp: true,
      };

      const result = editUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('should reject short names', () => {
      const invalidData = {
        first_name: 'J',
        last_name: 'D',
        email: 'john@example.com',
        phone: '1234567890',
        id_number: '123456',
        address: '123 Main St',
        role: 'server' as const,
        baptized: false,
        whatsapp: true,
      };

      const result = editUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('registerUserSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        nombres: 'John',
        apellidos: 'Doe',
        cedula: '12345678',
        correo: 'john@example.com',
        telefono: '1234567890',
        direccion: '123 Main St',
        password: 'password123',
        role: 'server' as const,
        bautizado: false,
        whatsapp: false,
        is_active_member: false,
      };

      const result = registerUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short password', () => {
      const invalidData = {
        nombres: 'John',
        apellidos: 'Doe',
        cedula: '12345678',
        correo: 'john@example.com',
        telefono: '1234567890',
        direccion: '123 Main St',
        password: '123',
        role: 'server' as const,
        bautizado: false,
        whatsapp: false,
        is_active_member: false,
      };

      const result = registerUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('password');
      }
    });
  });

  describe('profileUpdateSchema', () => {
    it('should validate valid profile data', () => {
      const validData = {
        nombres: 'John',
        apellidos: 'Doe',
        telefono: '1234567890',
        direccion: '123 Main St',
        whatsapp: false,
      };

      const result = profileUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow optional fields to be undefined', () => {
      const validData = {
        nombres: 'John',
        apellidos: 'Doe',
        telefono: '1234567890',
        direccion: '123 Main St',
        whatsapp: false,
        birth_date: undefined,
        marital_status: undefined,
      };

      const result = profileUpdateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});