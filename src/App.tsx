import * as Sentry from '@sentry/react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoadingOverlay } from './components/LoadingOverlay';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoadingProvider, useLoadingContext } from './contexts/LoadingContext';
import { SystemProvider } from './contexts/SystemContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import SetupPage from './pages/SetupPage';
import MobilePreviewPage from './pages/MobilePreviewPage';
import DashboardHome from './pages/dashboard/DashboardHome';
import DiscipleshipPage from './pages/dashboard/DiscipleshipPage';
import EventsPage from './pages/dashboard/EventsPage';
import { GoalsDashboard } from './pages/dashboard/GoalsDashboard';
import ModulesManagementPage from './pages/dashboard/ModulesManagementPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import RegisterUserPage from './pages/dashboard/RegisterUserPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import RoleManagementPage from './pages/dashboard/RoleManagementPage';
import RolesPage from './pages/dashboard/RolesPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import UsersPage from './pages/dashboard/UsersPage';
import { ApiService } from './services/api.service';
import { setLoadingCallbacks } from './services/api.service';
import { setDashboardLoadingCallbacks } from './services/dashboard.service';
import ZonesPage from './pages/dashboard/ZonesPage';
import MusicPage from './pages/dashboard/MusicPage';
import { useMagicLinkCallback } from './hooks/useMagicLinkCallback';
import { ROLE_LEVELS } from './lib/permissions';

const queryClient = new QueryClient();

// Caché a nivel de módulo — persiste mientras la app está montada.
// Evita re-verificar setup en cada navegación interna.
let _setupVerified = false;
let _setupRedirect: string | null = null;

// SetupGuard component that checks setup status and redirects accordingly
const SetupGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();
  // Si ya verificamos antes, arrancamos con isChecking=false
  const [isChecking, setIsChecking] = useState(!_setupVerified);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(_setupRedirect);

  useEffect(() => {
    // Si ya verificamos en esta sesión, no volver a hacerlo
    if (_setupVerified) {
      setIsChecking(false);
      setShouldRedirect(_setupRedirect);
      return;
    }

    const publicRoutes = ['/setup', '/login', '/register', '/mobile-preview'];
    if (publicRoutes.includes(location.pathname)) {
      _setupVerified = true;
      setIsChecking(false);
      return;
    }

    const checkSetupStatus = async () => {
      try {
        const data = await ApiService.get<{
          is_initialized: boolean;
          has_admin: boolean;
        }>('/setup/status');

        if (!data.is_initialized && !data.has_admin) {
          _setupRedirect = '/setup';
          setShouldRedirect('/setup');
        }
      } catch (error) {
        const err = error as { status?: number; message?: string };
        if (err.status !== 401 && err.status !== 403) {
          if (err.message?.includes('modules') || err.message?.includes('table')) {
            _setupRedirect = '/setup';
            setShouldRedirect('/setup');
          }
        }
      } finally {
        _setupVerified = true;
        setIsChecking(false);
      }
    };

    checkSetupStatus();
    // Solo verificar al montar la primera vez, no en cada cambio de ruta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando sistema...</p>
        </div>
      </div>
    );
  }

  if (shouldRedirect) {
    return <Navigate to={shouldRedirect} replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const { isFetching, isSubmitting, setFetching, setSubmitting } = useLoadingContext();

  // Manejar callback del magic link de Supabase
  useMagicLinkCallback();

  useEffect(() => {
    // Configurar callbacks de loading para los servicios
    setLoadingCallbacks({ setFetching, setSubmitting });
    setDashboardLoadingCallbacks({ setFetching });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  return (
    <>
      <LoadingOverlay isLoading={isFetching} variant="fetching" />
      <LoadingOverlay isLoading={isSubmitting} variant="submitting" />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster />
        <Sonner />
        <SetupGuard>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/mobile-preview" element={<MobilePreviewPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Member+ (base access) */}
              <Route
                index
                element={
                  <ProtectedRoute minRole={ROLE_LEVELS.member} requiredRoleName="Miembro">
                    <DashboardHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <ProtectedRoute minRole={ROLE_LEVELS.member} requiredRoleName="Miembro">
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Staff+ (staff, supervisor, pastor, admin) */}
              <Route
                path="users"
                element={
                  <ProtectedRoute minRole={ROLE_LEVELS.staff} requiredRoleName="Staff">
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="register-user"
                element={
                  <ProtectedRoute minRole={ROLE_LEVELS.staff} requiredRoleName="Staff">
                    <RegisterUserPage />
                  </ProtectedRoute>
                }
              />

              {/* Supervisor+ (supervisor, pastor, admin) */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute
                    minRole={ROLE_LEVELS.supervisor}
                    requiredModule="reports"
                    requiredRoleName="Supervisor"
                  >
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin access (pastor or admin — defined by backend has_admin_access flag) */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute requireAdminAccess>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="modules"
                element={
                  <ProtectedRoute requireAdminAccess>
                    <ModulesManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="roles"
                element={
                  <ProtectedRoute requireAdminAccess>
                    <RolesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="role-management"
                element={
                  <ProtectedRoute requireAdminAccess>
                    <RoleManagementPage />
                  </ProtectedRoute>
                }
              />

              {/* Module-based (member+ but requires module installed) */}
              <Route
                path="discipleship"
                element={
                  <ProtectedRoute minRole={ROLE_LEVELS.member} requiredModule="discipleship">
                    <DiscipleshipPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="discipleship/goals"
                element={
                  <ProtectedRoute minRole={ROLE_LEVELS.member} requiredModule="discipleship">
                    <GoalsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="zones"
                element={
                  <ProtectedRoute minRole={ROLE_LEVELS.member} requiredModule="zones">
                    <ZonesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="events"
                element={
                  <ProtectedRoute minRole={ROLE_LEVELS.member} requiredModule="events">
                    <EventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="music"
                element={
                  <ProtectedRoute minRole={ROLE_LEVELS.member} requiredModule="music">
                    <MusicPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </SetupGuard>
      </BrowserRouter>
    </>
  );
};

const App = () => {
  // Asegurar que el defaultTheme sea válido y no tenga espacios
  const safeDefaultTheme = 'dark'; // Valor fijo y seguro

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme={safeDefaultTheme}
        enableSystem
        disableTransitionOnChange
        storageKey="sion-theme"
      >
        <TooltipProvider>
          <LoadingProvider>
            <AuthProvider>
              <SystemProvider>
                <AppContent />
              </SystemProvider>
            </AuthProvider>
          </LoadingProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const SentryWrappedApp = () => (
  <Sentry.ErrorBoundary
    fallback={({ error }) => (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">Ocurrió un error inesperado</p>
          <p className="text-sm text-muted-foreground">{String(error)}</p>
        </div>
      </div>
    )}
  >
    <App />
  </Sentry.ErrorBoundary>
);

export default SentryWrappedApp;
