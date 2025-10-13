import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user.types';

interface PermissionState {
  canManageRoles: boolean;
  canViewPastoralNotes: boolean;
  isLoading: boolean;
}

export const usePermissions = () => {
  const { currentUser, isLoadingCurrentUser, currentUserLoaded, ensureCurrentUserLoaded } =
    useAuth();
  const [permissions, setPermissions] = useState<PermissionState>({
    canManageRoles: false,
    canViewPastoralNotes: false,
    isLoading: true,
  });

  useEffect(() => {
    const loadPermissions = async () => {
      // Si no tenemos datos del usuario actual, cargarlos
      if (!currentUserLoaded && !isLoadingCurrentUser) {
        await ensureCurrentUserLoaded();
        return; // El efecto se ejecutará de nuevo cuando se actualice currentUser
      }

      // Calcular permisos basados en el rol del usuario
      const canManageRoles = currentUser?.role === 'staff' || currentUser?.role === 'pastor';
      const canViewPastoralNotes = currentUser?.role === 'staff' || currentUser?.role === 'pastor';

      setPermissions({
        canManageRoles,
        canViewPastoralNotes,
        isLoading: isLoadingCurrentUser,
      });
    };

    loadPermissions();
  }, [currentUser, currentUserLoaded, isLoadingCurrentUser, ensureCurrentUserLoaded]);

  return permissions;
};
