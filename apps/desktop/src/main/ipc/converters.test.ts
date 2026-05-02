import type { FirestoreDocumentResult, Page } from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import { toIpcResultPage, truncateLargeFieldValues } from './converters.ts';

describe('truncateLargeFieldValues', () => {
  it('passes small fields through unchanged', () => {
    const data = { a: 1, b: 'small', c: { x: true } };
    const out = truncateLargeFieldValues(data, 1024);
    expect(out).toEqual(data);
  });

  it('replaces oversized values with a truncated marker', () => {
    const big = 'x'.repeat(200);
    const out = truncateLargeFieldValues({ huge: big, ok: 'short' }, 100);
    expect(out['ok']).toBe('short');
    expect(out['huge']).toMatchObject({ __type__: 'truncated', valueType: 'string' });
    expect((out['huge'] as { sizeBytes: number; }).sizeBytes).toBeGreaterThan(100);
  });

  it('records the encoded type for typed values that exceed the budget', () => {
    const bytes = { __type__: 'bytes', base64: 'A'.repeat(500) };
    const out = truncateLargeFieldValues({ blob: bytes }, 100);
    expect(out['blob']).toMatchObject({ __type__: 'truncated', valueType: 'bytes' });
  });

  it('preserves an expandable preview for oversized arrays', () => {
    const arr = Array.from({ length: 700 }, (_, i) => `item-${i.toString().padStart(4, '0')}`);
    const out = truncateLargeFieldValues({ list: arr }, 256);
    expect(Array.isArray(out['list'])).toBe(true);
    expect(out['list']).not.toHaveLength(arr.length);
    expect((out['list'] as unknown[]).at(-1)).toMatchObject({
      __type__: 'truncated',
      valueType: 'array',
    });
  });

  it('preserves an expandable preview for oversized maps', () => {
    const metadata = Object.fromEntries(
      Array.from({ length: 700 }, (_, index) => [`field_${index}`, index]),
    );
    const out = truncateLargeFieldValues({ metadata }, 1024);

    expect(out['metadata']).toMatchObject({ field_0: 0, field_1: 1 });
    expect((out['metadata'] as Record<string, unknown>)['[truncated]']).toMatchObject({
      __type__: 'truncated',
      valueType: 'map',
    });
  });

  it('does not replace a large top-level map with a truncated scalar marker', () => {
    const roundsById = Object.fromEntries(
      Array.from({ length: 1_500 }, (_, index) => [
        `round_${index}`,
        { startsAt: { __type__: 'timestamp', value: '2026-01-01T00:00:00.000Z' } },
      ]),
    );

    const out = truncateLargeFieldValues({ roundsById }, 256 * 1024);

    expect(out['roundsById']).not.toMatchObject({ __type__: 'truncated' });
    expect(out['roundsById']).toMatchObject({
      round_0: { startsAt: { __type__: 'timestamp' } },
    });
  });

  it('does not let one huge child hide later map siblings', () => {
    const roundsById = {
      round_0: { payload: 'x'.repeat(300_000) },
      round_1: { score: 1 },
      round_2: { score: 2 },
    };

    const out = truncateLargeFieldValues({ roundsById }, 256 * 1024);

    expect(out['roundsById']).toMatchObject({
      round_0: { payload: { __type__: 'truncated', valueType: 'string' } },
      round_1: { score: 1 },
      round_2: { score: 2 },
    });
  });

  it('caps nested expandable previews independently of top-level maps', () => {
    const round = Object.fromEntries(
      Array.from({ length: 150 }, (_, index) => [`field_${index}`, 'x'.repeat(100)]),
    );

    const out = truncateLargeFieldValues({ roundsById: { round_0: round } }, 1024);
    const roundPreview = (out['roundsById'] as Record<string, Record<string, unknown>>)['round_0']!;

    expect(roundPreview['field_0']).toBe('x'.repeat(100));
    expect(roundPreview['field_149']).toBeUndefined();
    expect(roundPreview['[truncated]']).toMatchObject({ __type__: 'truncated', valueType: 'map' });
  });

  it('treats map-like objects with domain __type__ fields as expandable maps', () => {
    const map: Record<string, unknown> = Object.fromEntries(
      Array.from({ length: 700 }, (_, index) => [`field_${index}`, index]),
    );
    map['__type__'] = 'domain-map';

    const out = truncateLargeFieldValues({ map }, 1024);

    expect(out['map']).not.toMatchObject({ __type__: 'truncated' });
    expect(out['map']).toMatchObject({ field_0: 0 });
  });

  it('preserves encoded maps as encoded expandable previews', () => {
    const encodedMap = {
      __type__: 'map',
      value: Object.fromEntries(
        Array.from({ length: 700 }, (_, index) => [`field_${index}`, index]),
      ),
    };
    const out = truncateLargeFieldValues({ metadata: encodedMap }, 1024);

    expect(out['metadata']).toMatchObject({
      __type__: 'map',
      value: { field_0: 0, field_1: 1 },
    });
    expect(
      (out['metadata'] as { value: Record<string, unknown>; }).value['[truncated]'],
    ).toMatchObject({ __type__: 'truncated', valueType: 'map' });
  });
});

describe('toIpcResultPage', () => {
  it('truncates large field values for runQuery results', () => {
    const big = 'y'.repeat(2 * 1024 * 1024); // 2 MiB > default 256 KiB
    const page: Page<FirestoreDocumentResult> = {
      items: [
        { id: 'one', path: 'col/one', data: { huge: big, ok: 1 }, hasSubcollections: false },
      ],
      nextCursor: null,
    };
    const result = toIpcResultPage(page);
    const item = result.items[0]!;
    expect(item.data['ok']).toBe(1);
    expect(item.data['huge']).toMatchObject({ __type__: 'truncated', valueType: 'string' });
  });

  it('keeps large map fields expandable in runQuery results', () => {
    const roundsById = Object.fromEntries(
      Array.from({ length: 1_500 }, (_, index) => [`round_${index}`, { score: index }]),
    );
    const page: Page<FirestoreDocumentResult> = {
      items: [
        {
          id: 'one',
          path: 'col/one',
          data: { roundsById },
          hasSubcollections: false,
        },
      ],
      nextCursor: null,
    };

    const result = toIpcResultPage(page);

    expect(result.items[0]!.data['roundsById']).not.toMatchObject({ __type__: 'truncated' });
    expect(result.items[0]!.data['roundsById']).toMatchObject({ round_0: { score: 0 } });
  });
});
