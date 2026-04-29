import { describe, expect, it } from 'vitest';
import { sortedObjectEntries, stringifySortedJson } from './sortedJson.ts';

describe('sorted Firestore JSON helpers', () => {
  it('sorts object entries with the same ordering used by result trees', () => {
    expect(sortedObjectEntries({ zebra: 1, alpha: 2 }).map(([key]) => key)).toEqual([
      'alpha',
      'zebra',
    ]);
  });

  it('recursively sorts object property names without reordering arrays', () => {
    expect(
      stringifySortedJson({
        z: true,
        list: [{ b: 2, a: 1 }],
        a: {
          z: 2,
          a: 1,
        },
      }),
    ).toBe(`{
  "a": {
    "a": 1,
    "z": 2
  },
  "list": [
    {
      "a": 1,
      "b": 2
    }
  ],
  "z": true
}`);
  });
});
