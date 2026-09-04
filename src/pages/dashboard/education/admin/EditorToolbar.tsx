import type { LucideIcon } from 'lucide-react';
import {
  Bold,
  ChevronDown,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Design (README §8, "1. Toolbar de formato"): undo/redo · bold/italic/
 * underline · lists · link/quote/clear-format · a paragraph-style selector.
 * Deliberately NO "Historial" button anywhere (tasks-v2-part2 I.6: "omitted
 * entirely, not a disabled control").
 *
 * Operates on the currently FOCUSED `InlineEditor` instance, tracked by
 * `LessonEditor` and passed down as `activeEditor` — this toolbar has no
 * editor of its own (there is no single shared document; each
 * `paragraph`/`quote`/`callout` block owns its own TipTap instance). Bullet/
 * numbered lists and "quote" formatting have no TipTap command to run
 * against here: those are separate BLOCK TYPES in this JSON block model
 * (`list`/`quote`), authored via the InsertBar + BlockCardBody form, not
 * inline marks — rendered disabled with an explanatory `title` rather than
 * silently omitted, to keep the toolbar's visual layout matching the design.
 */
export function EditorToolbar({ activeEditor }: { activeEditor: Editor | null }) {
  const canFormat = !!activeEditor;

  function run(command: (editor: Editor) => void) {
    if (!activeEditor) return;
    command(activeEditor);
  }

  function handleSetLink() {
    if (!activeEditor) return;
    const previous = (activeEditor.getAttributes('link').href as string | undefined) ?? '';

    const url = window.prompt('URL del enlace (http, https o mailto)', previous || 'https://');
    if (url === null) return;
    const trimmed = url.trim();
    if (trimmed === '') {
      activeEditor.chain().focus().unsetLink().run();
      return;
    }
    activeEditor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 px-3 py-2.5">
      <ToolbarButton
        icon={Undo2}
        label="Deshacer"
        disabled={!canFormat}
        onClick={() => run(e => e.chain().focus().undo().run())}
      />
      <ToolbarButton
        icon={Redo2}
        label="Rehacer"
        disabled={!canFormat}
        onClick={() => run(e => e.chain().focus().redo().run())}
      />
      <Separator />
      <ToolbarButton
        icon={Bold}
        label="Negrita"
        active={activeEditor?.isActive('bold')}
        disabled={!canFormat}
        onClick={() => run(e => e.chain().focus().toggleBold().run())}
      />
      <ToolbarButton
        icon={Italic}
        label="Cursiva"
        active={activeEditor?.isActive('italic')}
        disabled={!canFormat}
        onClick={() => run(e => e.chain().focus().toggleItalic().run())}
      />
      <ToolbarButton
        icon={UnderlineIcon}
        label="Subrayado"
        active={activeEditor?.isActive('underline')}
        disabled={!canFormat}
        onClick={() => run(e => e.chain().focus().toggleUnderline().run())}
      />
      <Separator />
      <ToolbarButton icon={List} label="Lista con viñetas — usá el bloque Lista" disabled />
      <ToolbarButton icon={ListOrdered} label="Lista numerada — usá el bloque Lista" disabled />
      <Separator />
      <ToolbarButton
        icon={Link2}
        label="Enlace"
        active={activeEditor?.isActive('link')}
        disabled={!canFormat}
        onClick={handleSetLink}
      />
      <ToolbarButton icon={Quote} label="Cita — usá el bloque Versículo" disabled />
      <ToolbarButton
        icon={RemoveFormatting}
        label="Limpiar formato"
        disabled={!canFormat}
        onClick={() => run(e => e.chain().focus().unsetAllMarks().run())}
      />
      <Separator />
      <span className="flex items-center gap-1 rounded-md3-sm border border-border px-2.5 py-[7px] text-xs text-muted-foreground">
        Párrafo
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </div>
  );
}

function Separator() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />;
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={cn(
        'h-[34px] w-[34px] rounded-[9px] text-muted-foreground',
        active && 'bg-edu-container text-on-edu-container hover:bg-edu-container'
      )}
      // Keeps the currently-focused InlineEditor from blurring before the
      // click handler runs — the command chain re-focuses it anyway.
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
    >
      <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
    </Button>
  );
}
