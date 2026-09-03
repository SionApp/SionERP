import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StepIndicator } from '../student/StepIndicator';
import type { EducationStep } from '@/types/education.types';

// E.5 (tasks-v2) / spec (education-lesson-consumption, "Cannot skip
// forward"): clicking an unvisited step's indicator MUST be a no-op —
// inert, not visually disabled.

function step(id: string, orderIndex: number, label: string): EducationStep {
  return {
    id,
    lessonId: 'lesson-1',
    orderIndex,
    label,
    blocks: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const STEPS = [step('s1', 1, 'Introducción'), step('s2', 2, 'Desarrollo'), step('s3', 3, 'Cierre')];

describe('StepIndicator — jump only to visited steps (E.5)', () => {
  it('clicking a visited step calls onStepClick', async () => {
    const onStepClick = vi.fn();
    render(
      <StepIndicator
        steps={STEPS}
        currentStepId="s2"
        visitedStepIds={['s1', 's2']}
        onStepClick={onStepClick}
      />
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Introducción' }));
    expect(onStepClick).toHaveBeenCalledWith('s1');
  });

  it('clicking an unvisited step is a no-op', async () => {
    const onStepClick = vi.fn();
    render(
      <StepIndicator
        steps={STEPS}
        currentStepId="s2"
        visitedStepIds={['s1', 's2']}
        onStepClick={onStepClick}
      />
    );
    const unvisitedTab = screen.getByRole('tab', { name: 'Cierre' });
    await userEvent.click(unvisitedTab);
    expect(onStepClick).not.toHaveBeenCalled();
    // Inert, not visually disabled — no `disabled` attribute, just no effect.
    expect(unvisitedTab).not.toBeDisabled();
  });
});
