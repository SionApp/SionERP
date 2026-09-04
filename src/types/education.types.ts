// `cadence` was DROPPED in the design-handoff migration (PR-A) — `track` +
// `level` + `hours` replaced it (spec: "Cadence is descriptive", the only
// deletion in the plan). `EducationCadence`/`EducationCadences` are gone
// from this file; the 8 occurrences that lived here are closed (tasks-v2
// D.2). The 18 remaining occurrences in `CurriculumList.tsx`/
// `CurriculumEditor.tsx` are a deliberate, tracked exception — see this
// PR's Deviations note — closed wholesale when PR-H deletes both files.
export type EducationCurriculumStatus = 'draft' | 'review' | 'published' | 'archived';
export type EducationTrack = 'discipulado' | 'servicio' | 'liderazgo' | 'familia' | 'formacion';
export type EducationCourseLevel = 'I' | 'II' | 'III';

/**
 * Wire shape mirrors `models.EducationCurriculum` (education.go). Catalog
 * metadata fields were added in the design-handoff expansion (PR-A/PR-B);
 * `teacherName`/`studentCount` are populated only by `getCurriculumById`
 * (GetCurriculumByID) — `null`/`0` on every other endpoint that returns this
 * shape (list endpoints never join them, see education.service.ts).
 */
