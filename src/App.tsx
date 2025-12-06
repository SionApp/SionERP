import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoadingOverlay } from './components/LoadingOverlay';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider, useLoadingContext } from './contexts/LoadingContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardHome from './pages/dashboard/DashboardHome';
import DiscipleshipPage from './pages/dashboard/DiscipleshipPage';
import EventsPage from './pages/dashboard/EventsPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import RegisterUserPage from './pages/dashboard/RegisterUserPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import RoleManagementPage from './pages/dashboard/RoleManagementPage';
import RolesPage from './pages/dashboard/RolesPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import UsersPage from './pages/dashboard/UsersPage';
import { setLoadingCallbacks } from './services/api.service';
import { setDashboardLoadingCallbacks } from './services/dashboard.service';

const queryClient = new QueryClient();

const AppContent = () => {
  const { isFetching, isSubmitting, setFetching, setSubmitting } = useLoadingContext();

  useEffect(() => {
    // Configurar callbacks de loading para los servicios
    setLoadingCallbacks({ setFetching, setSubmitting });
    setDashboardLoadingCallbacks({ setFetching });
  }, [setFetching, setSubmitting]);

  return (
    <>
      <LoadingOverlay isLoading={isFetching} variant="fetching" />
      <LoadingOverlay isLoading={isSubmitting} variant="submitting" />
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="register-user" element={<RegisterUserPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="role-management" element={<RoleManagementPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="discipleship" element={<DiscipleshipPage />} />
          </Route>
        </Routes>
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
              <AppContent />
            </AuthProvider>
          </LoadingProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
