import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkspaceShell } from './WorkspaceShell.tsx';

describe('WorkspaceShell', () => {
  it('renders tab strip, toolbar, and content', () => {
    const { container } = render(
      <WorkspaceShell tabStrip='Tabs' toolbar='Tools'>Panel</WorkspaceShell>,
    );
    expect(container.textContent).toContain('Tabs');
    expect(container.textContent).toContain('Tools');
    expect(screen.getByText('Panel')).toBeDefined();
  });
});
