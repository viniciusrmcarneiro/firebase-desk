import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button.tsx';

describe('Button', () => {
  it('renders a secondary button by default', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className).toContain('bg-action-secondary');
  });

  it('supports primary variant', () => {
    render(<Button variant='primary'>Run</Button>);
    expect(screen.getByRole('button', { name: 'Run' }).className).toContain('bg-action-primary');
  });
});
