import { useCallback, useEffect, useState } from 'react';
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
import { DiscipleshipService } from '@/services/discipleship.service';
import type { Visitor } from '@/types/discipleship.types';
import { Loader2, UserPlus, Users2 } from 'lucide-react';
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

const STATUS_OPTIONS: { value: Visitor['status']; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'following_up', label: 'En seguimiento' },
  { value: 'converted', label: 'Convertido' },
  { value: 'inactive', label: 'Inactivo' },
];

export function GroupVisitors({ groupId }: GroupVisitorsProps) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', notes: '' });

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
    </Card>
  );
}
