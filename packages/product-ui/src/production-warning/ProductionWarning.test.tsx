import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductionWarning } from './ProductionWarning.tsx';

describe('ProductionWarning', () => {
  it('renders danger alert', () => {
    render(<ProductionWarning />);
    expect(screen.getByRole('alert').textContent).toContain('production data');
  });
});
