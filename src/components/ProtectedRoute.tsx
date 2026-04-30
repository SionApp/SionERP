import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ROLE_LEVELS, ROLE_DISPLAY_NAMES } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Minimum role level required (e.g., ROLE_LEVELS.staff) */
  minRole?: number;
  /** Specific role name for display purposes in access denied message */
  requiredRoleName?: string;
  /** Optional module that must be installed */
  requiredModule?: string;
}

const ProtectedRoute = ({
  children,
  minRole,
  requiredRoleName,
  requiredModule,
}: ProtectedRouteProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { permissions, loading: permissionsLoading } = usePermissions();

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If no role restriction specified, just check auth
  if (!minRole && !requiredModule) {
    return <>{children}</>;
  }

  // Permissions loading (only when role check is needed)
  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Check role level
  if (minRole && (!permissions || permissions.role_level < minRole)) {
    return (
      <AccessDeniedPage
        requiredRole={requiredRoleName || getRoleName(minRole)}
        currentRole={permissions?.role || 'desconocido'}
      />
    );
  }

  // Check module requirement
  if (
    requiredModule &&
    (!permissions || !permissions.installed_modules.includes(requiredModule))
  ) {
    return (
      <AccessDeniedPage
        message="Este módulo no está instalado o no tienes acceso a él."
        requiredModule={requiredModule}
      />
    );
  }

  return <>{children}</>;
};

/** Get role display name from level */
function getRoleName(level: number): string {
  const entry = Object.entries(ROLE_LEVELS).find(([, lvl]) => lvl === level);
  return entry ? ROLE_DISPLAY_NAMES[entry[0]] : `Nivel ${level}`;
}

/** Access denied page */
const AccessDeniedPage = ({
  requiredRole,
  currentRole,
  message,
  requiredModule,
}: {
  requiredRole?: string;
  currentRole?: string;
  message?: string;
  requiredModule?: string;
}) => {
  const defaultMessage = message
    ? message
    : requiredRole
      ? `Acceso denegado. Se requiere rol de **${requiredRole}** (tu rol actual: ${currentRole}).`
      : requiredModule
        ? `El módulo "${requiredModule}" no está disponible.`
        : 'No tienes permisos para acceder a esta página.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md p-8">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Acceso Denegado</h2>
        <p
          className="text-muted-foreground mb-6"
          dangerouslySetInnerHTML={{ __html: defaultMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
        />
        <a
          href="/dashboard"
          className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Volver al Dashboard
        </a>
      </div>
    </div>
  );
};

export default ProtectedRoute;
