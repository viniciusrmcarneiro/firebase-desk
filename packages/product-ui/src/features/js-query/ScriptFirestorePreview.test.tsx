import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScriptFirestorePreview } from './ScriptFirestorePreview.tsx';

vi.mock('../firestore/FirestoreDocumentBrowser.tsx', () => ({
  FirestoreDocumentBrowser: (
    {
      queryPath,
      rows,
      selectedDocumentPath,
    }: {
      readonly queryPath: string;
      readonly rows: ReadonlyArray<{ readonly path: string; }>;
      readonly selectedDocumentPath: string | null;
    },
  ) => (
    <div data-testid='browser'>
      {queryPath}:{rows.length}:{selectedDocumentPath}
    </div>
  ),
}));

describe('ScriptFirestorePreview', () => {
  it('uses Firestore browser for normalized document arrays', () => {
    render(
      <ScriptFirestorePreview
        value={[{ id: 'ord_1', path: 'orders/ord_1', data: { total: 10 } }]}
      />,
    );

    expect(screen.getByTestId('browser').textContent).toBe('orders:1:orders/ord_1');
  });

  it('falls back to json preview for non-document values', async () => {
    render(<ScriptFirestorePreview value={{ ok: true }} />);

    expect(await screen.findByText(/"ok": true/)).toBeTruthy();
  });
});
