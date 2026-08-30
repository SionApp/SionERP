import { AppSidebar } from '@/components/AppSidebar';
import { FederatedBanner } from '@/components/FederatedBanner';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SetupModal } from '@/components/SetupModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PreferencesPanel } from '@/components/PreferencesPanel';
import { useBrandColors } from '@/hooks/useBrandColors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationCenter } from '@/components/ui/notifications';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileMode } from '@/hooks/useMobileMode';
import { useNotificationsData } from '@/hooks/useNotificationsData';
import { useSetupShortcut } from '@/hooks/useSetupShortcut';
import { useSystemPublicSettings } from '@/hooks/useSystemPublicSettings';
import { coBrand } from '@/lib/branding';
import { invalidatePermissionsCache } from '@/lib/permissions';
import { UserService } from '@/services/user.service';
import { Bell, LogOut, Palette, UserCircle, Wrench } from 'lucide-react';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const PROFILE_PATH = '/dashboard/profile';
const ONBOARDING_ALLOWED = [PROFILE_PATH, '/dashboard'];

const DashboardLayout = () => {
  const { user, logout: authLogout } = useAuth();
  useBrandColors();
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss } = useNotificationsData();
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen: isSetupOpen, setIsOpen: setSetupOpen } = useSetupShortcut();
  const isMobileApp = useMobileMode();

  // Fetch user role from API — re-runs whenever the auth user changes
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const userData = await UserService.getCurrentUser();
        setUserRole(userData.role || '');
        setAvatarUrl(userData.avatar_url || '');
        if (!userData.onboarding_completed) {
          setNeedsOnboarding(true);
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user?.id]);

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

  const handleLogout = useCallback(async () => {
    try {
      invalidatePermissionsCache();
      await authLogout();
    } catch {
      // authLogout itself should not throw, but just in case
    } finally {
      window.location.href = '/login';
    }
  }, [authLogout]);

  // Settings del sistema: animaciones, logout por inactividad, mantenimiento, nombre
  const { settings: systemSettings } = useSystemPublicSettings(handleLogout);
  const isStaffPlus = ['admin', 'pastor', 'staff'].includes(userRole);
  const churchName = systemSettings?.church_name || 'Tu Iglesia';

  useEffect(() => {
    document.title = coBrand(systemSettings?.church_name);
  }, [systemSettings?.church_name]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Modo mantenimiento: pantalla completa para no-staff (el backend además responde 503)
  if (systemSettings?.maintenance_mode && !isStaffPlus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <Wrench className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Sistema en mantenimiento</h1>
          <p className="text-muted-foreground">
            Estamos haciendo mejoras. Volvé a intentar en unos minutos.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  // ── Modo mobile EXCLUSIVO (app nativa o preview ?m=1) ──
  // Sin sidebar ni header web: cada pantalla trae su propio header (MobileScreen).
  // Modales compartidos viven FUERA del branch.
  if (isMobileApp) {
    return (
      <>
        {/* Contenedor principal SIN overflow-hidden para no romper fixed children en Safari */}
        <div className="h-[100dvh] w-full bg-background fixed inset-0 flex flex-col">
          <FederatedBanner />
          <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto pb-16">
            <Outlet />
          </main>
        </div>
        {/* Bottom nav FUERA del contenedor — fixed respecto al viewport */}
        <MobileBottomNav exclusive />
        <SetupModal isOpen={isSetupOpen} onClose={() => setSetupOpen(false)} />
      </>
    );
  }

  return (
    <SidebarProvider>
      <div className="fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-surface">
        <FederatedBanner />
        {/* Aviso para staff+: mantenimiento activo (los demás ven la pantalla de mantenimiento) */}
        {systemSettings?.maintenance_mode && isStaffPlus && (
          <div className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs sm:text-sm px-4 py-1.5 text-center border-b border-amber-500/30 shrink-0 z-50">
            ⚠️ Modo mantenimiento activo — los usuarios sin rol de staff no pueden entrar.
            Desactivalo en Configuración → General.
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar full-height (con la marca arriba, MD3 handoff) */}
          <AppSidebar churchName={churchName} logoUrl={systemSettings?.logo_url} />

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Topbar MD3 — sobre el contenido, no sobre el sidebar */}
            <header className="flex h-16 shrink-0 items-center gap-3.5 border-b border-outline-variant bg-surface px-2 sm:px-6">
              <SidebarTrigger className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10" />

              <GlobalSearch />

              <div className="flex-1" />

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <ThemeToggle />
                <PreferencesPanel />

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-surface" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-0" align="end">
                    <NotificationCenter
                      notifications={notifications}
                      onMarkAsRead={markAsRead}
                      onMarkAllAsRead={markAllAsRead}
                      onDismiss={dismiss}
                    />
                  </PopoverContent>
                </Popover>

                {/* User chip (primary-container, MD3 handoff) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="hidden items-center gap-2.5 rounded-full bg-primary-container py-1 pl-1.5 pr-3.5 transition-opacity hover:opacity-90 md:flex">
                      <Avatar className="h-[34px] w-[34px] shrink-0">
                        <AvatarImage src={avatarUrl} alt="Avatar" />
                        <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                          {user?.user_metadata?.first_name?.[0] || user?.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left leading-tight">
                        <p className="text-[13px] font-semibold uppercase text-on-primary-container">
                          {user?.user_metadata?.first_name || user?.email?.split('@')[0]}
                        </p>
                        <p className="text-[11px] text-primary">
                          {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : ''}
                        </p>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => navigate('/dashboard/profile')}
                      className="cursor-pointer"
                    >
                      <UserCircle className="mr-2 h-4 w-4" /> Mi Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate('/dashboard/settings')}
                      className="cursor-pointer"
                    >
                      <Palette className="mr-2 h-4 w-4" /> Colores del sistema
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Salir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="flex items-center justify-center rounded-full transition-colors hover:bg-destructive/10 hover:text-destructive md:hidden"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-8">
              <Outlet />
            </main>
          </div>
        </div>

        <MobileBottomNav />
      </div>

      {/* Panel secreto de módulos — Ctrl + Shift + S */}
      <SetupModal isOpen={isSetupOpen} onClose={() => setSetupOpen(false)} />
    </SidebarProvider>
  );
};

export default DashboardLayout;
