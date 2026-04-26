import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TargetModeBadge } from './TargetModeBadge.tsx';

describe('TargetModeBadge', () => {
  it('renders production target text', () => {
    render(<TargetModeBadge mode='production' />);
    expect(screen.getByText('Target: Production')).toBeDefined();
  });
});
