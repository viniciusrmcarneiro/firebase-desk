import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell.tsx';

describe('AppShell', () => {
  it('renders shell regions', () => {
    const { container } = render(
      <AppShell sidebar='Sidebar' statusBar='Status' workspace='Workspace' />,
    );
    expect(container.textContent).toContain('Sidebar');
    expect(container.textContent).toContain('Workspace');
    expect(container.textContent).toContain('Status');
    expect(container.firstElementChild?.className).toContain('select-none');
  });
});
