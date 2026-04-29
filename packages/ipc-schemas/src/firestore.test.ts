import { describe, expect, it } from 'vitest';
import { DeleteDocumentRequestSchema, SaveDocumentRequestSchema } from './firestore.ts';

describe('Firestore IPC schemas', () => {
  it('accepts encoded Firestore values for document saves', () => {
    expect(() =>
      SaveDocumentRequestSchema.parse({
        connectionId: 'emu',
        documentPath: 'orders/ord_1',
        data: {
          createdAt: { __type__: 'timestamp', value: '2026-04-29T00:00:00.000Z' },
          location: { __type__: 'geoPoint', latitude: -37.8136, longitude: 144.9631 },
          receipt: { __type__: 'bytes', base64: 'dGVzdA==' },
          customer: { __type__: 'reference', path: 'customers/cust_1' },
          tags: { __type__: 'array', value: ['paid'] },
          meta: { __type__: 'map', value: { source: 'desktop' } },
        },
      })
    ).not.toThrow();
  });

  it('rejects invalid write paths and encoded values', () => {
    expect(() =>
      SaveDocumentRequestSchema.parse({
        connectionId: 'emu',
        documentPath: 'orders',
        data: { status: 'paid' },
      })
    ).toThrow();

    expect(() =>
      SaveDocumentRequestSchema.parse({
        connectionId: 'emu',
        documentPath: 'orders/ord_1',
        data: { bad: { __type__: 'serverTimestamp' } },
      })
    ).toThrow();
  });

  it('validates delete subcollection paths', () => {
    expect(() =>
      DeleteDocumentRequestSchema.parse({
        connectionId: 'emu',
        documentPath: 'orders/ord_1',
        options: { deleteSubcollectionPaths: ['orders/ord_1/events'] },
      })
    ).not.toThrow();

    expect(() =>
      DeleteDocumentRequestSchema.parse({
        connectionId: 'emu',
        documentPath: 'orders/ord_1',
        options: { deleteSubcollectionPaths: ['orders/ord_1/events/evt_1'] },
      })
    ).toThrow();
  });
});
