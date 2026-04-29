import type {
  FirestoreCollectionNode,
  FirestoreDocumentResult,
} from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import {
  fieldCatalogForRows,
  findDocumentByPath,
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

  it('sorts object field keys and shows collapsed object previews', () => {
    const expanded = new Set(['root:orders', 'doc:orders/ord_3', 'doc:orders/ord_3:fields']);
    const treeRows = flattenResultTree(
      'orders',
      [{
        id: 'ord_3',
        path: 'orders/ord_3',
        data: { zebra: 1, alpha: { nested: true } },
        hasSubcollections: false,
      }],
      false,
      expanded,
      {},
      false,
    );

    expect(treeRows.map((row) => row.label)).toEqual([
      'orders',
      'ord_3',
      'Fields',
      'alpha',
      'zebra',
    ]);
    expect(treeRows.find((row) => row.label === 'alpha')?.value).toBe('{"nested":true}');
  });

  it('marks document-owned tree rows for selection', () => {
    const expanded = new Set([
      'root:orders',
      'doc:orders/ord_1',
      'doc:orders/ord_1:fields',
      'doc:orders/ord_1:subcollections',
    ]);

    const treeRows = flattenResultTree('orders', rows, false, expanded, {}, false);

    expect(treeRows.find((row) => row.label === 'Fields')?.documentPath).toBe('orders/ord_1');
    expect(treeRows.find((row) => row.label === 'total')?.documentPath).toBe('orders/ord_1');
    expect(treeRows.find((row) => row.label === 'Subcollections')?.documentPath).toBe(
      'orders/ord_1',
    );
    expect(treeRows.find((row) => row.label === 'events')?.documentPath).toBe('orders/ord_1');
  });

  it('finds nested documents by path', () => {
    const nestedDocument: FirestoreDocumentResult = {
      id: 'evt_1',
      path: 'orders/ord_1/events/evt_1',
      data: { type: 'created' },
      hasSubcollections: false,
    };
    const nestedCollection: FirestoreCollectionNode & {
      readonly documents: ReadonlyArray<FirestoreDocumentResult>;
    } = {
      id: 'events',
      path: 'orders/ord_1/events',
      documents: [nestedDocument],
    };
    const rowsWithNestedDocument: ReadonlyArray<FirestoreDocumentResult> = [{
      ...rows[0]!,
      subcollections: [nestedCollection],
    }];

    expect(findDocumentByPath(rowsWithNestedDocument, nestedDocument.path)).toBe(nestedDocument);
    expect(findDocumentByPath(rowsWithNestedDocument, 'orders/missing')).toBeNull();
  });
});
