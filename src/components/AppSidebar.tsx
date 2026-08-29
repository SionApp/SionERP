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
import { useSystem } from '@/contexts/SystemContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PLATFORM_NAME } from '@/lib/branding';
import { menuItems, superAdminItems, filterNavItems } from '@/lib/nav-items';
import { useMusicAccess } from '@/pages/dashboard/music/use-music-access';

interface AppSidebarProps {
  churchName?: string;
  logoUrl?: string | null;
}

export function AppSidebar({ churchName = 'Tu Iglesia', logoUrl }: AppSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { isModuleInstalled } = useSystem();
  const { permissions, hasAccess } = usePermissions();
  const { hasAccess: hasMusicAccess } = useMusicAccess();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  const hasModuleAccess = (key: string) => (key === 'music' ? hasMusicAccess : true);
  const filteredItems = filterNavItems(menuItems, {
    permissions,
    hasAccess,
    isModuleInstalled,
    hasModuleAccess,
  });

  // Show "Gestión de Módulos" ONLY for the admin role (500).
  // Pastors and staff have admin-level access but shouldn't manage modules
  // (module installation has licensing/payment implications).
  const isSuperAdmin = permissions?.role === 'admin';
  const adminItems = isSuperAdmin ? superAdminItems : [];

  return (
    <Sidebar collapsible="icon" className="border-r border-outline-variant bg-nav-bg">
      <SidebarContent className="bg-nav-bg">
        {/* Cabecera de marca (MD3 — handoff): logo sólido primary + título. */}
        <div className="px-3 pb-4 pt-2">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="h-[42px] w-[42px] shrink-0 rounded-[14px] bg-surface-white p-1">
                <img src={logoUrl} alt={churchName} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] bg-primary text-[19px] font-bold text-primary-foreground">
                {churchName.charAt(0).toUpperCase()}
              </div>
            )}
            {state !== 'collapsed' && (
              <div className="min-w-0">
                <h3 className="truncate text-[16px] font-semibold text-foreground">{churchName}</h3>
                <p className="text-xs text-muted-foreground">{PLATFORM_NAME} · Administración</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="px-2 py-0">
          {state !== 'collapsed' && (
            <SidebarGroupLabel className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.09em] text-outline">
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
                        className={`flex items-center gap-3.5 rounded-full px-4 py-3 transition-colors ${
                          isCurrentActive
                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                            : 'text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        <item.icon className="h-[22px] w-[22px] shrink-0" />
                        {state !== 'collapsed' && (
                          <span className="text-sm font-medium">{item.title}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Admin Section */}
              {adminItems.length > 0 && (
                <>
                  <div className="my-2 border-t border-outline-variant" />
                  {adminItems.map(item => {
                    const isCurrentActive = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            onClick={() => setOpenMobile(false)}
                            className={`flex items-center gap-3.5 rounded-full px-4 py-3 transition-colors ${
                              isCurrentActive
                                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                : 'text-muted-foreground hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]'
                            }`}
                          >
                            <item.icon className="h-[22px] w-[22px] shrink-0" />
                            {state !== 'collapsed' && (
                              <span className="text-sm font-medium">{item.title}</span>
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
