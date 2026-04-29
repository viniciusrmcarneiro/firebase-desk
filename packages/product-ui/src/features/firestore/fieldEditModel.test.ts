import {
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
} from '@firebase-desk/data-format';
import { describe, expect, it } from 'vitest';
import {
  classifyFieldValue,
  deleteNestedFieldValue,
  normalizeEditableValue,
  setNestedFieldValue,
  validateFieldName,
  validateFirestoreDocumentData,
  validateFirestoreValue,
} from './fieldEditModel.ts';

describe('firestore field edit model', () => {
  it('classifies primitive, typed scalar, and JSON editable values', () => {
    expect(classifyFieldValue(true)).toMatchObject({ editLabel: 'Edit boolean', jsonMode: false });
    expect(classifyFieldValue({ __type__: 'timestamp', value: '2026-01-01T00:00:00.000Z' }))
      .toMatchObject({ editLabel: 'Edit timestamp', jsonMode: false });
    expect(classifyFieldValue({ __type__: 'reference', path: 'customers/a' }))
      .toMatchObject({ editLabel: 'Edit reference', jsonMode: false });
    expect(classifyFieldValue(new FirestoreTimestamp('2026-01-01T00:00:00.000Z')))
      .toMatchObject({ editLabel: 'Edit timestamp', jsonMode: false });
    expect(classifyFieldValue(new FirestoreReference('customers/a')))
      .toMatchObject({ editLabel: 'Edit reference', jsonMode: false });
    expect(classifyFieldValue(new FirestoreGeoPoint(1, 2)))
      .toMatchObject({ editLabel: 'Edit geoPoint', jsonMode: false });
    expect(classifyFieldValue({ __type__: 'array', value: [1] }))
      .toMatchObject({ editLabel: 'Edit JSON', jsonMode: true });
    expect(classifyFieldValue({ nested: true }))
      .toMatchObject({ editLabel: 'Edit JSON', jsonMode: true });
  });

  it('validates Firestore field names without blocking app metadata-like names', () => {
    expect(() => validateFieldName('id')).not.toThrow();
    expect(() => validateFieldName('path')).not.toThrow();
    expect(() => validateFieldName('subcollections')).not.toThrow();
    expect(() => validateFieldName('a.b')).not.toThrow();
    expect(() => validateFieldName('__bad__')).toThrow('Field name cannot match __.*__.');
    expect(() => validateFieldName('')).toThrow('Field name is required.');
  });

  it('validates encoded Firestore values', () => {
    expect(() => validateFirestoreValue({ __type__: 'wat', value: 1 }, ['field'])).toThrow(
      'unknown __type__',
    );
    expect(() => validateFirestoreValue({ __type__: 'geoPoint', latitude: 1 })).toThrow(
      'geoPoint',
    );
    expect(() =>
      validateFirestoreDocumentData({
        at: { __type__: 'timestamp', value: '2026-01-01T00:00:00.000Z' },
        ref: { __type__: 'reference', path: 'customers/a' },
        bytes: { __type__: 'bytes', base64: 'SGVsbG8=' },
      })
    ).not.toThrow();
    expect(() => validateFirestoreValue(new FirestoreTimestamp('2026-01-01T00:00:00.000Z')))
      .not.toThrow();
  });

  it('validates reference fields as document paths', () => {
    expect(() =>
      validateFirestoreValue({ __type__: 'reference', path: 'customers/cus_ada' }, ['customerRef'])
    ).not.toThrow();
    expect(() =>
      validateFirestoreValue({ __type__: 'reference', path: 'customers' }, ['customerRef'])
    ).toThrow('reference must point to a document path');
    expect(() =>
      validateFirestoreValue({ __type__: 'reference', path: '/customers/cus_ada' }, [
        'customerRef',
      ])
    ).toThrow('reference must be a valid document path');
    expect(() =>
      validateFirestoreValue({ __type__: 'reference', path: 'customers//cus_ada' }, [
        'customerRef',
      ])
    ).toThrow('reference must be a valid document path');
  });

  it('normalizes native Firestore scalars to editable JSON values', () => {
    expect(normalizeEditableValue({
      at: new FirestoreTimestamp('2026-01-01T00:00:00.000Z'),
      loc: new FirestoreGeoPoint(1, 2),
    })).toEqual({
      at: { __type__: 'timestamp', value: '2026-01-01T00:00:00.000Z' },
      loc: { __type__: 'geoPoint', latitude: 1, longitude: 2 },
    });
  });

  it('updates and deletes nested map fields by literal path segments', () => {
    const data = { id: 'data-id', 'a.b': 1, meta: { active: true, count: 2 } };

    expect(setNestedFieldValue(data, ['a.b'], 3)).toEqual({
      id: 'data-id',
      'a.b': 3,
      meta: { active: true, count: 2 },
    });
    expect(setNestedFieldValue(data, ['meta', 'active'], false)).toEqual({
      id: 'data-id',
      'a.b': 1,
      meta: { active: false, count: 2 },
    });
    expect(deleteNestedFieldValue(data, ['meta', 'count'])).toEqual({
      id: 'data-id',
      'a.b': 1,
      meta: { active: true },
    });
  });
});
