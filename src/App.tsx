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
import DashboardHome from './pages/dashboard/DashboardHome';
import DiscipleshipPage from './pages/dashboard/DiscipleshipPage';
import EventsPage from './pages/dashboard/EventsPage';
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
import { useMagicLinkCallback } from './hooks/useMagicLinkCallback';
import { ROLE_LEVELS } from './lib/permissions';

const queryClient = new QueryClient();

// SetupGuard component that checks setup status and redirects accordingly
const SetupGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  useEffect(() => {
    const checkSetupStatus = async () => {
      // Skip check for public routes
      const publicRoutes = ['/setup', '/login', '/register'];
      if (publicRoutes.includes(location.pathname)) {
        setIsChecking(false);
        return;
      }

      try {
        const data = await ApiService.get<{
          is_initialized: boolean;
          has_admin: boolean;
        }>('/setup/status');

        // If system is not initialized AND there's no admin, redirect to /setup
        // If there IS an admin, allow access (admin can initialize the system)
        if (!data.is_initialized && !data.has_admin) {
          setShouldRedirect('/setup');
          return;
        }

        setIsChecking(false);
      } catch (error: any) {
        // If error is 401/403, it means system is initialized and requires auth
        // Allow the route to handle it (ProtectedRoute will redirect to login)
        if (error.status === 401 || error.status === 403) {
          setIsChecking(false);
          return;
        }
        // For other errors, if it might be because system is not initialized
        // and we're not on a public route, try redirecting to setup
        if (location.pathname !== '/setup' && location.pathname !== '/login' && location.pathname !== '/register') {
          // Only redirect if it's likely a "not initialized" error
          if (error.message?.includes('modules') || error.message?.includes('table')) {
            setShouldRedirect('/setup');
            return;
          }
        }
        // For other errors, just continue
        setIsChecking(false);
      }
    };

    checkSetupStatus();
  }, [location.pathname, user?.id]);

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
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Member+ (base access) */}
              <Route index element={<ProtectedRoute minRole={ROLE_LEVELS.member} requiredRoleName="Miembro"><DashboardHome /></ProtectedRoute>} />
              <Route path="profile" element={<ProtectedRoute minRole={ROLE_LEVELS.member} requiredRoleName="Miembro"><ProfilePage /></ProtectedRoute>} />

              {/* Staff+ (staff, supervisor, pastor, admin) */}
              <Route path="users" element={<ProtectedRoute minRole={ROLE_LEVELS.staff} requiredRoleName="Staff"><UsersPage /></ProtectedRoute>} />
              <Route path="register-user" element={<ProtectedRoute minRole={ROLE_LEVELS.staff} requiredRoleName="Staff"><RegisterUserPage /></ProtectedRoute>} />

              {/* Supervisor+ (supervisor, pastor, admin) */}
              <Route path="reports" element={<ProtectedRoute minRole={ROLE_LEVELS.supervisor} requiredModule="reports" requiredRoleName="Supervisor"><ReportsPage /></ProtectedRoute>} />

              {/* Admin only */}
              <Route path="settings" element={<ProtectedRoute minRole={ROLE_LEVELS.admin} requiredRoleName="Administrador"><SettingsPage /></ProtectedRoute>} />
              <Route path="modules" element={<ProtectedRoute minRole={ROLE_LEVELS.admin} requiredRoleName="Administrador"><ModulesManagementPage /></ProtectedRoute>} />
              <Route path="roles" element={<ProtectedRoute minRole={ROLE_LEVELS.admin} requiredRoleName="Administrador"><RolesPage /></ProtectedRoute>} />
              <Route path="role-management" element={<ProtectedRoute minRole={ROLE_LEVELS.admin} requiredRoleName="Administrador"><RoleManagementPage /></ProtectedRoute>} />

              {/* Module-based (member+ but requires module installed) */}
              <Route path="discipleship" element={<ProtectedRoute minRole={ROLE_LEVELS.member} requiredModule="discipleship"><DiscipleshipPage /></ProtectedRoute>} />
              <Route path="zones" element={<ProtectedRoute minRole={ROLE_LEVELS.member} requiredModule="zones"><ZonesPage /></ProtectedRoute>} />
              <Route path="events" element={<ProtectedRoute minRole={ROLE_LEVELS.member} requiredModule="events"><EventsPage /></ProtectedRoute>} />
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

export default App;
