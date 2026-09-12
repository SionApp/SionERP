import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDiscipleshipAccess } from '@/hooks/use-discipleship-access';
import { useConvertVisitor } from '@/hooks/use-member-journey';
import { DiscipleshipService, type UserForHierarchy } from '@/services/discipleship.service';
import type { ConvertVisitorRequest, Visitor } from '@/types/discipleship.types';
import { Loader2, UserCheck, UserPlus, Users2 } from 'lucide-react';
import { toast } from 'sonner';

interface GroupVisitorsProps {
  groupId: string;
}

const STATUS_META: Record<Visitor['status'], { label: string; className: string }> = {
  new: { label: 'Nuevo', className: 'bg-blue-500 hover:bg-blue-600' },
  following_up: { label: 'En seguimiento', className: 'bg-amber-500 hover:bg-amber-600' },
  converted: { label: 'Convertido', className: 'bg-emerald-500 hover:bg-emerald-600' },
  inactive: { label: 'Inactivo', className: 'bg-muted text-muted-foreground' },
};

// 'converted' is deliberately absent — the backend now rejects
// `PUT /visitors/:id { status: 'converted' }` with 409 (design "Bug found
// while closing G4"). Conversion only ever happens through the dedicated
// ConvertVisitorDialog below.
const STATUS_OPTIONS: { value: Visitor['status']; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'following_up', label: 'En seguimiento' },
  { value: 'inactive', label: 'Inactivo' },
];

/**
 * The dedicated conversion door (design G4 — staff-driven identity
 * matching, never implicit). Two modes: link an existing member (searched
 * over the already level-2-gated `GET /discipleship/users`) or create a new
 * one from the visitor card, with an optional email.
 */
function ConvertVisitorDialog({
  visitor,
  open,
  onOpenChange,
  onConverted,
}: {
  visitor: Visitor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted: () => void;
}) {
  const [mode, setMode] = useState<'link' | 'create'>('link');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserForHierarchy | null>(null);
  const [email, setEmail] = useState('');
  const convertMutation = useConvertVisitor();

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ['discipleship-users-for-hierarchy'],
    queryFn: () => DiscipleshipService.getUsersForHierarchy(),
    enabled: open && mode === 'link',
    staleTime: 30_000,
  });

  const term = search.trim().toLowerCase();
  const filtered = candidates
    .filter(
      u =>
        !term ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
    )
    .slice(0, 8);

  function reset() {
    setMode('link');
    setSearch('');
    setSelectedUser(null);
    setEmail('');
  }

  function handleSubmit() {
    const data: ConvertVisitorRequest =
      mode === 'link' && selectedUser
        ? { user_id: selectedUser.id }
        : { email: email.trim() || undefined };

    convertMutation.mutate(
      { visitorId: visitor.id, data },
      {
        onSuccess: () => {
          toast.success('Visitante convertido');
          reset();
          onOpenChange(false);
          onConverted();
        },
        onError: (error: unknown) => {
          toast.error(error instanceof Error ? error.message : 'No se pudo convertir al visitante');
        },
      }
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={o => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Convertir a {visitor.first_name} {visitor.last_name}
          </DialogTitle>
          <DialogDescription>
            Vinculá a un miembro que ya existe o creá uno nuevo a partir de esta ficha.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'link' ? 'default' : 'outline'}
            onClick={() => setMode('link')}
          >
            Vincular existente
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'create' ? 'default' : 'outline'}
            onClick={() => setMode('create')}
          >
            Crear nuevo
          </Button>
        </div>

        {mode === 'link' ? (
          <div className="space-y-2">
            <Input
              placeholder="Buscar por nombre o email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {loadingCandidates ? (
                <p className="py-2 text-xs text-muted-foreground">Buscando…</p>
              ) : filtered.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">Sin resultados</p>
              ) : (
                filtered.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-left text-sm',
                      selectedUser?.id === u.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    <p className="truncate font-medium">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="convert-email">Email (opcional)</Label>
            <Input
              id="convert-email"
              type="email"
              placeholder="persona@iglesia.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Si lo dejás vacío, se genera un email temporal para poder crear la cuenta —
              actualizalo después desde Usuarios.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={convertMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={convertMutation.isPending || (mode === 'link' && !selectedUser)}
          >
            {convertMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Convertir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GroupVisitors({ groupId }: GroupVisitorsProps) {
  const { canConvert } = useDiscipleshipAccess();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', notes: '' });
  const [convertingVisitor, setConvertingVisitor] = useState<Visitor | null>(null);

  const loadVisitors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await DiscipleshipService.getGroupVisitors(groupId);
      setVisitors(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Error al cargar visitantes');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  const handleCreate = async () => {
    if (!form.first_name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    try {
      setIsSaving(true);
      await DiscipleshipService.createVisitor(groupId, {
        first_name: form.first_name,
        last_name: form.last_name || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Visitante registrado');
      setIsDialogOpen(false);
      setForm({ first_name: '', last_name: '', phone: '', notes: '' });
      await loadVisitors();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al registrar el visitante');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (visitor: Visitor, status: Visitor['status']) => {
    try {
      await DiscipleshipService.updateVisitor(visitor.id, { status });
      setVisitors(prev => prev.map(v => (v.id === visitor.id ? { ...v, status } : v)));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el visitante');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="w-5 h-5" />
            Visitantes
          </CardTitle>
          <CardDescription>Seguimiento de visitantes hasta convertirse en miembros</CardDescription>
        </div>
        <Button size="sm" onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-1" />
          Registrar
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : visitors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sin visitantes registrados todavía
          </p>
        ) : (
          <div className="space-y-2">
            {visitors.map(v => (
              <div
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {v.first_name} {v.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {v.first_visit_date}
                    {v.invited_by_name ? ` · Invitado por ${v.invited_by_name}` : ''}
                    {v.phone ? ` · ${v.phone}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {v.status === 'converted' ? (
                    <Badge className={STATUS_META.converted.className}>
                      {STATUS_META.converted.label}
                    </Badge>
                  ) : (
                    <>
                      <Select
                        value={v.status}
                        onValueChange={value => handleStatusChange(v, value as Visitor['status'])}
                      >
                        <SelectTrigger className="w-[160px] h-8">
                          <SelectValue>
                            <Badge className={STATUS_META[v.status].className}>
                              {STATUS_META[v.status].label}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Convertir a miembro"
                        title={canConvert ? 'Convertir a miembro' : 'Requiere un supervisor'}
                        disabled={!canConvert}
                        onClick={() => setConvertingVisitor(v)}
                      >
                        <UserCheck className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar visitante</DialogTitle>
            <DialogDescription>
              Se crea con estado "Nuevo" — actualizá su seguimiento después.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="v_first_name">Nombre *</Label>
                <Input
                  id="v_first_name"
                  value={form.first_name}
                  onChange={e => setForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="v_last_name">Apellido</Label>
                <Input
                  id="v_last_name"
                  value={form.last_name}
                  onChange={e => setForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="v_phone">Teléfono</Label>
              <Input
                id="v_phone"
                value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v_notes">Notas</Label>
              <Input
                id="v_notes"
                placeholder="Opcional"
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {convertingVisitor && (
        <ConvertVisitorDialog
          visitor={convertingVisitor}
          open={!!convertingVisitor}
          onOpenChange={open => {
            if (!open) setConvertingVisitor(null);
          }}
          onConverted={loadVisitors}
        />
      )}
    </Card>
  );
}
