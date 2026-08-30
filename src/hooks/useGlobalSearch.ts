import { useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { ROLE_LEVELS } from '@/lib/permissions';
import { UserService } from '@/services/user.service';
import { DiscipleshipService } from '@/services/discipleship.service';
import { ZonesService } from '@/services/zones.service';
import type { User } from '@/types/user.types';
import type { DiscipleshipGroup, Zone } from '@/types/discipleship.types';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const MAX_RESULTS = 5;

export interface GlobalSearchResults {
  users: User[];
  groups: DiscipleshipGroup[];
  zones: Zone[];
}

const EMPTY_RESULTS: GlobalSearchResults = { users: [], groups: [], zones: [] };

/**
 * Búsqueda global del topbar. Reusa los endpoints de búsqueda que ya existen
 * (users/groups aceptan ?search= en el backend); zonas no tiene búsqueda en
 * el backend — se trae la lista completa (siempre chica, unas pocas por
 * iglesia) y se filtra en el cliente, mismo patrón que ZoneManagement.
 *
 * Cada categoría se gatea igual que el resto de la app: usuarios requiere
 * staff+ (mismo nivel que el endpoint backend exige), grupos y zonas
 * requieren el módulo instalado — así nunca se dispara un 403 al escribir.
 */
export function useGlobalSearch(query: string) {
  const { permissions } = usePermissions();
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);

  const trimmed = query.trim();
  const isStaffPlus = (permissions?.role_level ?? 0) >= ROLE_LEVELS.staff;
  const canSearchUsers = isStaffPlus;
  // Grupos aterriza en el tab "manage" del shell de admin (DiscipleshipPage),
  // que solo ven roles staff+ — un supervisor/líder tiene su propia vista de
  // discipulado, no ese shell, así que no tiene sentido ofrecerle este destino.
  const canSearchGroups =
    isStaffPlus && (permissions?.installed_modules?.includes('discipleship') ?? false);
  const canSearchZones = permissions?.installed_modules?.includes('zones') ?? false;

  useEffect(() => {
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      const [usersRes, groupsRes, zonesRes] = await Promise.all([
        canSearchUsers
          ? UserService.getUsers({ search: trimmed, limit: MAX_RESULTS }).catch(() => null)
          : Promise.resolve(null),
        canSearchGroups
          ? DiscipleshipService.getGroups({ search: trimmed, limit: MAX_RESULTS }).catch(() => null)
          : Promise.resolve(null),
        canSearchZones
          ? ZonesService.getZones({ is_active: true }).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (cancelled) return;

      const q = trimmed.toLowerCase();
      setResults({
        users: usersRes?.users ?? [],
        groups: groupsRes?.data ?? [],
        zones: (zonesRes ?? []).filter(z => z.name.toLowerCase().includes(q)).slice(0, MAX_RESULTS),
      });
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, canSearchUsers, canSearchGroups, canSearchZones]);

  return {
    results,
    loading,
    hasQuery: trimmed.length >= MIN_QUERY_LENGTH,
    canSearchAnything: canSearchUsers || canSearchGroups || canSearchZones,
  };
}
