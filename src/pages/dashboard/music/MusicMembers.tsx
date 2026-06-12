import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MusicService } from '@/services/music.service';
import { Funciones } from '@/types/music.types';
import type {
  MusicMember,
  Funcion,
  CreateMemberRequest,
  UpdateMemberRequest,
} from '@/types/music.types';

const FUNCION_LABELS: Record<Funcion, string> = {
  corista: 'Corista',
  musico: 'Músico',
  tecnico: 'Técnico',
  danzarina: 'Danzarina',
};

interface MemberFormState {
  userId: string;
  funciones: Funcion[];
  instrument: string;
}

interface MemberFormProps {
  initial?: MusicMember;
  onSave: (data: CreateMemberRequest | UpdateMemberRequest) => void;
  onCancel: () => void;
  saving: boolean;
}

function MemberForm({ initial, onSave, onCancel, saving }: MemberFormProps) {
  const [form, setForm] = useState<MemberFormState>({
    userId: initial?.userId ?? '',
    funciones: initial?.funciones ?? [],
    instrument: initial?.instrument ?? '',
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
    if (!initial && !form.userId.trim()) {
      toast.error('El ID de usuario es requerido');
      return;
    }
    if (form.funciones.length === 0) {
      toast.error('Seleccioná al menos una función');
      return;
    }
    const instrument = form.funciones.includes('musico') ? form.instrument.trim() || null : null;
    if (initial) {
      onSave({ funciones: form.funciones, instrument } as UpdateMemberRequest);
    } else {
      onSave({
        userId: form.userId.trim(),
        funciones: form.funciones,
        instrument,
      } as CreateMemberRequest);
    }
  }

  const showInstrument = form.funciones.includes('musico');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initial && (
        <div className="space-y-1">
          <Label htmlFor="userId">ID de usuario</Label>
          <Input
            id="userId"
            value={form.userId}
            onChange={e => setForm(prev => ({ ...prev, userId: e.target.value }))}
            placeholder="UUID del usuario"
          />
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
      {showInstrument && (
        <div className="space-y-1">
          <Label htmlFor="instrument">Instrumento</Label>
          <Input
            id="instrument"
            value={form.instrument}
            onChange={e => setForm(prev => ({ ...prev, instrument: e.target.value }))}
            placeholder="Ej: guitarra, piano, batería"
          />
        </div>
      )}
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

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['music-members'],
    queryFn: () => MusicService.getMembers(),
  });

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
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay integrantes registrados.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{m.name ?? m.userId}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {m.funciones.map(f => (
                      <Badge key={f} variant="secondary" className="text-xs">
                        {FUNCION_LABELS[f]}
                        {f === 'musico' && m.instrument ? ` — ${m.instrument}` : ''}
                      </Badge>
                    ))}
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
