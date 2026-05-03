import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TargetModeBadge } from './TargetModeBadge.tsx';

describe('TargetModeBadge', () => {
  it('does not render a production label', () => {
    const { container } = render(<TargetModeBadge mode='production' />);
    expect(container.textContent).toBe('');
  });

  it('only flags emulator targets', () => {
    render(<TargetModeBadge mode='emulator' />);
    expect(screen.getByText('Emulator')).toBeDefined();
  });
});
