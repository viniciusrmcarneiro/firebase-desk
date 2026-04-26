import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge.tsx';

describe('Badge', () => {
  it('renders variant styles', () => {
    render(<Badge variant='success'>Ready</Badge>);
    expect(screen.getByText('Ready').className).toContain('bg-status-success-bg');
  });
});
