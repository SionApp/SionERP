import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

import { cn } from '@/lib/utils';
import { emptyPMDoc } from '../blocks/block.types';
import type { PMDoc, PMInlineNode, PMMark, PMMarkType } from '../blocks/block.types';

/**
 * TipTap-backed inline editor for `paragraph`/`quote`/`callout` block data
 * (tasks-v2-part2 I.2, lazy — only reachable from the admin `LessonEditor`
 * chunk). Confined to EXACTLY the marks
 * `handlers/education_blocks_validate.go`'s `allowedMarkTypes` accepts —
 * `bold|italic|underline|link` — and a single paragraph, no other block-level
 * nodes (that file's `validatePMDoc`: "doc.content must be exactly one node
 * of type paragraph"; "only text and hardBreak are permitted" as children).
 *
 * StarterKit ships far more than that (headings, lists, blockquote, code
 * blocks, horizontal rule, strike) — every one of those is explicitly turned
 * OFF below so the editor is STRUCTURALLY incapable of producing a doc the
 * server would reject, rather than relying on the toolbar never offering
 * those commands (defense in depth, same posture as PR-F's answer-leak
 * wire-type split).
 */
const EXTENSIONS = [
  StarterKit.configure({
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    blockquote: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    // `paragraph`, `text`, `hardBreak`, `history` (undo/redo) stay enabled —
    // exactly the node set `validatePMDoc` allows, plus editing ergonomics
    // that never reach the wire (undo/redo is local editor state).
  }),
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: false,
    linkOnPaste: true,
    protocols: ['http', 'https', 'mailto'],
    HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
  }),
];

const ALLOWED_MARKS: readonly PMMarkType[] = ['bold', 'italic', 'underline', 'link'];

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}
interface TiptapNode {
  type: string;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
}

function sanitizeMarks(marks: TiptapMark[] | undefined): PMMark[] | undefined {
  if (!marks || marks.length === 0) return undefined;
  const out: PMMark[] = [];
  for (const m of marks) {
    if (!ALLOWED_MARKS.includes(m.type as PMMarkType)) continue;
    if (m.type === 'link') {
      const href = typeof m.attrs?.href === 'string' ? m.attrs.href.trim() : '';
      if (!href) continue;
      out.push({ type: 'link', attrs: { href } });
    } else {
      out.push({ type: m.type as PMMarkType });
    }
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Converts TipTap's own `editor.getJSON()` output into OUR narrow `PMDoc`
 * shape — never forwarded verbatim. TipTap's `Link` mark alone carries
 * `target`/`rel`/`class` attrs by default; the server's `validatePMDoc`
 * rejects a link mark with anything other than EXACTLY one attr (`href`).
 * This is the single choke point that guarantees the wire payload always
 * matches the server's closed shape, regardless of what TipTap tracks
 * internally.
 */
export function pmDocFromEditor(editor: Editor): PMDoc {
  const json = editor.getJSON() as TiptapNode;
  const paragraph = json.content?.[0];
  if (!paragraph || paragraph.type !== 'paragraph') return emptyPMDoc();

  const content: PMInlineNode[] = (paragraph.content ?? []).flatMap((node): PMInlineNode[] => {
    if (node.type === 'hardBreak') return [{ type: 'hardBreak' }];
    if (node.type === 'text' && typeof node.text === 'string' && node.text.length > 0) {
      const marks = sanitizeMarks(node.marks);
      return [marks ? { type: 'text', text: node.text, marks } : { type: 'text', text: node.text }];
    }
    return [];
  });

  return { type: 'doc', content: [{ type: 'paragraph', content }] };
}

/** Builds the TipTap-shaped JSON `setContent`/`content` accept, from a PMDoc. */
function pmDocToTiptapJSON(doc: PMDoc) {
  return {
    type: 'doc',
    content: doc.content.map(p => ({
      type: 'paragraph',
      content: p.content.map(node =>
        node.type === 'hardBreak'
          ? { type: 'hardBreak' }
          : { type: 'text', text: node.text, marks: node.marks }
      ),
    })),
  };
}

export function InlineEditor({
  doc,
  onChange,
  placeholder,
  compact = false,
  ariaLabel,
  onFocusEditor,
  onBlurEditor,
}: {
  doc: PMDoc;
  onChange: (doc: PMDoc) => void;
  placeholder?: string;
  compact?: boolean;
  ariaLabel?: string;
  onFocusEditor?: (editor: Editor) => void;
  onBlurEditor?: () => void;
}) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: pmDocToTiptapJSON(doc),
    editorProps: {
      attributes: {
        class: cn(
          'outline-none text-edu-prose [text-wrap:pretty]',
          compact ? 'text-sm leading-relaxed' : 'text-[1em] leading-[1.75]'
        ),
        'aria-label': ariaLabel ?? 'Editor de texto',
      },
    },
    onUpdate: ({ editor }) => onChange(pmDocFromEditor(editor)),
    onFocus: ({ editor }) => onFocusEditor?.(editor),
    onBlur: () => onBlurEditor?.(),
  });

  // Resync from an OUTSIDE change (e.g. a discard/reset) — but never fight
  // the user's own typing: only when the editor doesn't currently have focus.
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = JSON.stringify(pmDocFromEditor(editor));
    const next = JSON.stringify(doc);
    if (current !== next) editor.commands.setContent(pmDocToTiptapJSON(doc), false);
  }, [doc, editor]);

  useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) return null;

  const isEmpty = editor.isEmpty;

  return (
    <div className="relative">
      {isEmpty && placeholder && (
        <span
          className={cn(
            'pointer-events-none absolute left-0 top-0 text-muted-foreground/60',
            compact ? 'text-sm' : 'text-[1em]'
          )}
        >
          {placeholder}
        </span>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
