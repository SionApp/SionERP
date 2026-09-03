// Per-type `data` shapes below are the frontend mirror of
// `apps/backend-go/handlers/education_blocks_validate.go` — field-by-field,
// not guessed (tasks-v2 E.1's explicit instruction). Any drift here vs. the
// Go validator would mean the editor (PR-I) could author a shape the server
// rejects, or the viewer could silently drop a field the server accepts —
// keep this file and that one in sync on every change to either side.
//
// spec: education-content-model — "Block envelope and type whitelist",
// "Restricted ProseMirror JSON is server-sanitized".

/** Where a block renders — shared by `LessonViewer` (full) and PR-I's
 * `LivePreview` (preview-desktop/preview-mobile). Every block component
 * MUST accept this prop; `BlockRenderer` MUST NOT branch on anything else
 * to decide layout (spec: "Block renderers are shared between viewer and
 * preview ... imported by BOTH LessonViewer and LivePreview"). */
export type BlockSize = 'full' | 'preview-desktop' | 'preview-mobile';

export const ALL_BLOCK_TYPES = [
  'heading',
  'paragraph',
  'list',
  'image',
  'video',
  'quote',
  'callout',
  'pdf',
  'question',
  'divider',
] as const;

export type EducationBlockType = (typeof ALL_BLOCK_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────
// Restricted ProseMirror JSON ("PMDoc") — mirrors education_blocks_validate.go
// pmDoc/pmNode/pmMark exactly: a single doc > paragraph whose children are
// text nodes carrying only bold|italic|underline|link marks, plus hardBreak.
// ─────────────────────────────────────────────────────────────────────────

export type PMMarkType = 'bold' | 'italic' | 'underline' | 'link';

export interface PMMark {
  type: PMMarkType;
  attrs?: { href: string };
}

export interface PMTextNode {
  type: 'text';
  text: string;
  marks?: PMMark[];
}

export interface PMHardBreakNode {
  type: 'hardBreak';
}

export type PMInlineNode = PMTextNode | PMHardBreakNode;

export interface PMParagraphNode {
  type: 'paragraph';
  content: PMInlineNode[];
}

export interface PMDoc {
  type: 'doc';
  content: PMParagraphNode[];
}

/** An empty-but-valid PMDoc — the shape a new paragraph/quote/callout block
 * starts from (server: "an empty paragraph is valid, e.g. a blank line"). */
export function emptyPMDoc(): PMDoc {
  return { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
}

// ─────────────────────────────────────────────────────────────────────────
// Per-type `data` shapes
// ─────────────────────────────────────────────────────────────────────────

export interface HeadingData {
  text: string;
  level: 2 | 3;
}

export interface ParagraphData {
  doc: PMDoc;
}

export interface ListData {
  style: 'bullet' | 'number';
  items: string[];
}

export interface ImageData {
  path: string;
  alt: string;
  caption?: string;
}

export interface VideoData {
  provider: 'youtube' | 'vimeo';
  videoId: string;
  caption?: string;
}

export interface QuoteData {
  doc: PMDoc;
  attribution?: string;
}

export type CalloutVariant = 'info' | 'warning' | 'success';

export interface CalloutData {
  doc: PMDoc;
  variant: CalloutVariant;
}

export interface PdfData {
  path: string;
  name: string;
  sizeBytes: number;
}

export interface QuestionData {
  prompt: string;
}

export type DividerData = Record<string, never>;

// ─────────────────────────────────────────────────────────────────────────
// Discriminated union — the narrowed shape every `blocks/*Block.tsx`
// component actually consumes (as opposed to `EducationBlock` in
// education.types.ts, the raw untyped wire envelope).
// ─────────────────────────────────────────────────────────────────────────

export interface EducationHeadingBlock {
  id: string;
  type: 'heading';
  data: HeadingData;
}
export interface EducationParagraphBlock {
  id: string;
  type: 'paragraph';
  data: ParagraphData;
}
export interface EducationListBlock {
  id: string;
  type: 'list';
  data: ListData;
}
export interface EducationImageBlock {
  id: string;
  type: 'image';
  data: ImageData;
}
export interface EducationVideoBlock {
  id: string;
  type: 'video';
  data: VideoData;
}
export interface EducationQuoteBlock {
  id: string;
  type: 'quote';
  data: QuoteData;
}
export interface EducationCalloutBlock {
  id: string;
  type: 'callout';
  data: CalloutData;
}
export interface EducationPdfBlock {
  id: string;
  type: 'pdf';
  data: PdfData;
}
export interface EducationQuestionBlock {
  id: string;
  type: 'question';
  data: QuestionData;
}
export interface EducationDividerBlock {
  id: string;
  type: 'divider';
  data: DividerData;
}

export type AnyEducationBlock =
  | EducationHeadingBlock
  | EducationParagraphBlock
  | EducationListBlock
  | EducationImageBlock
  | EducationVideoBlock
  | EducationQuoteBlock
  | EducationCalloutBlock
  | EducationPdfBlock
  | EducationQuestionBlock
  | EducationDividerBlock;

/**
 * Narrows a raw `{id,type,data}` wire block into the discriminated union, or
 * `null` when the type is unrecognized or the data shape is missing its
 * required fields — the frontend's OWN defense-in-depth mirror of the
 * server's closed-shape validation (the server already refused to persist
 * anything malformed; this only guards against a version-skew read of
 * legacy/partial data, so BlockRenderer can degrade instead of crash).
 */
export function narrowEducationBlock(block: {
  id: string;
  type: string;
  data: unknown;
}): AnyEducationBlock | null {
  const data = (block.data ?? {}) as Record<string, unknown>;
  switch (block.type as EducationBlockType) {
    case 'heading':
      if (typeof data.text !== 'string' || (data.level !== 2 && data.level !== 3)) return null;
      return { id: block.id, type: 'heading', data: data as unknown as HeadingData };
    case 'paragraph':
      if (!isPMDoc(data.doc)) return null;
      return { id: block.id, type: 'paragraph', data: { doc: data.doc } };
    case 'list':
      if ((data.style !== 'bullet' && data.style !== 'number') || !Array.isArray(data.items))
        return null;
      return { id: block.id, type: 'list', data: data as unknown as ListData };
    case 'image':
      if (typeof data.path !== 'string') return null;
      return { id: block.id, type: 'image', data: data as unknown as ImageData };
    case 'video':
      if (
        (data.provider !== 'youtube' && data.provider !== 'vimeo') ||
        typeof data.videoId !== 'string'
      )
        return null;
      return { id: block.id, type: 'video', data: data as unknown as VideoData };
    case 'quote':
      if (!isPMDoc(data.doc)) return null;
      return {
        id: block.id,
        type: 'quote',
        data: { doc: data.doc, attribution: data.attribution as string | undefined },
      };
    case 'callout':
      if (!isPMDoc(data.doc) || !isCalloutVariant(data.variant)) return null;
      return { id: block.id, type: 'callout', data: { doc: data.doc, variant: data.variant } };
    case 'pdf':
      if (typeof data.path !== 'string' || typeof data.name !== 'string') return null;
      return { id: block.id, type: 'pdf', data: data as unknown as PdfData };
    case 'question':
      // Deliberately permissive on an empty/blank prompt (unlike every
      // other type above): a `question` block with no real prompt content
      // is exactly the shape an "orphaned reflection" defensive fallback
      // needs to render against — ReflectionBlock.tsx (E.3) renders
      // "pregunta eliminada" for a blank prompt instead of this function
      // dropping the block silently, which would render nothing at all.
      if (typeof data.prompt !== 'string') return null;
      return { id: block.id, type: 'question', data: { prompt: data.prompt } };
    case 'divider':
      return { id: block.id, type: 'divider', data: {} };
    default:
      return null;
  }
}

function isPMDoc(v: unknown): v is PMDoc {
  if (!v || typeof v !== 'object') return false;
  const doc = v as { type?: unknown; content?: unknown };
  return doc.type === 'doc' && Array.isArray(doc.content);
}

function isCalloutVariant(v: unknown): v is CalloutVariant {
  return v === 'info' || v === 'warning' || v === 'success';
}
