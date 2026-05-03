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
  TREE_VALUE_CHILD_BATCH_SIZE,
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

  it('caps tree field values at 255 characters', () => {
    const expanded = new Set(['root:orders', 'doc:orders/ord_long', 'doc:orders/ord_long:fields']);
    const treeRows = flattenResultTree(
      'orders',
      [{
        id: 'ord_long',
        path: 'orders/ord_long',
        data: { notes: 'x'.repeat(300) },
        hasSubcollections: false,
      }],
      false,
      expanded,
      {},
      false,
    );
    const value = treeRows.find((row) => row.label === 'notes')?.value;

    expect(value).toHaveLength(255);
    expect(String(value).endsWith('...')).toBe(true);
  });

  it('expands encoded map values in the tree', () => {
    const expanded = new Set([
      'root:orders',
      'doc:orders/ord_map',
      'doc:orders/ord_map:fields',
      'doc:orders/ord_map:fields:field:metadata',
    ]);

    const treeRows = flattenResultTree(
      'orders',
      [{
        id: 'ord_map',
        path: 'orders/ord_map',
        data: { metadata: { __type__: 'map', value: { status: 'paid' } } },
        hasSubcollections: false,
      }],
      false,
      expanded,
      {},
      false,
    );

    expect(treeRows.map((row) => row.label)).toContain('metadata');
    expect(treeRows.map((row) => row.label)).toContain('status');
  });

  it('caps expanded tree fields for very wide documents', () => {
    const data = Object.fromEntries(
      Array.from({ length: 650 }, (_, index) => [`field_${index}`, index]),
    );
    const expanded = new Set(['root:orders', 'doc:orders/ord_big', 'doc:orders/ord_big:fields']);

    const treeRows = flattenResultTree(
      'orders',
      [{ id: 'ord_big', path: 'orders/ord_big', data, hasSubcollections: false }],
      false,
      expanded,
      {},
      false,
    );

    expect(treeRows.find((row) => row.label === '150 more fields')?.value).toBe(
      'Open document to inspect all fields',
    );
    expect(treeRows.filter((row) => String(row.label).startsWith('field_'))).toHaveLength(500);
  });

  it('caps expanded object children and adds a progressive show-more row', () => {
    const metadata = Object.fromEntries(
      Array.from({ length: TREE_VALUE_CHILD_BATCH_SIZE + 25 }, (_, index) => [
        `field_${index}`,
        index,
      ]),
    );
    const metadataId = 'doc:orders/ord_big_map:fields:field:metadata';
    const expanded = new Set([
      'root:orders',
      'doc:orders/ord_big_map',
      'doc:orders/ord_big_map:fields',
      metadataId,
    ]);

    const treeRows = flattenResultTree(
      'orders',
      [{
        id: 'ord_big_map',
        path: 'orders/ord_big_map',
        data: { metadata },
        hasSubcollections: false,
      }],
      false,
      expanded,
      {},
      false,
    );

    expect(treeRows.filter((row) => String(row.label).startsWith('field_'))).toHaveLength(
      TREE_VALUE_CHILD_BATCH_SIZE,
    );
    expect(treeRows.find((row) => row.kind === 'load-value-children')).toMatchObject({
      label: 'More entries',
      value: `${TREE_VALUE_CHILD_BATCH_SIZE} shown`,
      valueChildLimitTargetId: metadataId,
    });
  });

  it('uses increased tree child limits for expanded object nodes', () => {
    const metadata = Object.fromEntries(
      Array.from({ length: TREE_VALUE_CHILD_BATCH_SIZE + 25 }, (_, index) => [
        `field_${index}`,
        index,
      ]),
    );
    const metadataId = 'doc:orders/ord_big_map:fields:field:metadata';
    const expanded = new Set([
      'root:orders',
      'doc:orders/ord_big_map',
      'doc:orders/ord_big_map:fields',
      metadataId,
    ]);

    const treeRows = flattenResultTree(
      'orders',
      [{
        id: 'ord_big_map',
        path: 'orders/ord_big_map',
        data: { metadata },
        hasSubcollections: false,
      }],
      false,
      expanded,
      {},
      false,
      new Map([[metadataId, TREE_VALUE_CHILD_BATCH_SIZE * 2]]),
    );

    expect(treeRows.filter((row) => String(row.label).startsWith('field_'))).toHaveLength(
      TREE_VALUE_CHILD_BATCH_SIZE + 25,
    );
    expect(treeRows.find((row) => row.kind === 'load-value-children')).toBeUndefined();
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
