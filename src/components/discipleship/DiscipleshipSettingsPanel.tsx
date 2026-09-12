import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSystem } from '@/contexts/SystemContext';
import {
  useDiscipleshipSettings,
  useUpdateDiscipleshipSettings,
} from '@/hooks/use-discipleship-settings';
import { EducationService } from '@/services/education.service';

const NONE_VALUE = 'none';

/**
 * Church-level conversion-path curriculum pointer (spec: "Church-Level Path
 * Curriculum Pointer"). Gates on `isModuleInstalled('education')` — an
 * install check, not `useEducationAccess()` (spec: Module-Gated Read
 * Surface) — and lists only `status === 'published'` curricula (design:
 * "Curriculum picker" — pointing the path at a draft would enroll converts
 * into a course that isn't ready). The caller (`DiscipleshipPage.tsx`) is
 * responsible for the Pastoral-level render gate; this panel only handles
 * the Education-uninstalled empty state.
 */
export function DiscipleshipSettingsPanel() {
  const { isModuleInstalled } = useSystem();
  const educationInstalled = isModuleInstalled('education');
  const { data: settings, isLoading: loadingSettings } = useDiscipleshipSettings();
  const updateSettings = useUpdateDiscipleshipSettings();
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  const { data: curricula = [], isLoading: loadingCurricula } = useQuery({
    queryKey: ['education-curricula-for-discipleship'],
    queryFn: () => EducationService.getCurricula(),
    enabled: educationInstalled,
    staleTime: 60_000,
  });

  const published = curricula.filter(c => c.status === 'published');
  const currentValue = pendingValue ?? settings?.conversion_path_curriculum_id ?? NONE_VALUE;

  function handleChange(value: string) {
    setPendingValue(value);
    updateSettings.mutate(
      { conversion_path_curriculum_id: value === NONE_VALUE ? null : value },
      {
        onSuccess: () => {
          toast.success('Curso del camino actualizado');
          setPendingValue(null);
        },
        onError: (error: unknown) => {
          setPendingValue(null);
          toast.error(error instanceof Error ? error.message : 'No se pudo guardar el curso');
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Curso del camino de discipulado
        </CardTitle>
        <CardDescription>
          Los nuevos convertidos se inscriben automáticamente en este curso de Educación. Cambiarlo
          no afecta a quienes ya están inscriptos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!educationInstalled ? (
          <p className="text-sm text-muted-foreground">
            Instalá el módulo Educación para configurar el curso del camino.
          </p>
        ) : loadingSettings || loadingCurricula ? (
          <Skeleton className="h-10 w-full max-w-sm" />
        ) : (
          <div className="max-w-sm space-y-2">
            <Label>Curso</Label>
            <Select
              value={currentValue}
              onValueChange={handleChange}
              disabled={updateSettings.isPending}
            >
              <SelectTrigger>
                <SelectValue />
                {updateSettings.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sin curso configurado</SelectItem>
                {published.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
