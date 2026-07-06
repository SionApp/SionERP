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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserService } from '@/services/user.service';
import { User, UserRole } from '@/types/user.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Mail, UserPlus } from 'lucide-react';
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

const directCreateSchema = inviteSchema.extend({
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  confirm_password: z.string().min(1, 'Confirmá la contraseña'),
}).refine(data => data.password === data.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
});

type InviteFormData = z.infer<typeof inviteSchema>;
type DirectCreateFormData = z.infer<typeof directCreateSchema>;

interface InviteUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

export const InviteUserModal = ({ user, isOpen, onClose, onInviteSent }: InviteUserModalProps) => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'invite' | 'direct'>('invite');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'member',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      id_number: '',
    },
  });

  const directForm = useForm<DirectCreateFormData>({
    resolver: zodResolver(directCreateSchema),
    defaultValues: {
      role: 'member',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      id_number: '',
      password: '',
      confirm_password: '',
    },
  });

  useEffect(() => {
    if (user) {
      const baseData = {
        role: (user.role as UserRole) || 'member',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        id_number: user.id_number || '',
      };
      inviteForm.reset(baseData);
      directForm.reset({ ...baseData, password: '', confirm_password: '' });
    } else {
      inviteForm.reset({
        role: 'member',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        id_number: '',
      });
      directForm.reset({
        role: 'member',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        id_number: '',
        password: '',
        confirm_password: '',
      });
    }
  }, [user, inviteForm, directForm]);

  const onInviteSubmit = async (data: InviteFormData) => {
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

      inviteForm.reset();
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

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    directForm.setValue('password', pass);
    directForm.setValue('confirm_password', pass);
    setGeneratedPassword(pass);
  };

  const onDirectSubmit = async (data: DirectCreateFormData) => {
    try {
      setLoading(true);

      await UserService.createUserDirect({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        phone: data.phone,
        id_number: data.id_number,
      });

      toast.success(`Usuario ${data.email} creado exitosamente.`);

      directForm.reset();
      setGeneratedPassword(null);
      setShowPassword(false);
      onClose();
      onInviteSent();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Error al crear el usuario');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Agregar Usuario
          </DialogTitle>
          <DialogDescription>
            Creá un nuevo usuario para el sistema
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'invite' | 'direct')} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invitar por email
            </TabsTrigger>
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Crear directamente
            </TabsTrigger>
          </TabsList>

          {/* Modo Invitar */}
          <TabsContent value="invite">
            <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-3 sm:space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">
                  Se enviará un email con un Magic Link para que el usuario se registre (requiere SMTP configurado).
                </p>
              </div>

              <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    disabled={!!user?.email}
                    {...inviteForm.register('email')}
                    placeholder="usuario@ejemplo.com"
                  />
                  {inviteForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{inviteForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-role">Rol *</Label>
                  <Select
                    value={inviteForm.watch('role')}
                    onValueChange={(value: string) => inviteForm.setValue('role', value as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="pastor">Pastor</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="server">Servidor</SelectItem>
                      <SelectItem value="member">Miembro</SelectItem>
                    </SelectContent>
                  </Select>
                  {inviteForm.formState.errors.role && (
                    <p className="text-sm text-destructive">{inviteForm.formState.errors.role.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-first_name">Nombres *</Label>
                  <Input id="invite-first_name" {...inviteForm.register('first_name')} placeholder="Juan" />
                  {inviteForm.formState.errors.first_name && (
                    <p className="text-sm text-destructive">{inviteForm.formState.errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-last_name">Apellidos *</Label>
                  <Input id="invite-last_name" {...inviteForm.register('last_name')} placeholder="Pérez" />
                  {inviteForm.formState.errors.last_name && (
                    <p className="text-sm text-destructive">{inviteForm.formState.errors.last_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-phone">Teléfono</Label>
                  <Input id="invite-phone" {...inviteForm.register('phone')} placeholder="809-555-1234" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-id_number">Cédula</Label>
                  <Input id="invite-id_number" {...inviteForm.register('id_number')} placeholder="001-1234567-8" />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || inviteForm.formState.disabled} className="w-full sm:w-auto">
                  {loading ? 'Enviando...' : 'Enviar Invitación'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Modo Crear Directamente */}
          <TabsContent value="direct">
            <form onSubmit={directForm.handleSubmit(onDirectSubmit)} className="space-y-3 sm:space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm text-muted-foreground">
                  El usuario se crea directamente con contraseña. El admin comparte las credenciales manualmente.
                </p>
              </div>

              <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="direct-email">Email *</Label>
                  <Input
                    id="direct-email"
                    type="email"
                    disabled={!!user?.email}
                    {...directForm.register('email')}
                    placeholder="usuario@ejemplo.com"
                  />
                  {directForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{directForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direct-role">Rol *</Label>
                  <Select
                    value={directForm.watch('role')}
                    onValueChange={(value: string) => directForm.setValue('role', value as UserRole)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="pastor">Pastor</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="server">Servidor</SelectItem>
                      <SelectItem value="member">Miembro</SelectItem>
                    </SelectContent>
                  </Select>
                  {directForm.formState.errors.role && (
                    <p className="text-sm text-destructive">{directForm.formState.errors.role.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direct-first_name">Nombres *</Label>
                  <Input id="direct-first_name" {...directForm.register('first_name')} placeholder="Juan" />
                  {directForm.formState.errors.first_name && (
                    <p className="text-sm text-destructive">{directForm.formState.errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direct-last_name">Apellidos *</Label>
                  <Input id="direct-last_name" {...directForm.register('last_name')} placeholder="Pérez" />
                  {directForm.formState.errors.last_name && (
                    <p className="text-sm text-destructive">{directForm.formState.errors.last_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direct-phone">Teléfono</Label>
                  <Input id="direct-phone" {...directForm.register('phone')} placeholder="809-555-1234" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direct-id_number">Cédula</Label>
                  <Input id="direct-id_number" {...directForm.register('id_number')} placeholder="001-1234567-8" />
                </div>

                <Separator className="md:col-span-2" />

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="direct-password">Contraseña *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generatePassword}
                      className="h-6 text-xs"
                    >
                      Generar aleatoria
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="direct-password"
                      type={showPassword ? 'text' : 'password'}
                      {...directForm.register('password')}
                      placeholder="Mínimo 6 caracteres"
                    />
                    {generatedPassword && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 w-7 p-0"
                        onClick={() => copyToClipboard(generatedPassword)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {directForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{directForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="direct-confirm">Confirmar Contraseña *</Label>
                  <Input
                    id="direct-confirm"
                    type={showPassword ? 'text' : 'password'}
                    {...directForm.register('confirm_password')}
                    placeholder="Repetí la contraseña"
                  />
                  {directForm.formState.errors.confirm_password && (
                    <p className="text-sm text-destructive">{directForm.formState.errors.confirm_password.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded border-border"
                    />
                    Mostrar contraseña
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || directForm.formState.disabled} className="w-full sm:w-auto">
                  {loading ? 'Creando...' : 'Crear Usuario'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
