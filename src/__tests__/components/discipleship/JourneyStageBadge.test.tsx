import { render, screen } from '@testing-library/react';
import { JourneyStageBadge } from '@/components/discipleship/JourneyStageBadge';

// Spec: Not-Tracked Rendering — a member with no anchor row must render as
// the neutral "Sin seguimiento", and must never be mislabeled as any journey
// stage (in particular never as "new_convert").
describe('JourneyStageBadge', () => {
  test('renders "Sin seguimiento" for not_tracked, never a stage label', () => {
    render(<JourneyStageBadge stage="not_tracked" />);
    expect(screen.getByText('Sin seguimiento')).toBeDefined();
    expect(screen.queryByText('Nuevo convertido')).toBeNull();
  });

  test('renders "Nuevo convertido" for new_convert', () => {
    render(<JourneyStageBadge stage="new_convert" />);
    expect(screen.getByText('Nuevo convertido')).toBeDefined();
  });

  test('renders "Discípulo" for disciple', () => {
    render(<JourneyStageBadge stage="disciple" />);
    expect(screen.getByText('Discípulo')).toBeDefined();
  });

  test('renders "Discipulador" for the defensive disciple_maker case', () => {
    render(<JourneyStageBadge stage="disciple_maker" />);
    expect(screen.getByText('Discipulador')).toBeDefined();
  });
});
