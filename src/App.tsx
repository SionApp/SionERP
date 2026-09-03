import * as Sentry from '@sentry/react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy, useEffect, useState } from 'react';
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
import { ApiService } from './services/api.service';
import { setLoadingCallbacks } from './services/api.service';
import { setDashboardLoadingCallbacks } from './services/dashboard.service';
import { useMagicLinkCallback } from './hooks/useMagicLinkCallback';
import { useSessionGuard } from './hooks/useSessionGuard';
import { ROLE_LEVELS } from './lib/permissions';

// Páginas del dashboard: carga perezosa — cada una es su propio chunk, así
// el bundle inicial no arrastra las 14 pantallas de golpe cuando el usuario
// solo va a visitar 1 o 2 en la sesión. Login/Register/Setup quedan estáticas
// porque son lo primero que se ve, sin excepción.
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'));
const DiscipleshipPage = lazy(() => import('./pages/dashboard/DiscipleshipPage'));
const EventsPage = lazy(() => import('./pages/dashboard/EventsPage'));
const GoalsDashboard = lazy(() =>
  import('./pages/dashboard/GoalsDashboard').then(m => ({ default: m.GoalsDashboard }))
);
const ModulesManagementPage = lazy(() => import('./pages/dashboard/ModulesManagementPage'));
const ProfilePage = lazy(() => import('./pages/dashboard/ProfilePage'));
const RegisterUserPage = lazy(() => import('./pages/dashboard/RegisterUserPage'));
const ReportsPage = lazy(() => import('./pages/dashboard/ReportsPage'));
const RoleManagementPage = lazy(() => import('./pages/dashboard/RoleManagementPage'));
const RolesPage = lazy(() => import('./pages/dashboard/RolesPage'));
const TrazabilidadPage = lazy(() => import('./pages/dashboard/TrazabilidadPage'));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));
const UsersPage = lazy(() => import('./pages/dashboard/UsersPage'));
const ZonesPage = lazy(() => import('./pages/dashboard/ZonesPage'));
const MusicPage = lazy(() => import('./pages/dashboard/MusicPage'));
const MusicEventDetailPage = lazy(() => import('./pages/dashboard/music/MusicEventDetailPage'));

// Educación: shell + nested route tree (PR-C). Each leaf is its own chunk so
// the admin-only editor/quiz-builder work (lazy-loaded further, PR-I/J)
// never ships to a student session.
const EducationShell = lazy(() => import('./pages/dashboard/education/EducationShell'));
const EducationAdminGate = lazy(() => import('./pages/dashboard/education/EducationAdminGate'));
const LegacyCurriculumRedirect = lazy(
  () => import('./pages/dashboard/education/LegacyCurriculumRedirect')
);
const LegacyCurriculumListRoute = lazy(
  () => import('./pages/dashboard/education/LegacyCurriculumListRoute')
);
const CurriculumEditorPage = lazy(() => import('./pages/dashboard/education/CurriculumEditor'));

const StudentHome = lazy(() => import('./pages/dashboard/education/student/StudentHome'));
const CourseCatalog = lazy(() => import('./pages/dashboard/education/student/CourseCatalog'));
const CourseDetail = lazy(() => import('./pages/dashboard/education/student/CourseDetail'));
const LessonViewer = lazy(() => import('./pages/dashboard/education/student/LessonViewer'));
const QuizRunner = lazy(() => import('./pages/dashboard/education/student/QuizRunner'));
const QuizResult = lazy(() => import('./pages/dashboard/education/student/QuizResult'));

const LessonEditor = lazy(() => import('./pages/dashboard/education/admin/LessonEditor'));
const QuizBuilder = lazy(() => import('./pages/dashboard/education/admin/QuizBuilder'));
const StudentProgress = lazy(() => import('./pages/dashboard/education/admin/StudentProgress'));
const ReviewQueue = lazy(() => import('./pages/dashboard/education/admin/ReviewQueue'));

// Fallback mientras se descarga el chunk de la página — mismo spinner que
// ya usa SetupGuard, para que no se sienta como un componente distinto.
const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx (403 "sin rol en el módulo", 404, etc.) nunca se arregla reintentando —
      // el default de 3 reintentos con backoff dejaba el skeleton de carga varios
      // segundos antes de asentarse en el estado vacío/error real.
      retry: (failureCount, error) => {
        const status = (error as { status?: number } | undefined)?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

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

  // Sesión única activa + vencimiento por inactividad + reacción en vivo a
  // cambios críticos del propio usuario (ver hooks/useSessionGuard.ts).
  useSessionGuard();

  useEffect(() => {
    // Configurar callbacks de loading para los servicios
    setLoadingCallbacks({ setFetching, setSubmitting });
    setDashboardLoadingCallbacks({ setFetching });
    // Registrar el service worker (PWA + Web Push #24). Antes solo se
    // registraba desde la landing legacy (Index.tsx), que no está ruteada —
    // sin esto el push nunca tenía SW en el dashboard.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
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
          <Suspense fallback={<RouteFallback />}>
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
                  path="trazabilidad"
                  element={
                    <ProtectedRoute minRole={ROLE_LEVELS.staff} requiredRoleName="Staff">
                      <TrazabilidadPage />
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
                <Route
                  path="music/eventos/:id"
                  element={
                    <ProtectedRoute minRole={ROLE_LEVELS.member} requiredModule="music">
                      <MusicEventDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="education"
                  element={
                    <ProtectedRoute minRole={ROLE_LEVELS.member} requiredModule="education">
                      <EducationShell />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<StudentHome />} />
                  <Route path="catalogo" element={<CourseCatalog />} />
                  <Route path="curso/:curriculumId" element={<CourseDetail />} />
                  <Route path="curso/:curriculumId/leccion/:lessonId" element={<LessonViewer />} />
                  <Route
                    path="curso/:curriculumId/leccion/:lessonId/quiz"
                    element={<QuizRunner />}
                  />
                  <Route
                    path="curso/:curriculumId/leccion/:lessonId/resultado/:attemptId"
                    element={<QuizResult />}
                  />
                  {/* admin/* (education level >= 3) — EducationAdminGate is client UX only,
                      RequireModuleLevel on the backend is authoritative (design A9). */}
                  <Route path="admin" element={<EducationAdminGate />}>
                    <Route index element={<Navigate to="cursos" replace />} />
                    <Route path="cursos" element={<LegacyCurriculumListRoute />} />
                    <Route path="cursos/:id" element={<CurriculumEditorPage />} />
                    <Route
                      path="cursos/:curriculumId/leccion/:lessonId"
                      element={<LessonEditor />}
                    />
                    <Route
                      path="cursos/:curriculumId/leccion/:lessonId/quiz"
                      element={<QuizBuilder />}
                    />
                    <Route path="progreso" element={<StudentProgress />} />
                    <Route path="revisiones" element={<ReviewQueue />} />
                  </Route>
                  {/* legacy bookmark survival: PR1-3c's flat curricula/:id route */}
                  <Route path="curricula/:curriculumId" element={<LegacyCurriculumRedirect />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
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
