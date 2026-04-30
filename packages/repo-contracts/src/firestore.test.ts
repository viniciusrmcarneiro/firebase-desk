import { describe, expect, it } from 'vitest';
import {
  assertFirestoreCollectionPath,
  assertFirestoreDocumentPath,
  firestorePathParts,
  isFirestoreCollectionPath,
  isFirestoreDocumentPath,
} from './firestore.ts';

describe('Firestore path helpers', () => {
  it('classifies collection and document paths without filtering empty segments', () => {
    expect(isFirestoreCollectionPath('orders')).toBe(true);
    expect(isFirestoreCollectionPath('orders/ord_1/events')).toBe(true);
    expect(isFirestoreCollectionPath('orders/ord_1')).toBe(false);
    expect(isFirestoreCollectionPath('/orders')).toBe(false);
    expect(isFirestoreDocumentPath('orders/ord_1')).toBe(true);
    expect(isFirestoreDocumentPath('orders')).toBe(false);
    expect(isFirestoreDocumentPath('orders/')).toBe(false);
    expect(firestorePathParts('orders//events')).toEqual([]);
  });

  it('throws clear errors for invalid paths', () => {
    expect(() => assertFirestoreCollectionPath('orders/ord_1')).toThrow(
      'Invalid Firestore collection path: orders/ord_1',
    );
    expect(() => assertFirestoreDocumentPath('orders')).toThrow(
      'Invalid Firestore document path: orders',
    );
  });
});
