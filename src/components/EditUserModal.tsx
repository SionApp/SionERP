import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, EditUserModalProps } from '@/types/user.types';
import { editUserSchema, EditUserFormData } from '@/schemas/user.schemas';
import { UserService } from '@/services/user.service';

const EditUserModal = ({ user, isOpen, onClose, onUserUpdated }: EditUserModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema)
  });

  const watchedRole = watch('role');
  const watchedBaptized = watch('baptized');
  const watchedWhatsapp = watch('whatsapp');

  useEffect(() => {
    if (user && isOpen) {
      // Resetear y cargar los datos del usuario
      reset();
      setValue('first_name', user.first_name);
      setValue('last_name', user.last_name);
      setValue('email', user.email);
      setValue('phone', user.phone);
      setValue('id_number', user.id_number);
      setValue('address', user.address);
      setValue('role', user.role);
      setValue('baptized', user.baptized);
      setValue('whatsapp', user.whatsapp);
      setValue('pastoral_notes', user.pastoral_notes || '');
      setValue('marital_status', user.marital_status || '');
      setValue('occupation', user.occupation || '');
      setValue('education_level', user.education_level || '');
      setValue('how_found_church', user.how_found_church || '');
      setValue('ministry_interest', user.ministry_interest || '');
      setValue('cell_group', user.cell_group || '');
    }
  }, [user, isOpen, reset, setValue]);

  const onSubmit = async (data: EditUserFormData) => {
    if (!user) return;

    try {
      setIsSubmitting(true);
      await UserService.updateUser(user.id, data);
      toast.success('Usuario actualizado exitosamente');
      onUserUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error al actualizar el usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Actualiza la información de {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Información Personal */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                {...register('first_name')}
                placeholder="Nombre"
              />
              {errors.first_name && (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                {...register('last_name')}
                placeholder="Apellido"
              />
              {errors.last_name && (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id_number">Cédula *</Label>
              <Input
                id="id_number"
                {...register('id_number')}
                placeholder="12345678"
              />
              {errors.id_number && (
                <p className="text-sm text-destructive">{errors.id_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono *</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="04241234567"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="correo@ejemplo.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección *</Label>
            <Textarea
              id="address"
              {...register('address')}
              placeholder="Dirección completa..."
              rows={2}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          {/* Información Adicional */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marital_status">Estado Civil</Label>
              <Input
                id="marital_status"
                {...register('marital_status')}
                placeholder="Soltero, Casado, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Ocupación</Label>
              <Input
                id="occupation"
                {...register('occupation')}
                placeholder="Profesión u ocupación"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="education_level">Nivel Educativo</Label>
              <Input
                id="education_level"
                {...register('education_level')}
                placeholder="Primaria, Secundaria, Universidad, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cell_group">Célula</Label>
              <Input
                id="cell_group"
                {...register('cell_group')}
                placeholder="Nombre de la célula"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="how_found_church">¿Cómo conoció la iglesia?</Label>
            <Input
              id="how_found_church"
              {...register('how_found_church')}
              placeholder="Por un amigo, redes sociales, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ministry_interest">Interés en Ministerios</Label>
            <Input
              id="ministry_interest"
              {...register('ministry_interest')}
              placeholder="Alabanza, enseñanza, evangelismo, etc."
            />
          </div>

          {/* Rol y Estado */}
          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Select value={watchedRole} onValueChange={(value) => setValue('role', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="server">Servidor</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="pastor">Pastor</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          {/* Checkboxes */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="baptized"
                checked={watchedBaptized}
                onCheckedChange={(checked) => setValue('baptized', !!checked)}
              />
              <Label htmlFor="baptized">Bautizado</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="whatsapp"
                checked={watchedWhatsapp}
                onCheckedChange={(checked) => setValue('whatsapp', !!checked)}
              />
              <Label htmlFor="whatsapp">Tiene WhatsApp</Label>
            </div>
          </div>

          {/* Notas Pastorales */}
          <div className="space-y-2">
            <Label htmlFor="pastoral_notes">Notas Pastorales</Label>
            <Textarea
              id="pastoral_notes"
              {...register('pastoral_notes')}
              placeholder="Notas adicionales del pastor..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Actualizando...' : 'Actualizar Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserModal;