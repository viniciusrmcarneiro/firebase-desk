import { describe, expect, it } from 'vitest';
import {
  decode,
  encode,
  FirestoreBytes,
  FirestoreGeoPoint,
  FirestoreReference,
  FirestoreTimestamp,
  type NativeValue,
} from './index.ts';

describe('data-format codec', () => {
  it('round-trips every supported __type__', () => {
    const native: NativeValue = {
      str: 'hello',
      num: 42,
      bool: true,
      empty: null,
      ts: new FirestoreTimestamp('2026-04-11T07:16:38.058Z'),
      loc: new FirestoreGeoPoint(-36.8485, 174.7633),
      ref: new FirestoreReference('customers/cus_ada'),
      bin: new FirestoreBytes('SGVsbG8='),
      list: [1, 'two', new FirestoreTimestamp('2026-01-01T00:00:00.000Z')],
      nested: { inner: new FirestoreReference('a/b') },
    };

    const encoded = encode(native);
    expect(encoded).toMatchObject({ empty: null });

    const decoded = decode(encoded);
    const reencoded = encode(decoded);

    expect(reencoded).toEqual(encoded);
  });

  it('rejects unknown __type__ values', () => {
    expect(() => decode({ __type__: 'wat', value: 1 } as never)).toThrow();
  });

  it('keeps plain JSON null values untagged', () => {
    expect(encode(null)).toBeNull();
    expect(decode(null)).toBeNull();
  });
});
