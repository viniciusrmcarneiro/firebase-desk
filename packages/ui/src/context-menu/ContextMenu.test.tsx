import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './ContextMenu.tsx';

describe('ContextMenu', () => {
  it('renders trigger content', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Row</ContextMenuTrigger>
      </ContextMenu>,
    );
    expect(screen.getByText('Row')).toBeDefined();
  });

  it('styles menu content and separators', async () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Row</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Close tab</ContextMenuItem>
          <ContextMenuSeparator />
        </ContextMenuContent>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByText('Row'));
    expect(await screen.findByRole('menuitem', { name: 'Close tab' })).toBeDefined();
    expect(document.querySelector('[role="separator"]')?.className).toContain('bg-border-subtle');
  });
});
