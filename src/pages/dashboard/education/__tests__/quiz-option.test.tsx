import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';

import { QuizOption } from '../student/QuizOption';
import type { QuizRunnerOption } from '@/types/education.types';

// PR-G.2 (tasks-v2): mirrors PR-F's own leak-boundary tests one layer up the
// stack — `QuizOption` is the client-side half of the answer-leak boundary
// (design/education-quiz-runtime). A correct/incorrect signal must be
// UNREACHABLE here, not merely absent from today's markup, so this test
// checks both:
//   1. Structural: `QuizOption`'s prop type has no correctness field at all
//      (a `@ts-expect-error` compile-time probe — the same "leak becomes a
//      compile error" guarantee PR-F's Go structs give server-side).
//   2. Rendered DOM: selecting/deselecting an option never introduces any
//      class, attribute, or text resembling a correctness hint (no
//      "correct"/"incorrect"/check-mark/cancel-mark styling) — only the
//      2-state selected/unselected pair the design's own mockup calls
//      "sin revelar" ("not revealed").
//   3. Raw source grep (same mechanism as
//      `handlers/education_quiz_leak_test.go`'s
//      `TestQuizRunnerModelDeclaresNoAnswerKey`): the component file itself
//      never spells out a forbidden identifier, including inside comments.

const FORBIDDEN_SOURCE_PATTERNS = [/is_?correct/i, /correct_?option/i];

function option(overrides: Partial<QuizRunnerOption> = {}): QuizRunnerOption {
  return { id: 'opt-1', text: 'Que Dios responde y enseña en el proceso', ...overrides };
}

describe('QuizOption — client-side half of the answer-leak boundary (G.2)', () => {
  it('has no correctness prop at all — assigning one is a TypeScript compile error', () => {
    // QuizOptionProps structurally has no correctness field; the directive
    // below existing AND being load-bearing (removing it makes `tsc` fail
    // with "Unused '@ts-expect-error' directive") IS the assertion — same
    // class of guarantee as the Go leak boundary, one layer up the stack.
    const elementWithLeak = (
      // @ts-expect-error — no correctness prop exists on QuizOptionProps
      <QuizOption option={option()} index={0} selected={false} onSelect={() => {}} isCorrect />
    );
    expect(elementWithLeak).toBeTruthy();
  });

  it('renders identically (letter + text + 2-state styling) regardless of which option would be correct', () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <QuizOption option={option({ id: 'a' })} index={0} selected={false} onSelect={onSelect} />
    );
    const unselectedButton = screen.getByRole('radio');
    expect(unselectedButton).toHaveAttribute('aria-checked', 'false');
    const unselectedHtml = unselectedButton.outerHTML.toLowerCase();
    for (const pattern of FORBIDDEN_SOURCE_PATTERNS) {
      expect(unselectedHtml).not.toMatch(pattern);
    }
    expect(unselectedHtml).not.toContain('incorrect');
    expect(unselectedHtml).not.toMatch(/\bcorrect\b/);

    rerender(
      <QuizOption option={option({ id: 'a' })} index={0} selected={true} onSelect={onSelect} />
    );
    const selectedButton = screen.getByRole('radio');
    expect(selectedButton).toHaveAttribute('aria-checked', 'true');
    const selectedHtml = selectedButton.outerHTML.toLowerCase();
    for (const pattern of FORBIDDEN_SOURCE_PATTERNS) {
      expect(selectedHtml).not.toMatch(pattern);
    }
    expect(selectedHtml).not.toContain('incorrect');
    expect(selectedHtml).not.toMatch(/\bcorrect\b/);

    // The ONLY difference between the two renders is the established
    // selected-vs-unselected pair (border-edu-primary / bg-edu-primary),
    // never a red/green/destructive/orange "wrong answer" class.
    expect(selectedHtml).not.toContain('destructive');
    expect(selectedHtml).not.toContain('edu-orange');
    expect(unselectedHtml).not.toContain('destructive');
    expect(unselectedHtml).not.toContain('edu-orange');
  });

  it('source file never spells a forbidden answer-key identifier, including in comments', () => {
    const path = resolve(process.cwd(), 'src/pages/dashboard/education/student/QuizOption.tsx');
    const raw = readFileSync(path, 'utf8');
    for (const pattern of FORBIDDEN_SOURCE_PATTERNS) {
      expect(raw).not.toMatch(pattern);
    }
  });
});
