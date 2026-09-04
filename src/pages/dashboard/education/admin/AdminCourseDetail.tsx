import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, BookOpen, Clock, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EducationConfirmDialog,
  EducationDropdownMenu,
  EducationDropdownMenuContent,
  EducationDropdownMenuItem,
  EducationDropdownMenuSeparator,
  EducationDropdownMenuTrigger,
} from '../ui';
import { MobileScreen } from '@/components/mobile/MobileScreen';
import { useMobileMode } from '@/hooks/useMobileMode';
import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import { useEducationAccess } from '../use-education-access';
import { getCourseGradientVar } from '../student/lib/course-gradient';
import { formatHours } from '../student/lib/format';
import { CourseFormDialog } from './CourseFormDialog';
import { ModuleLessonTree } from './ModuleLessonTree';
import { AssignmentList } from './AssignmentList';
import type { EducationCurriculumStatus } from '@/types/education.types';

const STATUS_LABEL: Record<EducationCurriculumStatus, string> = {
  draft: 'Borrador',
  review: 'Revisión',
  published: 'Publicado',
  archived: 'Archivado',
};

const STATUS_PILL: Record<EducationCurriculumStatus, string> = {
  draft: 'bg-white/20 text-white',
  review: 'bg-edu-violet-container text-on-edu-violet-container',
  published: 'bg-edu-container text-on-edu-container',
  archived: 'bg-white/20 text-white',
};

const TRACK_LABEL: Record<string, string> = {
  discipulado: 'Discipulado',
  servicio: 'Servicio',
  liderazgo: 'Liderazgo',
  familia: 'Familia',
  formacion: 'Formación',
};

/**
 * Course-level admin screen (PR-H, tasks-v2 H.3) — course metadata hero +
 * module/lesson tree + moved `AssignmentList` as a tab. There is no literal
 * design-mockup screen for this (README's 10 screens stop at "Lista de
 * cursos" → "Editor de contenido" directly — no course-detail screen in the
 * static prototype). This is a real, necessary composition the app needs
 * (courses → course detail → per-lesson content editor) that the design
 * doc's own file manifest anticipates (`AdminCourseDetail.tsx` +
 * `ModuleLessonTree.tsx`, tasks-v2 H.3) — built to match the established
 * MD3/education visual language (hero gradient, card radii, edu-* tokens)
 * rather than inventing a new style.
 *
 * Route param renamed to `:curriculumId` (from the legacy `:id`) for
 * consistency with the sibling student route `curso/:curriculumId` — this
 * is a brand-new file with no legacy param-name constraint to preserve.
 */
