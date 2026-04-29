import {
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
} from '@firebase-desk/data-format';
import { describe, expect, it } from 'vitest';
import {
  fieldCatalogFromRows,
  fieldCatalogKeyForPath,
  mergeFieldCatalogEntries,
} from './fieldCatalog.ts';

describe('fieldCatalog', () => {
  it('uses collection chain keys without document ids', () => {
    expect(fieldCatalogKeyForPath('orders/ord_1/skiers/skier_1/results')).toBe(
      'orders/skiers/results',
    );
  });

  it('extracts primitive, native, nested, and primitive array fields', () => {
    expect(
      fieldCatalogFromRows([
        {
          id: 'ord_1',
          path: 'orders/ord_1',
          hasSubcollections: false,
          data: {
            active: true,
            deliveryLocation: new FirestoreGeoPoint(-36, 174),
            empty: [],
            lineItems: [{ sku: 'keyboard' }],
            metadata: {
              tags: ['priority', 'vip'],
              score: 0.2,
            },
            ref: new FirestoreReference('customers/cus_1'),
            status: 'paid',
            updatedAt: new FirestoreTimestamp('2026-04-24T09:30:12.058Z'),
          },
        },
        {
          id: 'ord_2',
          path: 'orders/ord_2',
          hasSubcollections: false,
          data: {
            metadata: {
              tags: ['mobile', null],
              score: 1,
            },
            status: 'pending',
          },
        },
      ]),
    ).toEqual([
      { count: 1, field: 'active', types: ['boolean'] },
      { count: 1, field: 'deliveryLocation', types: ['geoPoint'] },
      { count: 2, field: 'metadata.score', types: ['number'] },
      { count: 2, field: 'metadata.tags', types: ['array<mixed>', 'array<string>'] },
      { count: 1, field: 'ref', types: ['reference'] },
      { count: 2, field: 'status', types: ['string'] },
      { count: 1, field: 'updatedAt', types: ['timestamp'] },
    ]);
  });

  it('handles encoded Firestore values and ignores arrays of objects', () => {
    expect(
      fieldCatalogFromRows([{
        id: 'doc_1',
        path: 'items/doc_1',
        hasSubcollections: false,
        data: {
          encodedMap: { __type__: 'map', value: { count: 1 } },
          encodedTime: { __type__: 'timestamp', value: '2026-04-24T09:30:12.058Z' },
          ignoredArray: [{ name: 'Ada' }],
          typedArray: { __type__: 'array', value: [1, 2] },
        },
      }]),
    ).toEqual([
      { count: 1, field: 'encodedMap.count', types: ['number'] },
      { count: 1, field: 'encodedTime', types: ['timestamp'] },
      { count: 1, field: 'typedArray', types: ['array<number>'] },
    ]);
  });

  it('merges counts and dedupes types', () => {
    expect(
      mergeFieldCatalogEntries(
        [{ count: 2, field: 'status', types: ['string'] }],
        [
          { count: 1, field: 'status', types: ['string'] },
          { count: 1, field: 'total', types: ['number'] },
        ],
      ),
    ).toEqual([
      { count: 3, field: 'status', types: ['string'] },
      { count: 1, field: 'total', types: ['number'] },
    ]);
  });
});
