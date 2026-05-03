import { describe, expect, it } from 'vitest';
import {
  applyFirestoreFieldPatchOperation,
  deepEqualJson,
  fieldPatchHasChangedRemoteValue,
  getNestedValue,
  stableJsonString,
  utf8ByteLength,
} from './firestore-field-patch.ts';

describe('Firestore field patch helpers', () => {
  it('gets, sets, and deletes nested literal field path segments', () => {
    const data = {
      'a.b': 'literal',
      meta: { count: 1, stale: true },
    };

    expect(getNestedValue(data, ['a.b'])).toBe('literal');
    expect(applyFirestoreFieldPatchOperation(data, {
      baseValue: 'literal',
      fieldPath: ['a.b'],
      type: 'set',
      value: 'changed',
    })).toMatchObject({ 'a.b': 'changed' });
    expect(applyFirestoreFieldPatchOperation(data, {
      baseValue: true,
      fieldPath: ['meta', 'stale'],
      type: 'delete',
    })).toEqual({ 'a.b': 'literal', meta: { count: 1 } });
  });

  it('keeps missing nested deletes as no-ops', () => {
    expect(applyFirestoreFieldPatchOperation({ meta: { count: 1 } }, {
      baseValue: undefined,
      fieldPath: ['meta', 'missing', 'child'],
      type: 'delete',
    })).toEqual({ meta: { count: 1 } });
  });

  it('compares JSON with stable property order', () => {
    expect(deepEqualJson({ b: 2, a: { y: 2, x: 1 } }, { a: { x: 1, y: 2 }, b: 2 })).toBe(true);
    expect(stableJsonString({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(() => {
      const circular: Record<string, unknown> = {};
      circular['self'] = circular;
      stableJsonString(circular);
    }).toThrow('Cannot compare circular JSON values.');
  });

  it('classifies same-field remote changes', () => {
    expect(fieldPatchHasChangedRemoteValue({ status: 'remote' }, [{
      baseValue: 'draft',
      fieldPath: ['status'],
      type: 'set',
      value: 'local',
    }])).toBe(true);
    expect(fieldPatchHasChangedRemoteValue({ status: 'draft', other: 'remote' }, [{
      baseValue: 'draft',
      fieldPath: ['status'],
      type: 'set',
      value: 'local',
    }])).toBe(false);
  });

  it('counts UTF-8 bytes', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('🔥')).toBe(4);
  });
});
