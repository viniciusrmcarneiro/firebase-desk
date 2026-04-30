import {
  FirestoreBytes,
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
} from '@firebase-desk/data-format';
import { describe, expect, it } from 'vitest';
import {
  editableTypeForValue,
  firestoreValueType,
  iconForFirestoreFieldType,
  isJsonEditableType,
  primitiveCatalogTypeForValue,
} from './firestoreTypeRegistry.ts';

describe('firestoreTypeRegistry', () => {
  it('classifies native and encoded Firestore values', () => {
    expect(firestoreValueType(new FirestoreTimestamp('2026-01-01T00:00:00.000Z'))).toBe(
      'timestamp',
    );
    expect(firestoreValueType(new FirestoreGeoPoint(1, 2))).toBe('geoPoint');
    expect(firestoreValueType(new FirestoreReference('orders/ord_1'))).toBe('reference');
    expect(firestoreValueType(new FirestoreBytes('AQID'))).toBe('bytes');
    expect(firestoreValueType({ __type__: 'array', value: [] })).toBe('array');
    expect(editableTypeForValue({ __type__: 'map', value: {} })).toBe('map');
  });

  it('centralizes edit and catalog classification', () => {
    expect(isJsonEditableType('array')).toBe(true);
    expect(isJsonEditableType('timestamp')).toBe(false);
    expect(primitiveCatalogTypeForValue({ __type__: 'reference', path: 'orders/ord_1' })).toBe(
      'reference',
    );
    expect(iconForFirestoreFieldType('array<string>')).toBe('array');
    expect(iconForFirestoreFieldType('geoPoint')).toBe('geoPoint');
  });
});
