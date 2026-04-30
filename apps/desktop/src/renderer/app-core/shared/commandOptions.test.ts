import { describe, expect, it } from 'vitest';
import {
  commandActivityMetadata,
  normalizeCommandOptions,
  shouldNotifyForCommandStatus,
} from './commandOptions.ts';

describe('command options', () => {
  it('defaults to visible user commands with normal notifications', () => {
    expect(normalizeCommandOptions(undefined)).toEqual({
      cancellationPolicy: 'allow-concurrent',
      notifyPolicy: 'all',
      serializationKey: null,
      source: 'user',
      visible: true,
    });
  });

  it('normalizes scheduler metadata for activity entries', () => {
    expect(commandActivityMetadata({
      cancellationPolicy: 'skip-if-running',
      notifyPolicy: 'issues-only',
      serializationKey: 'daily-orders',
      source: 'scheduler',
      visible: false,
    })).toEqual({
      command: {
        cancellationPolicy: 'skip-if-running',
        notifyPolicy: 'issues-only',
        serializationKey: 'daily-orders',
        source: 'scheduler',
        visible: false,
      },
    });
  });

  it('supports issue-only notifications', () => {
    const options = { notifyPolicy: 'issues-only' } as const;

    expect(shouldNotifyForCommandStatus(options, 'success')).toBe(false);
    expect(shouldNotifyForCommandStatus(options, 'cancelled')).toBe(false);
    expect(shouldNotifyForCommandStatus(options, 'conflict')).toBe(true);
    expect(shouldNotifyForCommandStatus(options, 'failure')).toBe(true);
    expect(shouldNotifyForCommandStatus({ notifyPolicy: 'none' }, 'failure')).toBe(false);
  });
});
