import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserService } from '@/services/user.service';
import type { User } from '@/types/user.types';

function useDebouncedValue<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

interface UserSearchPickerProps {
  /** user ids that should not appear (already members / already assigned) */
  excludeUserIds: Set<string>;
  /** when set, shows the chosen user as a chip with a clear button */
  selected?: User | null;
  /** placeholder for the search input */
  placeholder?: string;
  onPick: (u: User | null) => void;
}

/**
 * Type-to-search picker over the church users table. Queries the backend
 * (`UserService.getUsers({ search })`) on every keystroke (debounced) so it
 * always reflects the live `users` table — not a preloaded list.
 */
export function UserSearchPicker({
  excludeUserIds,
  selected,
  placeholder = 'Buscar por nombre, email o documento…',
  onPick,
}: UserSearchPickerProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 250);
  const [focused, setFocused] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ['users-search', debounced],
    queryFn: () => UserService.getUsers({ search: debounced, limit: 20 }),
    enabled: focused && debounced.trim().length >= 1,
  });

  const results = useMemo(() => {
    const list = data?.users ?? [];
    return list.filter(u => !excludeUserIds.has(u.id)).slice(0, 8);
  }, [data, excludeUserIds]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 bg-muted/30">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {selected.first_name} {selected.last_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">{selected.email}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => onPick(null)}
          type="button"
          aria-label="Quitar selección"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          className="pl-9"
          autoComplete="off"
        />
      </div>
      {focused && debounced.trim().length >= 1 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-64 overflow-y-auto">
          {isFetching ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>
          ) : (
            results.map(u => (
              <button
                key={u.id}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onPick(u);
                  setQuery('');
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b border-border last:border-b-0"
              >
                <p className="font-medium truncate">
                  {u.first_name} {u.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
