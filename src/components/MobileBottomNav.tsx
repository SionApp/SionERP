import { useState } from 'react';
import { Menu } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useMobileNavHidden } from '@/components/mobile/mobile-nav-state';
import { MobileMoreSheet } from '@/components/mobile/MobileMoreSheet';
import { useSystem } from '@/contexts/SystemContext';
import { usePermissions } from '@/hooks/usePermissions';
import { menuItems, filterNavItems } from '@/lib/nav-items';
import { useMusicAccess } from '@/pages/dashboard/music/use-music-access';
import { useEducationAccess } from '@/pages/dashboard/education/use-education-access';
import { cn } from '@/lib/utils';

// Primary bottom-tab row, in this exact left-to-right order: Inicio ·
// Discipulado · Música · Educación (swapped in for Miembros/Reportes at the
// user's request). Pulled from `menuItems` (nav-items.ts), the single
// source of truth the "Más" sheet already reads from, so these stay in sync
// with the rest of the app's nav config instead of drifting as their own
// hardcoded list.
const BOTTOM_NAV_URLS = [
  '/dashboard',
  '/dashboard/discipleship',
  '/dashboard/music',
  '/dashboard/education',
];

interface MobileBottomNavProps {
  /** Modo mobile exclusivo (useMobileMode): siempre visible sin importar el viewport */
  exclusive?: boolean;
}

export function MobileBottomNav({ exclusive = false }: MobileBottomNavProps) {
  const location = useLocation();
  const { isModuleInstalled } = useSystem();
  const { permissions, hasAccess } = usePermissions();
  const { hasAccess: hasMusicAccess } = useMusicAccess();
  const { hasAccess: hasEducationAccess } = useEducationAccess();
  const navHidden = useMobileNavHidden();
  const [moreOpen, setMoreOpen] = useState(false);

  // Música/Educación are `requiresMembership: true` in nav-items.ts — module
  // installed isn't enough, the user must actually belong to that module's
  // team (same gate the "Más" sheet already applies to these two).
  const visibleItems = filterNavItems(
    menuItems.filter(i => BOTTOM_NAV_URLS.includes(i.url)),
    {
      permissions,
      hasAccess,
      isModuleInstalled,
      hasModuleAccess: key => {
        if (key === 'music') return hasMusicAccess;
        if (key === 'education') return hasEducationAccess;
        return true;
      },
    }
  );

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
