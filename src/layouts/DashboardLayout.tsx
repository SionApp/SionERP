import { AppSidebar } from '@/components/AppSidebar';
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
import { invalidatePermissionsCache } from '@/lib/permissions';
import { UserService } from '@/services/user.service';
import { Bell, LogOut, Palette, UserCircle, Wrench } from 'lucide-react';
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
  const siteName = systemSettings?.site_name || 'Sistema Sion';

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
        <div className="h-[100dvh] w-full bg-background fixed inset-0">
          <main className="h-full overflow-x-hidden overflow-y-auto pb-16">
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
      <div className="h-[100dvh] flex flex-col w-full bg-gradient-to-br from-background via-background to-accent/5 overflow-hidden fixed inset-0">
        {/* Aviso para staff+: mantenimiento activo (los demás ven la pantalla de mantenimiento) */}
        {systemSettings?.maintenance_mode && isStaffPlus && (
          <div className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs sm:text-sm px-4 py-1.5 text-center border-b border-amber-500/30 shrink-0 z-50">
            ⚠️ Modo mantenimiento activo — los usuarios sin rol de staff no pueden entrar.
            Desactivalo en Configuración → General.
          </div>
        )}

        {/* Header Glass Morphism */}
        <header className="h-14 sm:h-16 flex items-center justify-between bg-[var(--glass-background)] backdrop-blur-lg border-b border-border/30 px-2 sm:px-4 md:px-6 shadow-[var(--shadow-glass)] gap-2 shrink-0 z-50">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="p-2 rounded-xl hover:bg-accent/50 transition-colors" />
            <div className="flex items-center gap-3">
              {systemSettings?.logo_url ? (
                <img
                  src={systemSettings.logo_url}
                  alt={siteName}
                  className="w-9 h-9 rounded-xl object-cover shadow-lg"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                  <span className="text-primary-foreground font-bold text-sm">
                    {siteName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {siteName}
                </h1>
                <p className="hidden sm:block text-xs text-muted-foreground">
                  Panel de Administración
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-accent/30 backdrop-blur-sm border border-border/30 hover:bg-accent/50 transition-colors cursor-pointer">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={avatarUrl} alt="Avatar" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold text-xs">
                      {user?.user_metadata?.first_name?.[0] || user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium leading-tight">
                      {user?.user_metadata?.first_name || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight">
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
                  <UserCircle className="h-4 w-4 mr-2" /> Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/dashboard/settings')}
                  className="cursor-pointer"
                >
                  <Palette className="h-4 w-4 mr-2" /> Colores del sistema
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Salir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />

            <PreferencesPanel />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-xl">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
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

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="md:hidden flex items-center justify-center rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 w-full overflow-hidden">
          <AppSidebar siteName={siteName} logoUrl={systemSettings?.logo_url} />
          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto pb-20 md:pb-8">
            <Outlet />
          </main>
        </div>

        <MobileBottomNav />
      </div>

      {/* Panel secreto de módulos — Ctrl + Shift + S */}
      <SetupModal isOpen={isSetupOpen} onClose={() => setSetupOpen(false)} />
    </SidebarProvider>
  );
};

export default DashboardLayout;
