import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User } from '@/types/user.types';
import { AlertTriangle } from 'lucide-react';

interface DeleteUserDialogProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteUserDialog = ({ 
  user, 
  isOpen, 
  onClose, 
  onConfirm,
  isDeleting = false 
}: DeleteUserDialogProps) => {
  if (!user) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-left">
              ¿Eliminar usuario?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-2">
            <span>
              Estás a punto de eliminar al usuario:
            </span>
            <div className="bg-muted p-3 rounded-md space-y-1">
              <p className="font-semibold text-foreground">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-sm">{user.email}</p>
              <p className="text-sm">Cédula: {user.id_number}</p>
            </div>
            <p className="text-destructive font-medium pt-2">
              ⚠️ Esta acción no se puede deshacer.
            </p>
            <p className="text-sm">
              Se eliminarán todos los datos asociados a este usuario, incluyendo:
            </p>
            <ul className="text-sm list-disc list-inside space-y-1 pl-2">
              <li>Información personal y de contacto</li>
              <li>Historial de asistencia</li>
              <li>Registros de discipulado</li>
              <li>Notas pastorales</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Eliminando...
              </>
            ) : (
              'Sí, eliminar usuario'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteUserDialog;
