import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MANAGED_MODULES = ['discipleship', 'reports', 'zones', 'events'] as const;
export type ManagedModule = (typeof MANAGED_MODULES)[number];

export type RoleKey = 'pastor' | 'staff' | 'supervisor' | 'server';

export type RoleModuleMatrix = Record<RoleKey, Record<ManagedModule, boolean>>;

const ROLES: RoleKey[] = ['pastor', 'staff', 'supervisor', 'server'];

const defaultMatrix = (): RoleModuleMatrix =>
  Object.fromEntries(
    ROLES.map(role => [role, Object.fromEntries(MANAGED_MODULES.map(m => [m, false]))])
  ) as RoleModuleMatrix;

export function useRolePermissions() {
  const [matrix, setMatrix] = useState<RoleModuleMatrix>(defaultMatrix());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('role_module_access')
      .select('role, module_key, enabled');

    if (error) {
      toast.error('Error al cargar permisos de roles');
      setLoading(false);
      return;
    }

    const m = defaultMatrix();
    (data as { role: string; module_key: string; enabled: boolean }[])?.forEach(row => {
      const role = row.role as RoleKey;
      const mod = row.module_key as ManagedModule;
      if (m[role] && mod in m[role]) {
        m[role][mod] = row.enabled;
      }
    });
    setMatrix(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (role: RoleKey, mod: ManagedModule) => {
      if (role === 'pastor') return; // pastor always has full access

      const newValue = !matrix[role][mod];
      setMatrix(prev => ({ ...prev, [role]: { ...prev[role], [mod]: newValue } }));

      setSaving(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('role_module_access')
        .upsert(
          { role, module_key: mod, enabled: newValue, updated_at: new Date().toISOString() },
          { onConflict: 'role,module_key' }
        );
      setSaving(false);

      if (error) {
        toast.error('Error al guardar permiso');
        setMatrix(prev => ({ ...prev, [role]: { ...prev[role], [mod]: !newValue } }));
      }
    },
    [matrix]
  );

  /** Returns allowed modules for a given role (enabled = true) */
  const getAllowedModules = useCallback(
    (role: string): string[] => {
      const r = matrix[role as RoleKey];
      if (!r) return MANAGED_MODULES as unknown as string[];
      return MANAGED_MODULES.filter(m => r[m]);
    },
    [matrix]
  );

  return { matrix, loading, saving, toggle, reload: load, getAllowedModules };
}
