import type { ReactNode } from 'react';

import type { PMDoc, PMMark } from './block.types';

// Walks a restricted PMDoc into real React elements — <strong>/<em>/<u>/<a>
// only, matching the 4 whitelisted marks (bold|italic|underline|link).
// React's raw-HTML injection prop (the one `check-education-guards.mjs`
// bans module-wide) MUST NOT appear anywhere in this file (spec:
// "Renderer never uses raw HTML ... assertable by grep"; PR-C's
// `scripts/check-education-guards.mjs` enforces this at the CI level via
// `pnpm run lint:education`).

// Defense in depth: the server already rejects a non-http(s)/mailto href on
// write (education_blocks_validate.go's hrefSchemeAllowed), so this should
// never trigger against real data — but the renderer never trusts a stored
// href blindly either. A rejected scheme degrades to plain, unlinked text
// rather than ever emitting an <a href> that could carry `javascript:`.
function isSafeHref(href: string): boolean {
  const lower = href.trim().toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:');
}

function applyMarks(node: ReactNode, marks: PMMark[] | undefined): ReactNode {
  if (!marks || marks.length === 0) return node;
  return marks.reduce<ReactNode>((acc, mark) => {
    switch (mark.type) {
      case 'bold':
        return <strong>{acc}</strong>;
      case 'italic':
        return <em>{acc}</em>;
      case 'underline':
        return <u>{acc}</u>;
      case 'link': {
        const href = mark.attrs?.href ?? '';
        if (!isSafeHref(href)) return acc;
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, node);
}

/**
 * Renders one restricted PMDoc's single paragraph into inline React nodes.
 * Returns `null` for a missing/malformed/empty doc — callers (Paragraph/
 * Quote/Callout blocks) treat that as "nothing to render", never a crash.
 */
export function renderInline(doc: PMDoc | null | undefined): ReactNode {
  if (!doc || doc.type !== 'doc' || !Array.isArray(doc.content) || doc.content.length === 0) {
    return null;
  }
  const paragraph = doc.content[0];
  if (!paragraph || paragraph.type !== 'paragraph' || !Array.isArray(paragraph.content)) {
    return null;
  }
  if (paragraph.content.length === 0) return null;

  return paragraph.content.map((node, i) => {
    if (node.type === 'hardBreak') return <br key={i} />;
    if (node.type === 'text') {
      return <span key={i}>{applyMarks(node.text, node.marks)}</span>;
    }
    return null;
  });
}
