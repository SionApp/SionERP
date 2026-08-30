import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Network, Search, Users } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import type { User } from '@/types/user.types';
import type { DiscipleshipGroup, Zone } from '@/types/discipleship.types';

/**
 * Búsqueda global del topbar (MD3 — issue #159 handoff). El pill visual ya
 * existía en DashboardLayout; este componente le agrega la funcionalidad:
 * tipear abre un dropdown con resultados de usuarios/grupos/zonas (ver
 * useGlobalSearch para el gating por rol/módulo), y elegir uno navega a la
 * pantalla correspondiente ya con ese registro abierto/filtrado.
 */
export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading, hasQuery, canSearchAnything } = useGlobalSearch(query);

  if (!canSearchAnything) return null;

  const close = () => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const selectUser = (user: User) => {
    close();
    navigate('/dashboard/users', { state: { openUserId: user.id } });
  };
  const selectGroup = (group: DiscipleshipGroup) => {
    close();
    navigate('/dashboard/discipleship', {
      state: { tab: 'manage', presetSearch: group.group_name },
    });
  };
  const selectZone = (zone: Zone) => {
    close();
    navigate('/dashboard/zones', { state: { presetSearch: zone.name } });
  };

  const totalResults = results.users.length + results.groups.length + results.zones.length;

  return (
    <Popover open={open && hasQuery} onOpenChange={o => !o && setOpen(false)}>
      <PopoverAnchor asChild>
        <div className="hidden items-center gap-2.5 rounded-full bg-surface-variant px-4 py-2.5 md:flex md:w-full md:max-w-[400px]">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => {
              if (e.key === 'Escape') close();
            }}
            placeholder="Buscar usuarios, grupos, zonas…"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="w-[400px] max-h-[70vh] overflow-y-auto rounded-md3 border-outline-variant bg-surface-white p-2 shadow-lg"
        onOpenAutoFocus={e => e.preventDefault()}
        onCloseAutoFocus={e => e.preventDefault()}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando…
          </div>
        ) : totalResults === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin resultados para "{query.trim()}"
          </p>
        ) : (
          <div className="space-y-3">
            {results.users.length > 0 && (
              <ResultGroup label="Usuarios">
                {results.users.map(u => (
                  <ResultRow
                    key={u.id}
                    icon={<Users className="h-4 w-4" />}
                    title={`${u.first_name} ${u.last_name}`.trim()}
                    subtitle={u.email}
                    onClick={() => selectUser(u)}
                  />
                ))}
              </ResultGroup>
            )}
            {results.groups.length > 0 && (
              <ResultGroup label="Grupos">
                {results.groups.map(g => (
                  <ResultRow
                    key={g.id}
                    icon={<Network className="h-4 w-4" />}
                    title={g.group_name}
                    subtitle={g.zone_name || 'Sin zona asignada'}
                    onClick={() => selectGroup(g)}
                  />
                ))}
              </ResultGroup>
            )}
            {results.zones.length > 0 && (
              <ResultGroup label="Zonas">
                {results.zones.map(z => (
                  <ResultRow
                    key={z.id}
                    icon={<MapPin className="h-4 w-4" />}
                    title={z.name}
                    subtitle={z.description || undefined}
                    onClick={() => selectZone(z)}
                  />
                ))}
              </ResultGroup>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-outline">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md3 px-2 py-2 text-left transition-colors hover:bg-surface-container"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        {subtitle && (
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        )}
      </span>
    </button>
  );
}

export default GlobalSearch;
