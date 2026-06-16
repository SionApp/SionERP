import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MusicService } from '@/services/music.service';
import { UserService } from '@/services/user.service';
import { Funciones } from '@/types/music.types';
import type {
  MusicMember,
  Funcion,
  Instrument,
  CreateMemberRequest,
  UpdateMemberRequest,
} from '@/types/music.types';
import type { User } from '@/types/user.types';
import { FuncionChip, InstrumentChip, resolveCategory } from './instrument-visual';

const FUNCION_LABELS: Record<Funcion, string> = {
  corista: 'Corista',
  musico: 'Músico',
  tecnico: 'Técnico',
  danzarina: 'Danzarina',
};

function useDebouncedValue<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

interface UserSearchPickerProps {
  excludeUserIds: Set<string>;
  selected: User | null;
  onPick: (u: User | null) => void;
}

function UserSearchPicker({ excludeUserIds, selected, onPick }: UserSearchPickerProps) {
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
          placeholder="Buscar por nombre, email o documento…"
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

interface MemberFormState {
  pickedUser: User | null;
  funciones: Funcion[];
  instrument: string;
  isDirector: boolean;
}

interface MemberFormProps {
  initial?: MusicMember;
  excludeUserIds: Set<string>;
  instruments: Instrument[];
  onSave: (data: CreateMemberRequest | UpdateMemberRequest) => void;
  onCancel: () => void;
  saving: boolean;
}

function MemberForm({
  initial,
  excludeUserIds,
  instruments,
  onSave,
  onCancel,
  saving,
}: MemberFormProps) {
  const [form, setForm] = useState<MemberFormState>({
    pickedUser: null,
    funciones: initial?.funciones ?? [],
    instrument: initial?.instrument ?? '',
    isDirector: initial?.isDirector ?? false,
  });

  function toggleFuncion(f: Funcion) {
    setForm(prev => ({
      ...prev,
      funciones: prev.funciones.includes(f)
        ? prev.funciones.filter(x => x !== f)
        : [...prev.funciones, f],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!initial && !form.pickedUser) {
      toast.error('Elegí un usuario');
      return;
    }
    if (form.funciones.length === 0) {
      toast.error('Seleccioná al menos una función');
      return;
    }
    const instrument = form.instrument.trim() || null;
    if (initial) {
      onSave({
        funciones: form.funciones,
        instrument,
        isDirector: form.isDirector,
      } as UpdateMemberRequest);
    } else {
      onSave({
        userId: form.pickedUser!.id,
        funciones: form.funciones,
        instrument,
        isDirector: form.isDirector,
      } as CreateMemberRequest);
    }
  }

  const activeInstruments = instruments.filter(i => i.isActive);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initial ? (
        <div className="space-y-1">
          <Label>Usuario</Label>
          <UserSearchPicker
            excludeUserIds={excludeUserIds}
            selected={form.pickedUser}
            onPick={u => setForm(prev => ({ ...prev, pickedUser: u }))}
          />
          <p className="text-xs text-muted-foreground">
            Buscá por nombre, email o documento. Solo aparecen usuarios que aún no son integrantes.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border px-3 py-2 bg-muted/30">
          <p className="text-sm font-medium">{initial.name || initial.userId}</p>
          {initial.email && <p className="text-xs text-muted-foreground">{initial.email}</p>}
        </div>
      )}
      <div className="space-y-2">
        <Label>Funciones</Label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(Funciones) as Funcion[]).map(f => (
            <div key={f} className="flex items-center gap-2">
              <Checkbox
                id={`funcion-${f}`}
                checked={form.funciones.includes(f)}
                onCheckedChange={() => toggleFuncion(f)}
              />
              <Label htmlFor={`funcion-${f}`} className="cursor-pointer font-normal">
                {FUNCION_LABELS[f]}
              </Label>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Label>Instrumento / voz</Label>
        <Select
          value={form.instrument || 'none'}
          onValueChange={v => setForm(prev => ({ ...prev, instrument: v === 'none' ? '' : v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sin instrumento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin instrumento</SelectItem>
            {form.instrument && !activeInstruments.some(i => i.name === form.instrument) && (
              <SelectItem value={form.instrument}>{form.instrument}</SelectItem>
            )}
            {activeInstruments.map(ins => (
              <SelectItem key={ins.id} value={ins.name}>
                {ins.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeInstruments.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Cargá el set en la pestaña Instrumentos para poder elegir acá.
          </p>
        )}
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-border p-3 bg-muted/30">
        <Checkbox
          id="is-director"
          checked={form.isDirector}
          onCheckedChange={v => setForm(prev => ({ ...prev, isDirector: v === true }))}
          className="mt-0.5"
        />
        <div className="space-y-0.5">
          <Label htmlFor="is-director" className="cursor-pointer">
            Director de la banda
          </Label>
          <p className="text-xs text-muted-foreground">
            Puede gestionar cultos, asignar servidores y editar el repertorio. No necesita ser
            pastor.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}

interface MusicMembersProps {
  isDirector: boolean;
}

export default function MusicMembers({ isDirector }: MusicMembersProps) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MusicMember | null>(null);
  const [filter, setFilter] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['music-members'],
    queryFn: () => MusicService.getMembers(),
  });

  const { data: instruments = [] } = useQuery({
    queryKey: ['music-instruments'],
    queryFn: () => MusicService.getInstruments(),
  });

  const excludeUserIds = useMemo(() => new Set(members.map(m => m.userId)), [members]);

  const createMutation = useMutation({
    mutationFn: (data: CreateMemberRequest) => MusicService.createMember(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-members'] });
      setDialogOpen(false);
      toast.success('Integrante agregado');
    },
    onError: () => toast.error('No se pudo agregar el integrante'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMemberRequest }) =>
      MusicService.updateMember(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-members'] });
      setDialogOpen(false);
      setEditing(null);
      toast.success('Integrante actualizado');
    },
    onError: () => toast.error('No se pudo actualizar el integrante'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MusicService.deleteMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-members'] });
      toast.success('Integrante eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el integrante'),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(m: MusicMember) {
    setEditing(m);
    setDialogOpen(true);
  }

  function handleSave(data: CreateMemberRequest | UpdateMemberRequest) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: data as UpdateMemberRequest });
    } else {
      createMutation.mutate(data as CreateMemberRequest);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  const filtered = members.filter(m => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      (m.name ?? '').toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q) ||
      m.funciones.some(f => FUNCION_LABELS[f].toLowerCase().includes(q)) ||
      (m.instrument ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Integrantes</CardTitle>
        {isDirector && (
          <Button size="sm" onClick={openCreate} className="gap-1">
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrar integrantes…"
            className="pl-9"
          />
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {members.length === 0 ? 'No hay integrantes registrados.' : 'Sin coincidencias.'}
          </p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {filtered.map(m => (
              <div key={m.id} className="flex items-center justify-between px-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{m.name ?? m.userId}</p>
                    {m.isDirector && (
                      <Badge className="text-xs bg-primary/15 text-primary border-0 shrink-0">
                        Director
                      </Badge>
                    )}
                    {!m.active && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  {m.email && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {m.funciones.map(f => (
                      <FuncionChip key={f} funcion={f} />
                    ))}
                    {m.instrument && (
                      <InstrumentChip
                        name={m.instrument}
                        category={resolveCategory(m.instrument, instruments)}
                      />
                    )}
                  </div>
                </div>
                {isDirector && (
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(m)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteMutation.mutate(m.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar integrante' : 'Nuevo integrante'}</DialogTitle>
          </DialogHeader>
          <MemberForm
            initial={editing ?? undefined}
            excludeUserIds={excludeUserIds}
            instruments={instruments}
            onSave={handleSave}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
