import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserService } from '@/services/user.service';
import { User, UserRole } from '@/types/user.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  first_name: z.string().min(2, 'Mínimo 2 caracteres'),
  last_name: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().optional(),
  id_number: z.string().optional(),
  role: z.enum(['admin', 'pastor', 'staff', 'supervisor', 'server', 'member']),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

export const InviteUserModal = ({ user, isOpen, onClose, onInviteSent }: InviteUserModalProps) => {
  const [loading, setLoading] = useState(false);

  // El problema es que el select de roles (y los otros campos) no se actualiza porque defaultValues en useForm solo se aplica durante el primer render.
  // Solución: Hay que usar el método reset del useForm dentro de useEffect para actualizar todos los valores cuando `user` cambia.
  const {
    register,
    handleSubmit,
    formState: { errors, disabled },
    setValue,
    reset,
    watch,
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: user?.role || 'server',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      id_number: user?.id_number || '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        role: (user.role as UserRole) || 'server',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        id_number: user.id_number || '',
      });
    } else {
      reset({
        role: 'server',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        id_number: '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: InviteFormData) => {
    try {
      setLoading(true);

      const response = await UserService.inviteUser({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        assigned_role: data.role as UserRole,
        phone: data.phone,
        id_number: data.id_number,
      });

      if (!response) {
        throw new Error('Error al enviar invitación');
      }

      toast.success(`Invitación enviada a ${data.email}.`);

      reset();
      onClose();
      onInviteSent();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Error al enviar la invitación');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invitar Usuario
          </DialogTitle>
          <DialogDescription>
            El usuario recibirá un email con un Magic Link para acceder al sistema (válido por 7
            días)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                disabled={!!user?.email}
                {...register('email')}
                placeholder="usuario@ejemplo.com"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={watch('role')}
                onValueChange={(value: string) => setValue('role', value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pastor">Pastor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="server">Servidor</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="first_name">Nombres *</Label>
              <Input id="first_name" {...register('first_name')} placeholder="Juan" />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellidos *</Label>
              <Input id="last_name" {...register('last_name')} placeholder="Pérez" />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register('phone')} placeholder="809-555-1234" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id_number">Cédula</Label>
              <Input id="id_number" {...register('id_number')} placeholder="001-1234567-8" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || disabled}>
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
