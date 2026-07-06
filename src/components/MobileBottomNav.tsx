import { useState } from 'react';
import { BarChart3, Heart, Home, Menu, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useMobileNavHidden } from '@/components/mobile/mobile-nav-state';
import { MobileMoreSheet } from '@/components/mobile/MobileMoreSheet';
import { useSystem } from '@/contexts/SystemContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ROLE_LEVELS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface BottomNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredModule?: string;
  minRole: number;
}

const NAV_ITEMS: BottomNavItem[] = [
  { title: 'Inicio', url: '/dashboard', icon: Home, minRole: ROLE_LEVELS.member },
  {
    title: 'Discipulado',
    url: '/dashboard/discipleship',
    icon: Heart,
    requiredModule: 'discipleship',
    minRole: ROLE_LEVELS.member,
  },
  {
    title: 'Miembros',
    url: '/dashboard/users',
    icon: Users,
    minRole: ROLE_LEVELS.staff,
  },
  {
    title: 'Reportes',
    url: '/dashboard/reports',
    icon: BarChart3,
    requiredModule: 'reports',
    minRole: ROLE_LEVELS.supervisor,
  },
];

interface MobileBottomNavProps {
  /** Modo mobile exclusivo (useMobileMode): siempre visible sin importar el viewport */
  exclusive?: boolean;
}

export function MobileBottomNav({ exclusive = false }: MobileBottomNavProps) {
  const location = useLocation();
  const { isModuleInstalled } = useSystem();
  const { hasAccess } = usePermissions();
  const navHidden = useMobileNavHidden();
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!hasAccess(item.minRole)) return false;
    if (!item.requiredModule) return true;
    return isModuleInstalled(item.requiredModule);
  });

  // Patrón pushed-detail: las pantallas de detalle ocultan el nav
  if (navHidden) return null;

  return (
    <>
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-[var(--glass-background)] backdrop-blur-lg border-t border-border/30 shadow-[0_-4px_24px_rgba(0,0,0,0.15)]',
          !exclusive && 'md:hidden'
        )}
      >
        <div
          className="flex items-stretch"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {visibleItems.map(item => {
            const isActive =
              item.url === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.url);
            return (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === '/dashboard'}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors"
              >
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 transition-all duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'p-1.5 rounded-xl transition-all duration-200',
                      isActive && 'bg-primary/15'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', isActive && 'scale-110')} />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium leading-none',
                      isActive && 'font-semibold'
                    )}
                  >
                    {item.title}
                  </span>
                </div>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Más opciones"
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] transition-colors"
          >
            <div
              className={cn(
                'flex flex-col items-center gap-1 transition-all duration-200',
                moreOpen ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-200',
                  moreOpen && 'bg-primary/15'
                )}
              >
                <Menu className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium leading-none">Más</span>
            </div>
          </button>
        </div>
      </nav>

      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
