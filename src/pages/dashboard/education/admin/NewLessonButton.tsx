import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { useAdminCurricula, useCourseModules } from '../hooks/use-education-queries';
import { LessonFormDialog } from './ModuleLessonTree';

/**
 * Global "Nueva lección" entry point (design's page-header action, gap A9c —
 * the design offers it without picking a course first; the app's course
 * model requires a curriculum, so this adds one small picker step, then
 * reuses the exact same LessonFormDialog the per-course "+ Lección" button
 * uses, and navigates straight into the new lesson's editor on create.
 */
export function NewLessonButton() {
  const navigate = useNavigate();
  const { data: curricula = [] } = useAdminCurricula();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [curriculumId, setCurriculumId] = useState<string | null>(null);
  const { data: modules = [] } = useCourseModules(curriculumId ?? undefined);

  const editableCurricula = curricula.filter(c => c.status !== 'archived');

  return (
    <>
      <Button
        className="gap-1.5"
        onClick={() => {
          setCurriculumId(null);
          setPickerOpen(true);
        }}
      >
        <Plus className="h-4 w-4" />
        Nueva lección
      </Button>

      <EducationDialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <EducationDialogContent>
          <EducationDialogHeader>
            <EducationDialogTitle>¿En qué curso va la lección?</EducationDialogTitle>
          </EducationDialogHeader>
          <div className="space-y-1.5">
            <Label>Curso</Label>
            <EducationSelect value={curriculumId ?? undefined} onValueChange={setCurriculumId}>
              <EducationSelectTrigger>
                <EducationSelectValue placeholder="Elegí un curso" />
              </EducationSelectTrigger>
              <EducationSelectContent>
                {editableCurricula.map(c => (
                  <EducationSelectItem key={c.id} value={c.id}>
                    {c.name}
                  </EducationSelectItem>
                ))}
              </EducationSelectContent>
            </EducationSelect>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!curriculumId} onClick={() => setPickerOpen(false)}>
              Continuar
            </Button>
          </div>
        </EducationDialogContent>
      </EducationDialog>

      {curriculumId && !pickerOpen && (
        <LessonFormDialog
          open={!!curriculumId && !pickerOpen}
          onOpenChange={o => {
            if (!o) setCurriculumId(null);
          }}
          curriculumId={curriculumId}
          modules={modules}
          defaultModuleId={null}
          lesson={null}
          onCreated={lessonId => {
            const cid = curriculumId;
            setCurriculumId(null);
            setPickerOpen(false);
            navigate(`/dashboard/education/admin/cursos/${cid}/leccion/${lessonId}`);
          }}
        />
      )}
    </>
  );
}
