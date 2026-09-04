import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import { CloudUpload, FileText, Loader2, Plus, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { EducationService } from '@/services/education.service';
import {
  EducationSelect,
  EducationSelectContent,
  EducationSelectItem,
  EducationSelectTrigger,
  EducationSelectValue,
} from '../ui';
import { InlineEditor } from './InlineEditor';
import { emptyPMDoc } from '../blocks/block.types';
import type {
  AnyEducationBlock,
  CalloutVariant,
  EducationCalloutBlock,
  EducationHeadingBlock,
  EducationImageBlock,
  EducationListBlock,
  EducationPdfBlock,
  EducationQuestionBlock,
  EducationQuoteBlock,
  EducationVideoBlock,
} from '../blocks/block.types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024; // No literal spec value for PDFs — inferred, 2x the image cap.

/**
 * Design (README §8, "4. Lista de bloques" body): per-type editing form.
 * `paragraph`/`quote`/`callout` reuse the SAME `InlineEditor` (TipTap)
 * instance — `onFocusEditor`/`onBlurEditor` bubble the currently-focused
 * `Editor` up to `LessonEditor` so the single shared `EditorToolbar` can act
 * on it (there is no per-block toolbar, per EditorToolbar.tsx's own header
 * comment).
 */
export function BlockCardBody({
  block,
  canEdit,
  curriculumId,
  onChange,
  onFocusEditor,
  onBlurEditor,
}: {
  block: AnyEducationBlock;
  canEdit: boolean;
  curriculumId: string;
  onChange: (data: unknown) => void;
  onFocusEditor?: (editor: Editor) => void;
  onBlurEditor?: () => void;
}) {
  switch (block.type) {
    case 'heading':
      return <HeadingBody block={block} canEdit={canEdit} onChange={onChange} />;
    case 'paragraph':
      return (
        <InlineEditor
          doc={block.data.doc}
          onChange={doc => canEdit && onChange({ doc })}
          placeholder="Escribí el párrafo…"
          ariaLabel="Contenido del párrafo"
          onFocusEditor={onFocusEditor}
          onBlurEditor={onBlurEditor}
        />
      );
    case 'list':
      return <ListBody block={block} canEdit={canEdit} onChange={onChange} />;
    case 'image':
      return (
        <MediaBody
          block={block}
          canEdit={canEdit}
          curriculumId={curriculumId}
          onChange={onChange}
        />
      );
    case 'video':
      return <VideoBody block={block} canEdit={canEdit} onChange={onChange} />;
    case 'quote':
      return (
        <QuoteBody
          block={block}
          canEdit={canEdit}
          onChange={onChange}
          onFocusEditor={onFocusEditor}
          onBlurEditor={onBlurEditor}
        />
      );
    case 'callout':
      return (
        <CalloutBody
          block={block}
          canEdit={canEdit}
          onChange={onChange}
          onFocusEditor={onFocusEditor}
          onBlurEditor={onBlurEditor}
        />
      );
    case 'pdf':
      return (
        <PdfBody block={block} canEdit={canEdit} curriculumId={curriculumId} onChange={onChange} />
      );
    case 'question':
      return <QuestionBody block={block} canEdit={canEdit} onChange={onChange} />;
    case 'divider':
      return <p className="text-xs text-muted-foreground">Línea separadora — sin contenido.</p>;
    default:
      return null;
  }
}

function HeadingBody({
  block,
  canEdit,
  onChange,
}: {
  block: EducationHeadingBlock;
  canEdit: boolean;
  onChange: (data: unknown) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <input
        type="text"
        value={block.data.text}
        disabled={!canEdit}
        onChange={e => onChange({ ...block.data, text: e.target.value })}
        placeholder="Título del bloque…"
        className="flex-1 border-none bg-transparent text-[1.1875em] font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
      />
      <div className="flex shrink-0 items-center gap-1 rounded-full border border-border p-0.5 text-[11px] font-medium">
        {[2, 3].map(level => (
          <button
            key={level}
            type="button"
            disabled={!canEdit}
            onClick={() => onChange({ ...block.data, level })}
            className={cn(
              'rounded-full px-2 py-1',
              block.data.level === level
                ? 'bg-edu-container text-on-edu-container'
                : 'text-muted-foreground'
            )}
          >
            H{level}
          </button>
        ))}
      </div>
    </div>
  );
}

function ListBody({
  block,
  canEdit,
  onChange,
}: {
  block: EducationListBlock;
  canEdit: boolean;
  onChange: (data: unknown) => void;
}) {
  const items = block.data.items;

  function setItem(i: number, value: string) {
    const next = [...items];
    next[i] = value;
    onChange({ ...block.data, items: next });
  }
  function removeItem(i: number) {
    onChange({ ...block.data, items: items.filter((_, idx) => idx !== i) });
  }
  function addItem() {
    onChange({ ...block.data, items: [...items, ''] });
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1 text-[11px] font-medium">
        {(['bullet', 'number'] as const).map(style => (
          <button
            key={style}
            type="button"
            disabled={!canEdit}
            onClick={() => onChange({ ...block.data, style })}
            className={cn(
              'rounded-full border px-2.5 py-1',
              block.data.style === style
                ? 'border-edu-primary bg-edu-container text-on-edu-container'
                : 'border-border text-muted-foreground'
            )}
          >
            {style === 'bullet' ? 'Con viñetas' : 'Numerada'}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-4 shrink-0 text-xs text-muted-foreground">
              {block.data.style === 'number' ? `${i + 1}.` : '•'}
            </span>
            <input
              type="text"
              value={item}
              disabled={!canEdit}
              onChange={e => setItem(i, e.target.value)}
              className="flex-1 border-b border-transparent bg-transparent text-sm text-foreground outline-none focus:border-border"
            />
            {canEdit && items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                aria-label="Quitar ítem"
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 text-xs font-medium text-edu-primary"
        >
          <Plus className="h-3.5 w-3.5" /> Añadir ítem
        </button>
      )}
    </div>
  );
}

/** Design (README §8): dashed upload zone, `cloud_upload` icon, "Arrastra
 * una imagen o pégala aquí", "JPG o PNG · hasta 5 MB", pill "Elegir archivo".
 * Same private-bucket path convention as `EducationService.uploadLessonAsset`
 * (never the public cover bucket). */
function MediaBody({
  block,
  canEdit,
  curriculumId,
  onChange,
}: {
  block: EducationImageBlock;
  canEdit: boolean;
  curriculumId: string;
  onChange: (data: unknown) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (JPG o PNG)');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('La imagen no puede superar los 5MB');
      return;
    }
    setUploading(true);
    try {
      const { path } = await EducationService.uploadLessonAsset(curriculumId, file);
      onChange({ ...block.data, path, alt: block.data.alt || file.name });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2.5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />
      {block.data.path ? (
        <div className="flex items-center gap-2 rounded-md3 border border-border bg-muted/40 px-3 py-2 text-xs text-foreground">
          <span className="flex-1 truncate">{block.data.path.split('/').pop()}</span>
          {canEdit && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-medium text-edu-primary"
            >
              Cambiar
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={!canEdit || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-md3 border border-dashed border-edu-image-frame-border bg-edu-image-frame p-[22px] text-center transition-colors hover:bg-edu-image-frame/70 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          ) : (
            <CloudUpload className="h-7 w-7 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            {uploading ? 'Subiendo…' : 'Arrastrá una imagen o hacé click para elegir'}
          </span>
          <span className="text-xs text-muted-foreground">
            JPG o PNG · hasta 5MB · se optimiza sola
          </span>
        </button>
      )}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          Pie de foto
        </label>
        <input
          type="text"
          value={block.data.caption ?? ''}
          disabled={!canEdit}
          onChange={e => onChange({ ...block.data, caption: e.target.value || undefined })}
          placeholder="Opcional"
          className="w-full rounded-md3-sm border border-border bg-transparent px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-edu-primary"
        />
      </div>
    </div>
  );
}

function VideoBody({
  block,
  canEdit,
  onChange,
}: {
  block: EducationVideoBlock;
  canEdit: boolean;
  onChange: (data: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="space-y-1">
        <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          Proveedor
        </label>
        <EducationSelect
          value={block.data.provider}
          onValueChange={v => canEdit && onChange({ ...block.data, provider: v })}
        >
          <EducationSelectTrigger className="h-9 text-xs">
            <EducationSelectValue />
          </EducationSelectTrigger>
          <EducationSelectContent>
            <EducationSelectItem value="youtube">YouTube</EducationSelectItem>
            <EducationSelectItem value="vimeo">Vimeo</EducationSelectItem>
          </EducationSelectContent>
        </EducationSelect>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          ID del video
        </label>
        <input
          type="text"
          value={block.data.videoId}
          disabled={!canEdit}
          onChange={e => onChange({ ...block.data, videoId: e.target.value.trim() })}
          placeholder="dQw4w9WgXcQ"
          className="h-9 w-full rounded-md3-sm border border-border bg-transparent px-2.5 text-xs text-foreground outline-none focus:border-edu-primary"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          Pie de foto
        </label>
        <input
          type="text"
          value={block.data.caption ?? ''}
          disabled={!canEdit}
          onChange={e => onChange({ ...block.data, caption: e.target.value || undefined })}
          placeholder="Opcional"
          className="w-full rounded-md3-sm border border-border bg-transparent px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-edu-primary"
        />
      </div>
    </div>
  );
}

/** Design (README §8): italic hex 14503A, `border-left:3px solid` hex 1F6B4C,
 * `padding-left:14px`, plus a "Referencia:" field below — matches the
 * viewer's own QuoteBlock tonal styling rather than a generic text box. */
function QuoteBody({
  block,
  canEdit,
  onChange,
  onFocusEditor,
  onBlurEditor,
}: {
  block: EducationQuoteBlock;
  canEdit: boolean;
  onChange: (data: unknown) => void;
  onFocusEditor?: (editor: Editor) => void;
  onBlurEditor?: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="border-l-[3px] border-edu-primary pl-3.5 italic text-edu-primary-dark">
        <InlineEditor
          doc={block.data.doc}
          onChange={doc => canEdit && onChange({ ...block.data, doc })}
          placeholder="Escribí el versículo…"
          ariaLabel="Contenido del versículo"
          onFocusEditor={onFocusEditor}
          onBlurEditor={onBlurEditor}
        />
      </div>
      <input
        type="text"
        value={block.data.attribution ?? ''}
        disabled={!canEdit}
        onChange={e => onChange({ ...block.data, attribution: e.target.value || undefined })}
        placeholder="Referencia: p. ej. Juan 3:16"
        className="w-full rounded-md3-sm border border-border bg-transparent px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-edu-primary"
      />
    </div>
  );
}

const CALLOUT_VARIANTS: { value: CalloutVariant; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Atención' },
  { value: 'success', label: 'Éxito' },
];

function CalloutBody({
  block,
  canEdit,
  onChange,
  onFocusEditor,
  onBlurEditor,
}: {
  block: EducationCalloutBlock;
  canEdit: boolean;
  onChange: (data: unknown) => void;
  onFocusEditor?: (editor: Editor) => void;
  onBlurEditor?: () => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1">
        {CALLOUT_VARIANTS.map(v => (
          <button
            key={v.value}
            type="button"
            disabled={!canEdit}
            onClick={() => onChange({ ...block.data, variant: v.value })}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium',
              block.data.variant === v.value
                ? 'border-edu-primary bg-edu-container text-on-edu-container'
                : 'border-border text-muted-foreground'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
      <InlineEditor
        doc={block.data.doc}
        onChange={doc => canEdit && onChange({ ...block.data, doc })}
        placeholder="Escribí el callout…"
        ariaLabel="Contenido del callout"
        onFocusEditor={onFocusEditor}
        onBlurEditor={onBlurEditor}
      />
    </div>
  );
}

function PdfBody({
  block,
  canEdit,
  curriculumId,
  onChange,
}: {
  block: EducationPdfBlock;
  canEdit: boolean;
  curriculumId: string;
  onChange: (data: unknown) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      toast.error('El PDF no puede superar los 10MB');
      return;
    }
    setUploading(true);
    try {
      const { path } = await EducationService.uploadLessonAsset(curriculumId, file);
      onChange({ path, name: file.name, sizeBytes: file.size });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir el PDF');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />
      {block.data.path ? (
        <div className="flex items-center gap-2.5 rounded-md3 border border-border bg-muted/40 px-3.5 py-2.5">
          <FileText className="h-5 w-5 shrink-0 text-edu-primary" />
          <span className="flex-1 truncate text-xs font-medium text-foreground">
            {block.data.name}
          </span>
          {canEdit && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium text-edu-primary"
            >
              Cambiar
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={!canEdit || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 rounded-md3 border border-dashed border-edu-image-frame-border bg-edu-image-frame p-[22px] text-center transition-colors hover:bg-edu-image-frame/70 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          ) : (
            <CloudUpload className="h-7 w-7 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            {uploading ? 'Subiendo…' : 'Elegí un archivo PDF'}
          </span>
          <span className="text-xs text-muted-foreground">Hasta 10MB</span>
        </button>
      )}
    </div>
  );
}

function QuestionBody({
  block,
  canEdit,
  onChange,
}: {
  block: EducationQuestionBlock;
  canEdit: boolean;
  onChange: (data: unknown) => void;
}) {
  return (
    <textarea
      value={block.data.prompt}
      disabled={!canEdit}
      onChange={e => onChange({ prompt: e.target.value })}
      placeholder="Escribí la pregunta de reflexión…"
      rows={2}
      className="w-full resize-none border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
    />
  );
}

/** Default `data` for a freshly-inserted block of the given type — used by
 * `LessonEditor`'s `InsertBar` handler. Every shape mirrors
 * `education_blocks_validate.go`'s `validateBlockData` exactly, so a new
 * block is always immediately server-acceptable (an empty PMDoc/prompt/etc
 * is the smallest VALID value for that type, not a placeholder that would
 * fail validation until the author fills it in). */
export function defaultBlockData(type: AnyEducationBlock['type']): unknown {
  switch (type) {
    case 'heading':
      return { text: '', level: 2 };
    case 'paragraph':
      return { doc: emptyPMDoc() };
    case 'list':
      return { style: 'bullet', items: [''] };
    case 'image':
      return { path: '', alt: '' };
    case 'video':
      return { provider: 'youtube', videoId: '' };
    case 'quote':
      return { doc: emptyPMDoc() };
    case 'callout':
      return { doc: emptyPMDoc(), variant: 'info' as const };
    case 'pdf':
      return { path: '', name: '', sizeBytes: 0 };
    case 'question':
      return { prompt: '' };
    case 'divider':
      return {};
    default:
      return {};
  }
}
