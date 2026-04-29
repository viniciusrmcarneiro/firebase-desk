import { FirestoreTimestamp } from '@firebase-desk/data-format';
import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FieldContextMenu } from './FieldContextMenu.tsx';

vi.mock('@firebase-desk/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@firebase-desk/ui')>();
  return {
    ...actual,
    ContextMenu: ({ children }: { readonly children: ReactNode; }) => <div>{children}</div>,
    ContextMenuTrigger: ({ children }: { readonly children: ReactNode; }) => <>{children}</>,
    ContextMenuContent: ({ children }: { readonly children: ReactNode; }) => (
      <div role='menu'>{children}</div>
    ),
    ContextMenuItem: ({ children }: { readonly children: ReactNode; }) => (
      <div role='menuitem'>{children}</div>
    ),
    ContextMenuSeparator: () => <hr />,
  };
});

const document: FirestoreDocumentResult = {
  id: 'ord_1',
  path: 'orders/ord_1',
  data: {},
  hasSubcollections: false,
};

describe('FieldContextMenu', () => {
  it('shows type-aware edit labels for scalar and JSON values', () => {
    render(
      <div>
        <FieldContextMenu
          document={document}
          fieldPath={['active']}
          value={true}
          onEditField={() => {}}
        >
          <span>active</span>
        </FieldContextMenu>
        <FieldContextMenu
          document={document}
          fieldPath={['items']}
          value={[1]}
          onEditField={() => {}}
        >
          <span>items</span>
        </FieldContextMenu>
        <FieldContextMenu
          document={document}
          fieldPath={['updatedAt']}
          value={new FirestoreTimestamp('2026-01-01T00:00:00.000Z')}
          onEditField={() => {}}
        >
          <span>updatedAt</span>
        </FieldContextMenu>
      </div>,
    );

    expect(screen.getByText('Edit boolean')).toBeTruthy();
    expect(screen.getByText('Edit JSON')).toBeTruthy();
    expect(screen.getByText('Edit timestamp')).toBeTruthy();
  });

  it('shows null and delete actions for every editable field', () => {
    render(
      <FieldContextMenu
        document={document}
        fieldPath={['active']}
        value={true}
        onDeleteField={() => {}}
        onSetFieldNull={() => {}}
      >
        <span>active</span>
      </FieldContextMenu>,
    );

    expect(screen.getByText('Set null')).toBeTruthy();
    expect(screen.getByText('Delete field')).toBeTruthy();
    expect(screen.getByText('Copy field path')).toBeTruthy();
    expect(screen.getByText('Copy value')).toBeTruthy();
  });

  it('separates field and document actions when document actions exist', () => {
    render(
      <FieldContextMenu
        document={document}
        fieldPath={['active']}
        value={true}
        onDeleteDocument={() => {}}
        onDeleteField={() => {}}
        onOpenDocumentInNewTab={() => {}}
      >
        <span>active</span>
      </FieldContextMenu>,
    );

    expect(screen.getByText('Field')).toBeTruthy();
    expect(screen.getByText('Document')).toBeTruthy();
    expect(screen.getByText('Delete field')).toBeTruthy();
    expect(screen.getByText('Delete document')).toBeTruthy();
    expect(screen.getByText('Open in new tab')).toBeTruthy();
  });
});
