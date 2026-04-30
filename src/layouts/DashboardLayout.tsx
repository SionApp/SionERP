import { AppSidebar } from '@/components/AppSidebar';
import { SetupModal } from '@/components/SetupModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useSetupShortcut } from '@/hooks/useSetupShortcut';
import { UserService } from '@/services/user.service';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { AlertCircle, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { invalidatePermissionsCache } from '@/lib/permissions';

const PROFILE_PATH = '/dashboard/profile';
const ONBOARDING_ALLOWED = [PROFILE_PATH, '/dashboard'];

const DashboardLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen: isSetupOpen, setIsOpen: setSetupOpen } = useSetupShortcut();

  useEffect(() => {
    getUser();
  }, []);

  // Onboarding guard: re-check on every route change if onboarding was needed
  useEffect(() => {
    if (loading) return;

    const checkAndRedirect = async () => {
      try {
        const userData = await UserService.getCurrentUser();

        // User completed onboarding — clear the flag
        if (userData.onboarding_completed) {
          setNeedsOnboarding(false);
          return;
        }

        // Still needs onboarding — redirect to profile if on restricted route
        setNeedsOnboarding(true);
        const currentPath = location.pathname;
        if (!ONBOARDING_ALLOWED.some(p => currentPath === p || currentPath.startsWith(p + '/'))) {
          navigate(PROFILE_PATH, { replace: true });
        }
      } catch {
        // If we can't check, don't block the user
      }
    };

    checkAndRedirect();
  }, [loading, location.pathname, navigate]);

  const getUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      // Check onboarding status
      if (user) {
        try {
          const userData = await UserService.getCurrentUser();
          setUserRole(userData.role || '');
          if (!userData.onboarding_completed) {
            setNeedsOnboarding(true);
          }
        } catch (err) {
          console.error('Error checking onboarding status:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      // Clear ALL caches on logout
      invalidatePermissionsCache();
      if (error) {
        toast.error('Error al cerrar sesión');
      } else {
        toast.success('Sesión cerrada exitosamente');
        navigate('/login');
      }
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-[100dvh] flex flex-col w-full bg-gradient-to-br from-background via-background to-accent/5 overflow-hidden fixed inset-0">
        {/* Onboarding Banner */}
        {needsOnboarding && location.pathname === '/dashboard/profile' && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>Completá tu perfil</strong> para acceder al sistema. Los campos marcados con *
              son obligatorios.
            </p>
          </div>
        )}

        {/* Header Glass Morphism */}
        <header className="h-14 sm:h-16 flex items-center justify-between bg-[var(--glass-background)] backdrop-blur-lg border-b border-border/30 px-2 sm:px-4 md:px-6 shadow-[var(--shadow-glass)] gap-2 shrink-0 z-50">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="p-2 rounded-xl hover:bg-accent/50 transition-colors" />
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Sistema Sion
                </h1>
                <p className="hidden sm:block text-xs text-muted-foreground">
                  Panel de Administración
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-accent/30 backdrop-blur-sm border border-border/30">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                <span className="text-primary-foreground font-semibold text-xs">
                  {user?.user_metadata?.first_name?.[0] || user?.email?.[0] || 'U'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {user?.user_metadata?.first_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Cargando...'}
                </p>
              </div>
            </div>

            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="sm:hidden flex items-center justify-center rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span>Salir</span>
            </Button>
          </div>
        </header>

        <div className="flex flex-1 w-full overflow-hidden">
          <AppSidebar />
          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto pb-24 sm:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Panel secreto de módulos — Ctrl + Shift + S */}
      <SetupModal isOpen={isSetupOpen} onClose={() => setSetupOpen(false)} />
    </SidebarProvider>
  );
};

export default DashboardLayout;
