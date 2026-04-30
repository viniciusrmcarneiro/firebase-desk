import type { SettingsPatch } from '@firebase-desk/repo-contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  changeAppearanceModeCommand,
  loadDataDirectoryPathCommand,
  openDataDirectoryCommand,
  recordSettingsSavedCommand,
} from './settingsCommands.ts';
import { settingsPatchMetadata, settingsPatchSummary } from './settingsSelectors.ts';

describe('settings core', () => {
  it('summarizes data mode, activity, Firestore write, and theme patches', () => {
    const activityPatch: SettingsPatch = {
      activityLog: { detailMode: 'fullPayload', enabled: true, maxBytes: 8 },
    };
    const firestorePatch: SettingsPatch = {
      firestoreWrites: { fieldStaleBehavior: 'block' },
    };

    expect(settingsPatchSummary({ dataMode: 'live' })).toBe('Data mode changed to live');
    expect(settingsPatchSummary(activityPatch)).toBe('Activity settings changed');
    expect(settingsPatchSummary(firestorePatch)).toBe('Firestore write settings changed');
    expect(settingsPatchSummary({ theme: 'dark' })).toBe('Theme changed to dark');
    expect(settingsPatchMetadata(activityPatch)).toMatchObject({
      activityLog: { detailMode: 'fullPayload', enabled: true, maxBytes: 8 },
      changedKeys: ['activityLog'],
    });
    expect(settingsPatchMetadata(firestorePatch)).toMatchObject({
      changedKeys: ['firestoreWrites'],
      firestoreWrites: { fieldStaleBehavior: 'block' },
    });
  });

  it('records theme changes as settings activity', async () => {
    const recordActivity = vi.fn();
    await changeAppearanceModeCommand(
      { now: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(25), recordActivity },
      { mode: 'dark', setMode: vi.fn(async () => {}) },
    );

    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'Change theme',
        area: 'settings',
        durationMs: 15,
        metadata: { mode: 'dark' },
        status: 'success',
        summary: 'Theme changed to dark',
      }),
    );
  });

  it('records theme failures without throwing', async () => {
    const recordActivity = vi.fn();
    const onStatus = vi.fn();
    await changeAppearanceModeCommand(
      {
        now: vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(12),
        onStatus,
        recordActivity,
      },
      { mode: 'light', setMode: vi.fn(async () => Promise.reject(new Error('Disk full'))) },
    );

    expect(onStatus).toHaveBeenCalledWith('Theme failed: Disk full');
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        error: { message: 'Disk full' },
        status: 'failure',
        summary: 'Disk full',
      }),
    );
  });

  it('records saved settings patches', () => {
    const recordActivity = vi.fn();
    recordSettingsSavedCommand(
      { recordActivity },
      { firestoreWrites: { fieldStaleBehavior: 'confirm' } },
    );

    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'Update settings',
        area: 'settings',
        metadata: {
          changedKeys: ['firestoreWrites'],
          firestoreWrites: { fieldStaleBehavior: 'confirm' },
        },
        status: 'success',
        summary: 'Firestore write settings changed',
      }),
    );
  });

  it('loads and opens the desktop data directory through the app API', async () => {
    const openDataDirectory = vi.fn(async () => {});
    const onStatus = vi.fn();
    const api = {
      getConfig: vi.fn(async () => ({ dataDirectory: '/tmp/firebase-desk' })),
      openDataDirectory,
    };

    await expect(loadDataDirectoryPathCommand(api)).resolves.toBe('/tmp/firebase-desk');
    await openDataDirectoryCommand({ onStatus }, api);

    expect(openDataDirectory).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledWith('Opened data location');
  });

  it('treats unavailable data directory APIs as null or errors', async () => {
    await expect(loadDataDirectoryPathCommand(null)).resolves.toBeNull();
    await expect(openDataDirectoryCommand({}, null)).rejects.toThrow(
      'Data location is unavailable.',
    );
  });
});
