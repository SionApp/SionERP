import { render } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  test('renders button with text', () => {
    const { getByRole } = render(<Button>Test Button</Button>);
    expect(getByRole('button', { name: 'Test Button' })).toBeDefined();
  });

  test('applies variant classes correctly', () => {
    const { getByRole } = render(<Button variant="destructive">Delete</Button>);
    const button = getByRole('button');
    expect(button.className).toContain('bg-destructive');
  });

  test('applies size classes correctly', () => {
    const { getByRole } = render(<Button size="lg">Large Button</Button>);
    const button = getByRole('button');
    expect(button.className).toContain('h-11');
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);
    
    getByRole('button').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('is disabled when disabled prop is true', () => {
    const { getByRole } = render(<Button disabled>Disabled Button</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});