export interface EducationCurriculum {
  id: string;
  name: string;
  description: string | null;
  status: EducationCurriculumStatus;
  track: EducationTrack | null;
  level: EducationCourseLevel | null;
  hours: number | null;
  teacherUserId: string | null;
  teacherName: string | null;
  coverPath: string | null;
  objectives: string[];
  requirements: string | null;
  lessonCount: number;
  studentCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCurriculumRequest {
  name: string;
  description?: string;
}

export interface UpdateCurriculumRequest {
  name?: string;
  description?: string;
}

export const EducationCurriculumStatuses: Record<EducationCurriculumStatus, true> = {
  draft: true,
  review: true,
  published: true,
  archived: true,
};

export const EducationTracks: Record<EducationTrack, true> = {
  discipulado: true,
  servicio: true,
  liderazgo: true,
  familia: true,
  formacion: true,
};

export interface EducationLesson {
  id: string;
  curriculumId: string;
  orderIndex: number;
  title: string;
  content: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonRequest {
  title: string;
  content?: string;
  attachmentPath?: string;
  attachmentName?: string;
  orderIndex?: number;
}

export interface UpdateLessonRequest {
  title?: string;
  content?: string;
  attachmentPath?: string;
  attachmentName?: string;
}

// ── Asignaciones + progreso (PR3a backend, PR3c UI) ──

// `in_review`/`inactive` are DERIVED status states added by the
// design-handoff spec (education-assignments DELTA) — PR-F/K wire the
// backend derivation that actually produces them (review-pending quiz
// attempts, 14-day inactivity). Included here now so the status union is
// forward-compatible; PR-D never receives these two from any endpoint it
// calls yet.
export type EducationAssignmentStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'in_review'
  | 'inactive';
export type EducationSourceModule = 'discipleship';

/**
 * Wire shape mirrors `models.EducationAssignment` (apps/backend-go/models/education.go).
 * Status is derived server-side (design D3) — never computed on the client.
 * assignedToName/assignedToEmail only come populated from the admin listing
 * (GetCurriculumProgress); the student-facing endpoints never need them.
 * track/teacherName are a PR-D addition (assignmentSelectSQL) — populated on
 * GetMyAssignments/GetMyAssignmentByID/GetHome, null on GetCurriculumProgress.
 */
export interface EducationAssignment {
  id: string;
  curriculumId: string;
  curriculumName: string;
  assignedTo: string;
  assignedBy: string | null;
  sourceModule: EducationSourceModule | null;
  sourceRefId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  completedLessons: number;
  totalLessons: number;
  status: EducationAssignmentStatus;
  assignedToName: string | null;
  assignedToEmail: string | null;
  track: EducationTrack | null;
  teacherName: string | null;
}

export interface CreateAssignmentsRequest {
  curriculumId: string;
  userIds: string[];
  dueDate?: string;
  sourceModule?: EducationSourceModule;
  sourceRefId?: string;
}

export interface CreateAssignmentsResult {
  created: number;
  skipped: number;
  message: string;
}

// ── Catálogo, temario y panel del alumno (PR-D, education-catalog +
// education-lesson-consumption) ──

/**
 * Wire shape mirrors `models.EducationCatalogCourse` (education_content.go).
 * `hasQuiz` is stubbed `false` server-side until PR-F ships the quizzes
 * table — never render a quiz-related affordance from this field yet.
 */
export interface EducationCatalogCourse {
  id: string;
  name: string;
  description: string | null;
  track: EducationTrack | null;
  level: EducationCourseLevel | null;
  hours: number | null;
  teacherName: string | null;
  coverPath: string | null;
  lessonCount: number;
  studentCount: number;
  hasQuiz: boolean;
  createdAt: string;
}

/**
 * PR-G update: `locked` is now a REAL server-derived state (design A8, wired
 * in PR-F's `GetSyllabus` via the quiz-pass `LAG(...)` window functions) —
 * no client-side derivation needed anymore. `student/lib/lesson-state.ts`
 * (PR-D's interim client fallback) is deleted in this PR; every consumer
 * reads `lesson.state` directly.
 */
export type EducationSyllabusLessonState = 'completed' | 'in_progress' | 'locked' | 'pending';

export interface EducationSyllabusLesson {
  id: string;
  moduleId: string | null;
  orderIndex: number;
  title: string;
  durationMinutes: number | null;
  state: EducationSyllabusLessonState;
  /** PR-F addition — lets the UI show "Ir al mini quiz" without a 2nd request. */
  hasQuiz: boolean;
}

export interface EducationSyllabusModule {
  id: string | null;
  title: string;
  lessons: EducationSyllabusLesson[];
}

/** Wire shape mirrors `models.EducationHomeAggregate` (GET /education/me/home). */
export interface EducationHomeAggregate {
  inProgressCount: number;
  completedCount: number;
  continueAssignment: EducationAssignment | null;
  assignments: EducationAssignment[];
}

// ── Pasos + bloques de lección (PR-E, education-content-model) ──

/**
 * Raw `{id,type,data}` block envelope — mirrors `models.EducationBlock`
 * (education_content.go) exactly. `data`'s per-type shape is NOT narrowed
 * here (the wire shape is closed server-side by `ValidateLessonBlocks`, not
 * by this type) — `blocks/block.types.ts` narrows it into a discriminated
 * union via `narrowEducationBlock`, matching
 * `handlers/education_blocks_validate.go`'s per-type `data` shapes
 * field-by-field (not guessed).
 */
export interface EducationBlock {
  id: string;
  type: string;
  data: unknown;
}

/** Wire shape mirrors `models.EducationStep` (education_content.go). */
export interface EducationStep {
  id: string;
  lessonId: string;
  orderIndex: number;
  label: string;
  blocks: EducationBlock[];
  createdAt: string;
  updatedAt: string;
}

/**
 * The caller's own step-pointer for one lesson (design A2/A3:
 * `current_step_id uuid` + `visited_step_ids uuid[]` — NOT an ordinal, so
 * step identity survives reorder). `null` on `EducationLessonDetail.progress`
 * for authors (level >= 3) — they have no personal progress on a lesson
 * they're not enrolled in as a student.
 */
export interface EducationLessonProgress {
  assignmentId: string;
  currentStepId: string | null;
  visitedStepIds: string[];
}

/** Wire shape mirrors `models.EducationLessonDetail` (GET /education/lessons/:id). */
export interface EducationLessonDetail {
  id: string;
  curriculumId: string;
  moduleId: string | null;
  orderIndex: number;
  title: string;
  durationMinutes: number | null;
  steps: EducationStep[];
  progress: EducationLessonProgress | null;
}

// ── Quiz — runtime del alumno (PR-G, education-quiz-runtime) ──
//
// Mirrors `models.QuizRunnerView`/`QuizRunnerQuestion`/`QuizRunnerOption`
// (models/education_quiz_runner.go) field-for-field. That Go file is
// structurally incapable of declaring an answer-key field (PR-F's own
// enforcement test greps its raw source for the forbidden identifiers) —
// these TS types mirror that same shape 1:1, so this file is equally
// incapable of typing a correctness flag onto a runner option: there is no
// `isCorrect`/`correctOptionId` field anywhere below by construction, not by
// omission. Never add one — see design/education-quiz-runtime's answer-leak
// boundary.

export type QuizQuestionType = 'multiple' | 'true_false' | 'short';

export interface QuizRunnerOption {
  id: string;
  text: string;
}

export interface QuizRunnerQuestion {
  id: string;
  position: number;
  type: QuizQuestionType;
  prompt: string;
  points: number;
  /** The CALLER's own previously-saved draft — never another student's. */
  selectedOptionId: string | null;
  textAnswer: string | null;
  /** Empty for `type: 'short'`. */
  options: QuizRunnerOption[];
}

/** The ONLY shape returned before submit (GetQuizRunner / StartAttempt). */
export interface QuizRunnerView {
  id: string;
  lessonId: string;
  /** Empty when the caller has no open attempt yet (GetQuizRunner before StartAttempt). */
  attemptId: string;
  attemptNumber: number;
  attemptsLeft: number;
  timeLimitMinutes: number | null;
  /**
   * Real server timestamp (`started_at + time_limit_minutes`) — the timer
   * pill MUST count down from this, never from a client-computed
   * `Date.now() + timeLimitMinutes*60` (that would ignore how long the
   * attempt has already been open, e.g. after a refresh).
   */
  expiresAt: string | null;
  showResult: boolean;
  maxScore: number;
  questions: QuizRunnerQuestion[];
}

export interface SaveQuizAnswerRequest {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
}

export type QuizResultVerdict = 'correct' | 'incorrect' | 'in_review';

/**
 * Mirrors `models.QuizResultQuestion` — a THIRD distinct DTO from both
 * `QuizRunnerQuestion` (pre-submit, no verdict) and the author-only shape
 * (never sent to the frontend at all). `correctText` is nil unless
 * `verdict === 'incorrect'`.
 */
export interface QuizResultQuestion {
  id: string;
  prompt: string;
  verdict: QuizResultVerdict;
  yourOptionText: string | null;
  yourTextAnswer: string | null;
  correctText: string | null;
  feedback: string | null;
}

/**
 * Mirrors `models.QuizResultView`, released only after the caller's own
 * attempt is submitted. `passed` is `null` while `reviewPending` is `true`
 * (a `short` question is awaiting manual grading — no premature pass/fail
 * claim, spec: education-manual-review). `questions` is `null` entirely when
 * the quiz's `show_result=false` — the Go handler nils the slice before
 * serializing, so this is a real absence on the wire, not a client filter.
 */
export interface QuizResultView {
  attemptId: string;
  attemptNumber: number;
  autoScore: number;
  maxScore: number;
  passScore: number;
  passed: boolean | null;
  reviewPending: boolean;
  canRetry: boolean;
  nextLessonId: string | null;
  questions: QuizResultQuestion[] | null;
}

/**
 * Mirrors `handlers.QuizPendingReviewItem` (GET
 * /education/me/quiz-attempts/pending-review, PR-G addition) — the caller's
 * own submitted-but-ungraded `short`-answer attempts, powering
 * `PendingQuizAlert`. `dueDate` is present only when the underlying
 * assignment has one.
 */
export interface QuizPendingReviewItem {
  attemptId: string;
  lessonId: string;
  lessonTitle: string;
  curriculumId: string;
  curriculumName: string;
  dueDate: string | null;
  submittedAt: string;
}
