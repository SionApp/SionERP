import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { MusicService } from '@/services/music.service';
import type { Instrument, InstrumentCategory, CreateInstrumentRequest } from '@/types/music.types';
import { CATEGORY_META } from './instrument-visual';

const CATEGORY_ORDER: InstrumentCategory[] = [
  'voz',
  'cuerdas',
  'teclas',
  'percusion',
  'viento',
  'tecnico',
  'otro',
];

export default function MusicInstruments({ isDirector }: { isDirector: boolean }) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; category: InstrumentCategory }>({
    name: '',
    category: 'voz',
  });

  const { data: instruments = [], isLoading } = useQuery({
    queryKey: ['music-instruments'],
    queryFn: () => MusicService.getInstruments(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateInstrumentRequest) => MusicService.createInstrument(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-instruments'] });
      setAddOpen(false);
      setForm({ name: '', category: 'voz' });
      toast.success('Instrumento agregado');
    },
    onError: (e: Error & { status?: number }) =>
      toast.error(e.status === 409 ? 'Ese instrumento ya existe' : 'No se pudo agregar'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      MusicService.updateInstrument(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music-instruments'] }),
    onError: () => toast.error('No se pudo actualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => MusicService.deleteInstrument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['music-instruments'] });
      toast.success('Instrumento eliminado');
    },
    onError: () => toast.error('No se pudo eliminar'),
  });

  const grouped = useMemo(() => {
    const map = new Map<InstrumentCategory, Instrument[]>();
    for (const i of instruments) {
      const arr = map.get(i.category) ?? [];
      arr.push(i);
      map.set(i.category, arr);
    }
    return map;
  }, [instruments]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    createMutation.mutate({ name: form.name.trim(), category: form.category });
  }

  return (
    <section className="music-panel p-4 sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="music-eyebrow">Voces, instrumentos y roles técnicos</p>
          <h2 className="music-heading mt-1.5 text-xl leading-none sm:text-2xl">Instrumentos</h2>
        </div>
        {isDirector && (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1 shrink-0">
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </header>
      <div className="space-y-5">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : instruments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay instrumentos en el catálogo todavía.
          </p>
        ) : (
          CATEGORY_ORDER.filter(c => grouped.get(c)?.length).map(cat => {
            const meta = CATEGORY_META[cat];
            const { Icon } = meta;
            return (
              <div key={cat}>
                <div className={cn('mb-2.5 flex items-center gap-2', meta.text)}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[0.625rem] font-bold uppercase leading-none tracking-[0.2em]">
                    {meta.label}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {grouped.get(cat)!.map(ins => (
                    <div
                      key={ins.id}
                      className={cn(
                        'music-row music-row-pill flex items-center gap-2 px-3 py-1.5',
                        !ins.isActive && 'opacity-50'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', meta.text)} />
                      <span className="text-sm">{ins.name}</span>
                      {isDirector && (
                        <div className="ml-1 flex items-center gap-2">
                          <Switch
                            checked={ins.isActive}
                            onCheckedChange={v =>
                              toggleMutation.mutate({ id: ins.id, isActive: v })
                            }
                            aria-label={
                              ins.isActive ? `Desactivar ${ins.name}` : `Activar ${ins.name}`
                            }
                            className="scale-75"
                          />
                          <ConfirmDialog
                            trigger={
                              <button
                                type="button"
                                className="text-destructive hover:opacity-70"
                                aria-label={`Eliminar ${ins.name}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            }
                            title="¿Eliminar instrumento?"
                            description={`Se quita "${ins.name}" del catálogo de la iglesia.`}
                            confirmLabel="Eliminar"
                            onConfirm={() => deleteMutation.mutate(ins.id)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="music-shell">
          <DialogHeader>
            <DialogTitle className="music-heading text-2xl">Nuevo instrumento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="ins-name">Nombre</Label>
              <Input
                id="ins-name"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Violín, Sax tenor, Pad"
              />
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm(p => ({ ...p, category: v as InstrumentCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="music-shell">
                  {CATEGORY_ORDER.map(c => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Agregando…' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