export default function AdminCourseDetail() {
  const { curriculumId } = useParams<{ curriculumId: string }>();
  const navigate = useNavigate();
  const isMobileApp = useMobileMode();
  const qc = useQueryClient();
  const { level, isModuleAdmin } = useEducationAccess();
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: curriculum,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['education-curriculum', curriculumId],
    queryFn: () => EducationService.getCurriculumById(curriculumId as string),
    enabled: !!curriculumId,
  });

  const statusMutation = useMutation({
    mutationFn: (status: EducationCurriculumStatus) =>
      EducationService.updateCurriculumStatus(curriculumId as string, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-curriculum', curriculumId] });
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      toast.success('Estado actualizado');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el estado'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => EducationService.deleteCurriculum(curriculumId as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['education-curricula'] });
      toast.success('Curso eliminado');
      navigate('/dashboard/education/admin/cursos');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar'),
  });

  const canEdit = level >= 3;
  const canArchive = isModuleAdmin;

  const body = isLoading ? (
    <div className="space-y-4">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-[180px] w-full rounded-md3-xl" />
      <Skeleton className="h-64 w-full rounded-md3-lg" />
    </div>
  ) : isError || !curriculum ? (
    <div className="flex flex-col items-center gap-3 rounded-md3-lg border border-destructive/30 bg-destructive/5 py-12 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <p className="text-sm font-medium text-destructive">
        No se encontró el curso, o no tenés acceso.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate('/dashboard/education/admin/cursos')}
      >
        Volver
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-5">
      <div
        className="flex flex-col gap-5 rounded-md3-xl p-6 text-white sm:p-[30px_34px] md:flex-row md:items-start md:justify-between"
        style={{ background: getCourseGradientVar(curriculum.id, curriculum.track) }}
      >
        <div className="max-w-[640px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[11px] font-semibold',
                STATUS_PILL[curriculum.status]
              )}
            >
              {STATUS_LABEL[curriculum.status]}
            </span>
            {curriculum.track && (
              <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-[11px] font-medium tracking-wide">
                {(TRACK_LABEL[curriculum.track] ?? curriculum.track).toUpperCase()}
              </span>
            )}
            {curriculum.level && (
              <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-[11px] font-medium">
                Nivel {curriculum.level}
              </span>
            )}
          </div>
          <h1 className="mt-3.5 text-[26px] font-normal sm:text-[30px]">{curriculum.name}</h1>
          {curriculum.description && (
            <p className="mt-2.5 text-[15px] leading-relaxed text-white/85">
              {curriculum.description}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/90">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-[18px] w-[18px]" />
              {curriculum.lessonCount} {curriculum.lessonCount === 1 ? 'lección' : 'lecciones'}
            </span>
            {curriculum.hours !== null && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-[18px] w-[18px]" />
                {formatHours(curriculum.hours)} aprox.
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-[18px] w-[18px]" />
              {curriculum.studentCount} {curriculum.studentCount === 1 ? 'alumno' : 'alumnos'}
            </span>
            {curriculum.teacherName && <span>{curriculum.teacherName}</span>}
          </div>
        </div>

        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              className="bg-white text-edu-primary-dark hover:bg-white/90"
              onClick={() => setEditOpen(true)}
            >
              Editar curso
            </Button>
            <EducationDropdownMenu>
              <EducationDropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20 hover:text-white"
                  aria-label="Más acciones"
                >
                  ⋮
                </Button>
              </EducationDropdownMenuTrigger>
              <EducationDropdownMenuContent align="end">
                {curriculum.status === 'draft' && (
                  <EducationDropdownMenuItem onClick={() => statusMutation.mutate('published')}>
                    Publicar
                  </EducationDropdownMenuItem>
                )}
                {curriculum.status === 'published' && canArchive && (
                  <EducationDropdownMenuItem onClick={() => statusMutation.mutate('archived')}>
                    Archivar
                  </EducationDropdownMenuItem>
                )}
                {curriculum.status === 'archived' && canArchive && (
                  <EducationDropdownMenuItem onClick={() => statusMutation.mutate('draft')}>
                    Volver a borrador
                  </EducationDropdownMenuItem>
                )}
                {canArchive && (
                  <>
                    <EducationDropdownMenuSeparator />
                    <EducationConfirmDialog
                      trigger={
                        <EducationDropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={e => e.preventDefault()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar curso
                        </EducationDropdownMenuItem>
                      }
                      title="¿Eliminar curso?"
                      description={`Se elimina "${curriculum.name}" junto con todos sus módulos y lecciones. No se puede deshacer.`}
                      confirmLabel="Eliminar curso"
                      onConfirm={() => deleteMutation.mutate()}
                    />
                  </>
                )}
              </EducationDropdownMenuContent>
            </EducationDropdownMenu>
          </div>
        )}
      </div>

      <Tabs defaultValue="contenido" className="w-full">
        <TabsList>
          <TabsTrigger value="contenido">Contenido</TabsTrigger>
          {canEdit && <TabsTrigger value="alumnos">Alumnos</TabsTrigger>}
        </TabsList>
        <TabsContent value="contenido" className="pt-4">
          <ModuleLessonTree curriculumId={curriculum.id} canEdit={canEdit} />
        </TabsContent>
        {canEdit && (
          <TabsContent value="alumnos" className="pt-4">
            <AssignmentList curriculumId={curriculum.id} canManage={canEdit} />
          </TabsContent>
        )}
      </Tabs>

      <CourseFormDialog open={editOpen} onOpenChange={setEditOpen} curriculum={curriculum} />
    </div>
  );

  if (isMobileApp) {
    return (
      <MobileScreen title={curriculum?.name ?? 'Curso'} back="/dashboard/education/admin/cursos">
        <div className="px-4 py-4">{body}</div>
      </MobileScreen>
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate('/dashboard/education/admin/cursos')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Cursos
      </button>
      {body}
    </div>
  );
}
