import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input.tsx';

describe('Input', () => {
  it('renders with invalid state data attribute', () => {
    render(<Input aria-label='Path' invalid />);
    expect(screen.getByLabelText('Path').getAttribute('data-invalid')).toBe('true');
  });

  it('keeps explicit density variants independent from document density alias', () => {
    render(
      <>
        <Input aria-label='Compact' />
        <Input aria-label='Comfortable' density='comfortable' />
      </>,
    );

    expect(screen.getByLabelText('Compact').className).toContain(
      'h-[var(--density-compact-control-height)]',
    );
    expect(screen.getByLabelText('Comfortable').className).toContain(
      'h-[var(--density-comfortable-control-height)]',
    );
  });
});
