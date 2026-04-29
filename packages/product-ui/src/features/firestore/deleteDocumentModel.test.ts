import type { FirestoreDocumentResult } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import { buildDeleteDocumentOptions } from './deleteDocumentModel.ts';

describe('deleteDocumentModel', () => {
  it('builds recursive delete options for selected subcollections only', () => {
    const logsCollection: CollectionWithDocuments = {
      id: 'logs',
      path: 'orders/ord_1/events/evt_1/logs',
      documents: [{
        id: 'log_1',
        path: 'orders/ord_1/events/evt_1/logs/log_1',
        data: {},
        hasSubcollections: false,
      }],
    };
    const eventsCollection: CollectionWithDocuments = {
      id: 'events',
      path: 'orders/ord_1/events',
      documents: [{
        id: 'evt_1',
        path: 'orders/ord_1/events/evt_1',
        data: {},
        hasSubcollections: true,
        subcollections: [logsCollection],
      }],
    };
    const auditCollection: CollectionWithDocuments = {
      id: 'audit',
      path: 'orders/ord_1/audit',
      documents: [{
        id: 'aud_1',
        path: 'orders/ord_1/audit/aud_1',
        data: {},
        hasSubcollections: false,
      }],
    };
    const document: FirestoreDocumentResult = {
      id: 'ord_1',
      path: 'orders/ord_1',
      data: {},
      hasSubcollections: true,
      subcollections: [eventsCollection, auditCollection],
    };

    expect(buildDeleteDocumentOptions(document, new Set(['orders/ord_1/events']))).toEqual({
      deleteSubcollectionPaths: ['orders/ord_1/events'],
      deleteDescendantDocumentPaths: [
        'orders/ord_1/events/evt_1',
        'orders/ord_1/events/evt_1/logs/log_1',
      ],
    });
  });
});

type CollectionWithDocuments = NonNullable<FirestoreDocumentResult['subcollections']>[number] & {
  readonly documents: ReadonlyArray<FirestoreDocumentResult>;
};
