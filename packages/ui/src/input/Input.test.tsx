import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input.tsx';

describe('Input', () => {
  it('renders with invalid state data attribute', () => {
    render(<Input aria-label='Path' invalid />);
    expect(screen.getByLabelText('Path').getAttribute('data-invalid')).toBe('true');
  });
});
