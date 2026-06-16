import { LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useSystem } from '@/contexts/SystemContext';
import { usePermissions } from '@/hooks/usePermissions';
import { menuItems, superAdminItems, filterNavItems } from '@/lib/nav-items';

/**
 * Mobile "Más" sheet: every section/module the user can reach (driven by the
 * shared nav config, so new modules appear automatically) plus logout.
 */
export function MobileMoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isModuleInstalled } = useSystem();
  const { permissions, hasAccess } = usePermissions();

  const gate = { permissions, hasAccess, isModuleInstalled };
  // Exclude "Inicio" — it's always the first primary tab in the bottom bar.
  const items = filterNavItems(
    menuItems.filter(i => i.url !== '/dashboard'),
    gate
  );
  const adminItems = permissions?.role === 'admin' ? superAdminItems : [];
  const all = [...items, ...adminItems];

  async function handleLogout() {
    onOpenChange(false);
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Menú</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-2 py-4">
          {all.map(item => (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={() => onOpenChange(false)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center transition-colors active:bg-muted"
            >
              <item.icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium leading-tight">{item.title}</span>
            </NavLink>
          ))}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 py-3 text-sm font-semibold text-destructive transition-colors active:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </SheetContent>
    </Sheet>
  );
}
