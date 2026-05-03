import { describe, expect, it } from 'vitest';
import {
  ActivityLogAppendInputSchema,
  ActivityLogEntrySchema,
  ActivityLogListRequestSchema,
  ActivityLogSettingsSchema,
} from './activity.ts';

describe('activity schemas', () => {
  it('accepts valid settings, entries, and filters', () => {
    expect(
      ActivityLogSettingsSchema.parse({
        detailMode: 'metadata',
        enabled: true,
        maxBytes: 5 * 1024 * 1024,
      }),
    ).toMatchObject({ detailMode: 'metadata', enabled: true });

    expect(
      ActivityLogEntrySchema.parse({
        action: 'Delete collection',
        area: 'firestore',
        id: 'entry-1',
        metadata: { jobId: 'job-1' },
        status: 'success',
        summary: 'Deleted 2 documents.',
        target: { path: 'orders', type: 'firestore-collection' },
        timestamp: '2026-04-29T00:00:00.000Z',
      }),
    ).toMatchObject({ action: 'Delete collection', area: 'firestore' });

    expect(
      ActivityLogListRequestSchema.parse({
        area: 'firestore',
        limit: 25,
        search: 'orders',
        status: 'success',
      }),
    ).toMatchObject({ area: 'firestore', limit: 25 });
  });

  it('rejects invalid settings, entries, and filters', () => {
    expect(() =>
      ActivityLogSettingsSchema.parse({
        detailMode: 'full',
        enabled: true,
        maxBytes: 10,
      })
    ).toThrow();
    expect(() =>
      ActivityLogAppendInputSchema.parse({
        action: '',
        area: 'firestore',
        status: 'success',
        summary: 'Saved',
      })
    ).toThrow();
    expect(() => ActivityLogListRequestSchema.parse({ limit: 1001 })).toThrow();
  });
});
