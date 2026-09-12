import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JourneyProgressSummary } from '@/components/discipleship/JourneyProgressSummary';
import type { JourneyEntry } from '@/types/discipleship.types';

function makeEntry(overrides: Partial<JourneyEntry> = {}): JourneyEntry {
  return {
    user_id: 'u1',
    origin: 'conversion',
    activity_status: 'active',
    activity_changed_at: '2026-09-01T00:00:00Z',
    converted_at: '2026-09-01T00:00:00Z',
    stage: 'new_convert',
    assignment_id: 'a1',
    curriculum_id: 'c1',
    ...overrides,
  };
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

// Spec: Module-Gated Read Surface — gates on isModuleInstalled('education')
// (an install check, passed in as a prop here), never on useEducationAccess.
describe('JourneyProgressSummary', () => {
  test('renders nothing when Education is not installed', () => {
    const { container } = renderWithRouter(
      <JourneyProgressSummary entry={makeEntry()} educationInstalled={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when there is no curriculum assignment', () => {
    const { container } = renderWithRouter(
      <JourneyProgressSummary
        entry={makeEntry({ curriculum_id: null })}
        educationInstalled={true}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders nothing when there is no journey entry at all', () => {
    const { container } = renderWithRouter(
      <JourneyProgressSummary entry={undefined} educationInstalled={true} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('links into the Education course screen when installed and assigned', () => {
    renderWithRouter(
      <JourneyProgressSummary
        entry={makeEntry({ stage: 'new_convert' })}
        educationInstalled={true}
      />
    );
    const link = screen.getByRole('link', { name: /camino en curso/i });
    expect(link.getAttribute('href')).toBe('/dashboard/education/curso/c1');
  });

  test('labels a completed path when stage is disciple', () => {
    renderWithRouter(
      <JourneyProgressSummary entry={makeEntry({ stage: 'disciple' })} educationInstalled={true} />
    );
    expect(screen.getByText('Camino completado')).toBeDefined();
  });
});
