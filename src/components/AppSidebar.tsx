import {
  BarChart3,
  Calendar,
  Heart,
  Home,
  MapPin,
  Settings,
  Shield,
  Sparkles,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useSystem } from '@/contexts/SystemContext';

const menuItems = [
  { title: 'Inicio', url: '/dashboard', icon: Home, requiredModule: 'base' },
  { title: 'Mi Perfil', url: '/dashboard/profile', icon: UserCog, requiredModule: 'base' },
  { title: 'Usuarios', url: '/dashboard/users', icon: Users, requiredModule: 'base' },
  { title: 'Registro', url: '/dashboard/register-user', icon: UserPlus, requiredModule: 'base' },
  { title: 'Roles', url: '/dashboard/roles', icon: Shield, requiredModule: 'base' },
  {
    title: 'Discipulado',
    url: '/dashboard/discipleship',
    icon: Heart,
    requiredModule: 'discipleship',
  },
  { title: 'Zonas', url: '/dashboard/zones', icon: MapPin, requiredModule: 'zones' },
  { title: 'Eventos', url: '/dashboard/events', icon: Calendar, requiredModule: 'events' },
  { title: 'Reportes', url: '/dashboard/reports', icon: BarChart3, requiredModule: 'reports' },
  { title: 'Configuración', url: '/dashboard/settings', icon: Settings, requiredModule: 'base' },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { isModuleInstalled } = useSystem();
  const { user } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  // Filter items based on installed modules
  const filteredItems = menuItems.filter(item => {
    // Always show items for base module
    if (!item.requiredModule || item.requiredModule === 'base') return true;

    // Check if module is installed
    return isModuleInstalled(item.requiredModule);
  });

  // Add Setup link for admins
  const adminItems =
    user?.role === 'admin' ? [{ title: 'Gestión de Módulos', url: '/setup', icon: Sparkles }] : [];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/50 backdrop-blur-lg bg-[var(--glass-background)]"
    >
      <SidebarContent className="bg-transparent">
        <div className="p-3 sm:p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            {state !== 'collapsed' && (
              <div>
                <h3 className="font-bold text-sm text-foreground">Sistema Sion</h3>
                <p className="text-xs text-muted-foreground">Panel Admin</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="px-2 py-3 sm:py-4">
          {state !== 'collapsed' && (
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2 px-2">
              NAVEGACIÓN
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredItems.map(item => {
                const isCurrentActive = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        onClick={() => setOpenMobile(false)}
                        end={item.url === '/dashboard'}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group ${
                          isCurrentActive
                            ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[var(--shadow-accent)] scale-[1.02]'
                            : 'hover:bg-accent/50 hover:scale-[1.01] text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div
                          className={`p-1 rounded-lg transition-all duration-200 ${
                            isCurrentActive ? 'bg-white/20' : 'group-hover:bg-primary/10'
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                        </div>
                        {state !== 'collapsed' && (
                          <span className="font-medium text-sm">{item.title}</span>
                        )}
                        {isCurrentActive && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary-foreground rounded-full opacity-60" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Admin Section */}
              {adminItems.length > 0 && (
                <>
                  <div className="my-2 border-t border-border/30" />
                  {adminItems.map(item => {
                    const isCurrentActive = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            onClick={() => setOpenMobile(false)}
                            className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group ${
                              isCurrentActive
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg scale-[1.02]'
                                : 'hover:bg-accent/50 hover:scale-[1.01] text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <div className="p-1 rounded-lg transition-all duration-200 group-hover:bg-primary/10">
                              <item.icon className="h-4 w-4" />
                            </div>
                            {state !== 'collapsed' && (
                              <span className="font-medium text-sm">{item.title}</span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
