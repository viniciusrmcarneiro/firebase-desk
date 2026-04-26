import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContextMenu, ContextMenuTrigger } from './ContextMenu.tsx';

describe('ContextMenu', () => {
  it('renders trigger content', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger>Row</ContextMenuTrigger>
      </ContextMenu>,
    );
    expect(screen.getByText('Row')).toBeDefined();
  });
});
