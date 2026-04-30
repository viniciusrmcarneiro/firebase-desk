import { describe, expect, it } from 'vitest';
import {
  CreateDocumentRequestSchema,
  DeleteDocumentRequestSchema,
  GenerateDocumentIdRequestSchema,
  GetDocumentRequestSchema,
  ListDocumentsRequestSchema,
  ListSubcollectionsRequestSchema,
  RunQueryRequestSchema,
  SaveDocumentRequestSchema,
  UpdateDocumentFieldsRequestSchema,
} from './firestore.ts';

describe('Firestore IPC schemas', () => {
  it('accepts encoded Firestore values for document saves', () => {
    expect(() =>
      SaveDocumentRequestSchema.parse({
        connectionId: 'emu',
        documentPath: 'orders/ord_1',
        options: { lastUpdateTime: '2026-04-29T00:00:00.000Z' },
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

  it('validates generated ID and create document requests', () => {
    expect(() =>
      GenerateDocumentIdRequestSchema.parse({
        connectionId: 'emu',
        collectionPath: 'orders',
      })
    ).not.toThrow();

    expect(() =>
      CreateDocumentRequestSchema.parse({
        connectionId: 'emu',
        collectionPath: 'orders',
        documentId: 'ord_new',
        data: { status: 'draft' },
      })
    ).not.toThrow();

    expect(() =>
      CreateDocumentRequestSchema.parse({
        connectionId: 'emu',
        collectionPath: 'orders',
        documentId: 'bad/id',
        data: { status: 'draft' },
      })
    ).toThrow();
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

  it('rejects invalid query, list, get, and subcollection paths', () => {
    expect(() =>
      RunQueryRequestSchema.parse({
        query: { connectionId: 'emu', path: 'orders' },
      })
    ).not.toThrow();

    expect(() =>
      RunQueryRequestSchema.parse({
        query: { connectionId: 'emu', path: 'orders/ord_1' },
      })
    ).toThrow();

    expect(() =>
      ListDocumentsRequestSchema.parse({
        connectionId: 'emu',
        collectionPath: 'orders/ord_1',
      })
    ).toThrow();

    expect(() =>
      GetDocumentRequestSchema.parse({
        connectionId: 'emu',
        documentPath: '',
      })
    ).toThrow();

    expect(() =>
      ListSubcollectionsRequestSchema.parse({
        connectionId: 'emu',
        documentPath: 'orders',
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

  it('validates field patch requests', () => {
    expect(() =>
      UpdateDocumentFieldsRequestSchema.parse({
        connectionId: 'emu',
        documentPath: 'orders/ord_1',
        operations: [
          {
            baseValue: 'draft',
            fieldPath: ['status'],
            type: 'set',
            value: 'paid',
          },
          {
            baseValue: true,
            fieldPath: ['metadata', 'obsolete'],
            type: 'delete',
          },
        ],
        options: {
          lastUpdateTime: '2026-04-29T00:00:00.000Z',
          staleBehavior: 'save-and-notify',
        },
      })
    ).not.toThrow();

    expect(() =>
      UpdateDocumentFieldsRequestSchema.parse({
        connectionId: 'emu',
        documentPath: 'orders/ord_1',
        operations: [{ fieldPath: ['__bad__'], type: 'set', value: 1 }],
        options: { staleBehavior: 'block' },
      })
    ).toThrow();
  });
});
