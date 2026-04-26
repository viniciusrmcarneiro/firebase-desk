import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge.tsx';

describe('StatusBadge', () => {
  it('renders a default label', () => {
    render(<StatusBadge status='production' />);
    expect(screen.getByText('Production')).toBeDefined();
  });
});
