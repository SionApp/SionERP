import { Users, UserPlus, Shield, Home, Settings, BarChart3, Sparkles } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

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
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Inicio", url: "/dashboard", icon: Home },
  { title: "Usuarios", url: "/dashboard/users", icon: Users },
  { title: "Registro", url: "/dashboard/register-user", icon: UserPlus },
  { title: "Roles", url: "/dashboard/roles", icon: Shield },
  { title: "Reportes", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Configuración", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/50 backdrop-blur-lg bg-[var(--glass-background)]"
    >
      <SidebarContent className="bg-transparent">
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            {state !== "collapsed" && (
              <div>
                <h3 className="font-bold text-sm bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Sistema Sion
                </h3>
                <p className="text-xs text-muted-foreground">Panel Admin</p>
              </div>
            )}
          </div>
        </div>
        
        <SidebarGroup className="px-2 py-4">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-2">
            {state !== "collapsed" && "NAVEGACIÓN"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/dashboard"}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group ${
                          isActive 
                            ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[var(--shadow-accent)] scale-[1.02]" 
                            : "hover:bg-accent/50 hover:scale-[1.01] text-muted-foreground hover:text-foreground"
                        }`
                      }
                    >
                      <div className={`p-1 rounded-lg transition-all duration-200 ${
                        currentPath === item.url 
                          ? "bg-white/20" 
                          : "group-hover:bg-primary/10"
                      }`}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      {state !== "collapsed" && (
                        <span className="font-medium text-sm">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}