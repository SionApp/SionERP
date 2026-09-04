import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  EducationDialog,
  EducationDialogContent,
  EducationDialogHeader,
  EducationDialogTitle,
  EducationSelect,
  EducationSelectContent,
  EducationSelectItem,
  EducationSelectTrigger,
  EducationSelectValue,
} from '../ui';
import { EducationService } from '@/services/education.service';
import { UserSearchPicker } from '../../music/UserSearchPicker';
import type {
  CreateCurriculumRequest,
  EducationCourseLevel,
  EducationCurriculum,
  EducationTrack,
} from '@/types/education.types';
import { CoverUpload } from './CoverUpload';

const TRACK_OPTIONS: { value: EducationTrack; label: string }[] = [
  { value: 'discipulado', label: 'Discipulado' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'liderazgo', label: 'Liderazgo' },
  { value: 'familia', label: 'Familia' },
  { value: 'formacion', label: 'Formación' },
];

const LEVEL_OPTIONS: { value: EducationCourseLevel; label: string }[] = [
  { value: 'I', label: 'Nivel I' },
  { value: 'II', label: 'Nivel II' },
  { value: 'III', label: 'Nivel III' },
];

interface FormState {
  name: string;
  description: string;
  track: EducationTrack | '';
  level: EducationCourseLevel | '';
  hours: string;
  teacherUserId: string;
  teacherLabel: string;
  coverPath: string | null;
  objectives: string;
  requirements: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  track: '',
  level: '',
  hours: '',
  teacherUserId: '',
  teacherLabel: '',
  coverPath: null,
  objectives: '',
  requirements: '',
};

function curriculumToForm(c: EducationCurriculum): FormState {
  return {
    name: c.name,
    description: c.description ?? '',
    track: c.track ?? '',
    level: c.level ?? '',
    hours: c.hours != null ? String(c.hours) : '',
    teacherUserId: c.teacherUserId ?? '',
    teacherLabel: c.teacherName ?? '',
    coverPath: c.coverPath,
    objectives: c.objectives.join('\n'),
    requirements: c.requirements ?? '',
  };
}

/**
 * Create/edit dialog for a course's catalog metadata (README §7's "Nuevo
 * curso" affordance — the static prototype just navigates straight into the
 * content editor with no dialog at all, since it has no real metadata model
 * behind it; this app does, so the flow is deliberately extended here, same
 * "extend, don't blindly mirror a static mockup" precedent PR-G's session
 * documented for QuizResult). `track/level/hours/teacher_user_id/objectives/
 * requirements` per tasks-v2 H.2 — NO `cadence` field, that column was
 * dropped from the backend entirely in PR-A. Uses the `education/ui/*`
 * portal wrappers (PR-C) — first PR to actually consume them for new UI.
 */
