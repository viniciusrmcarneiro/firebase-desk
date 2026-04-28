import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import {
  fieldCatalogForRows,
  flattenResultTree,
  mergeLoadedSubcollections,
} from './resultModel.tsx';

const rows: ReadonlyArray<FirestoreDocumentResult> = [
  {
    id: 'ord_1',
    path: 'orders/ord_1',
    data: { status: 'paid', total: 10 },
    hasSubcollections: true,
    subcollections: [{ id: 'events', path: 'orders/ord_1/events' }],
  },
  {
    id: 'ord_2',
    path: 'orders/ord_2',
    data: { status: 'open' },
    hasSubcollections: false,
  },
];

describe('firestore result model', () => {
  it('builds sorted field catalog with counts and types', () => {
    expect(fieldCatalogForRows(rows)).toEqual([
      { count: 2, field: 'status', types: ['string'] },
      { count: 1, field: 'total', types: ['number'] },
    ]);
  });

  it('merges lazy subcollections into a document', () => {
    expect(mergeLoadedSubcollections(rows[1]!, {
      status: 'success',
      items: [{ id: 'events', path: 'orders/ord_2/events' }],
    })).toEqual({
      ...rows[1],
      hasSubcollections: true,
      subcollections: [{ id: 'events', path: 'orders/ord_2/events' }],
    });
  });

  it('flattens tree groups for fields and subcollections', () => {
    const expanded = new Set([
      'root:orders',
      'doc:orders/ord_1',
      'doc:orders/ord_1:fields',
      'doc:orders/ord_1:subcollections',
    ]);

    const labels = flattenResultTree('orders', rows, false, expanded, {}, false)
      .map((row) => row.label);

    expect(labels).toEqual([
      'orders',
      'ord_1',
      'Fields',
      'status',
      'total',
      'Subcollections',
      'events',
      'ord_2',
    ]);
  });
});