export function CourseFormDialog({
  open,
  onOpenChange,
  curriculum,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** null/undefined = create mode; a curriculum = edit mode. */
  curriculum?: EducationCurriculum | null;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!curriculum;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    setForm(curriculum ? curriculumToForm(curriculum) : EMPTY_FORM);
  }, [open, curriculum]);

  function toRequestPayload(): CreateCurriculumRequest {
    const hoursNum = form.hours.trim() ? Number(form.hours) : undefined;
    return {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      track: form.track || undefined,
      level: form.level || undefined,
      hours: hoursNum != null && !Number.isNaN(hoursNum) ? hoursNum : undefined,
      teacherUserId: form.teacherUserId || undefined,
      coverPath: form.coverPath ?? undefined,
      objectives: form.objectives
        .split('\n')
        .map(o => o.trim())
        .filter(Boolean),
      requirements: form.requirements.trim() || undefined,
    };
  }

  const createMutation = useMutation({
    mutationFn: () => EducationService.createCurriculum(toRequestPayload()),
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      onOpenChange(false);
      toast.success('Curso creado');
      navigate(`/dashboard/education/admin/cursos/${id}`);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo crear el curso'),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const payload = toRequestPayload();
      return EducationService.updateCurriculum(curriculum!.id, {
        ...payload,
        // Explicit '' clears the field server-side — omitting the key (a
        // create-mode `undefined`) leaves it unchanged, which is wrong on
        // edit when the author actually removed a previously-set teacher.
        track: form.track === '' ? '' : form.track,
        teacherUserId: form.teacherUserId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      qc.invalidateQueries({ queryKey: ['education-curriculum', curriculum?.id] });
      onOpenChange(false);
      toast.success('Curso actualizado');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el curso'),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  }

  return (
    <EducationDialog open={open} onOpenChange={onOpenChange}>
      <EducationDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <EducationDialogHeader>
          <EducationDialogTitle>{isEdit ? 'Editar curso' : 'Nuevo curso'}</EducationDialogTitle>
        </EducationDialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cf-name">Nombre</Label>
            <Input
              id="cf-name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder='Ej: "Fundamentos de la fe"'
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-description">Descripción</Label>
            <Textarea
              id="cf-description"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="¿De qué trata este curso? (opcional)"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Portada</Label>
            <CoverUpload
              value={form.coverPath}
              onChange={path => setForm(p => ({ ...p, coverPath: path }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Track</Label>
              <EducationSelect
                value={form.track || undefined}
                onValueChange={v => setForm(p => ({ ...p, track: v as EducationTrack }))}
              >
                <EducationSelectTrigger>
                  <EducationSelectValue placeholder="Sin track" />
                </EducationSelectTrigger>
                <EducationSelectContent>
                  {TRACK_OPTIONS.map(opt => (
                    <EducationSelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </EducationSelectItem>
                  ))}
                </EducationSelectContent>
              </EducationSelect>
            </div>
            <div className="space-y-1.5">
              <Label>Nivel</Label>
              <EducationSelect
                value={form.level || undefined}
                onValueChange={v => setForm(p => ({ ...p, level: v as EducationCourseLevel }))}
              >
                <EducationSelectTrigger>
                  <EducationSelectValue placeholder="Sin nivel" />
                </EducationSelectTrigger>
                <EducationSelectContent>
                  {LEVEL_OPTIONS.map(opt => (
                    <EducationSelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </EducationSelectItem>
                  ))}
                </EducationSelectContent>
              </EducationSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf-hours">Horas</Label>
              <Input
                id="cf-hours"
                type="number"
                min={0}
                step="0.5"
                value={form.hours}
                onChange={e => setForm(p => ({ ...p, hours: e.target.value }))}
                placeholder="8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Maestro</Label>
            {form.teacherUserId ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                <p className="truncate text-sm font-medium">
                  {form.teacherLabel || 'Maestro asignado'}
                </p>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setForm(p => ({ ...p, teacherUserId: '', teacherLabel: '' }))}
                  aria-label="Quitar maestro"
                >
                  ×
                </Button>
              </div>
            ) : (
              <UserSearchPicker
                excludeUserIds={new Set()}
                placeholder="Buscar maestro por nombre, email o documento…"
                onPick={u => {
                  if (!u) return;
                  setForm(p => ({
                    ...p,
                    teacherUserId: u.id,
                    teacherLabel: `${u.first_name} ${u.last_name}`.trim(),
                  }));
                }}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-objectives">Objetivos</Label>
            <Textarea
              id="cf-objectives"
              value={form.objectives}
              onChange={e => setForm(p => ({ ...p, objectives: e.target.value }))}
              placeholder={
                'Uno por línea, ej:\nEntender qué es el discipulado\nConocer la historia de la iglesia'
              }
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Un objetivo por línea.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-requirements">Requisitos</Label>
            <Textarea
              id="cf-requirements"
              value={form.requirements}
              onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))}
              placeholder="¿Hace falta algo antes de empezar? (opcional)"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear curso'}
            </Button>
          </div>
        </form>
      </EducationDialogContent>
    </EducationDialog>
  );
}
