import {
  DEFAULT_ACTIVITY_LOG_SETTINGS,
  DEFAULT_FIRESTORE_WRITE_SETTINGS,
} from '@firebase-desk/repo-contracts';
import { describe, expect, it } from 'vitest';
import { SettingsFileSchema, SettingsPatchSchema } from './settings.ts';

describe('settings schemas', () => {
  it('defaults result table layouts for existing settings files', () => {
    expect(
      SettingsFileSchema.parse({
        version: 1,
        snapshot: {
          sidebarWidth: 320,
          inspectorWidth: 360,
          theme: 'system',
          dataMode: 'mock',
          hotkeyOverrides: {},
        },
      }).snapshot,
    ).toMatchObject({
      activityLog: DEFAULT_ACTIVITY_LOG_SETTINGS,
      firestoreWrites: DEFAULT_FIRESTORE_WRITE_SETTINGS,
      resultTableLayouts: {},
    });
  });

  it('does not default activity settings in patches', () => {
    expect(SettingsPatchSchema.parse({ sidebarWidth: 400 })).toEqual({ sidebarWidth: 400 });
  });

  it('validates firestore write settings in patches', () => {
    expect(
      SettingsPatchSchema.parse({
        firestoreWrites: { fieldStaleBehavior: 'block' },
      }),
    ).toEqual({
      firestoreWrites: { fieldStaleBehavior: 'block' },
    });
  });

  it('validates result table layouts in patches', () => {
    expect(
      SettingsPatchSchema.parse({
        resultTableLayouts: {
          'orders/skiers': {
            columnOrder: ['id', 'team'],
            columnSizing: { team: 220 },
          },
        },
      }),
    ).toEqual({
      resultTableLayouts: {
        'orders/skiers': {
          columnOrder: ['id', 'team'],
          columnSizing: { team: 220 },
        },
      },
    });
  });

  it('validates firestore field catalogs in patches', () => {
    expect(
      SettingsPatchSchema.parse({
        firestoreFieldCatalogs: {
          'orders/skiers': [
            { count: 2, field: 'profile.age', types: ['number', 'array<string>'] },
          ],
        },
      }),
    ).toEqual({
      firestoreFieldCatalogs: {
        'orders/skiers': [
          { count: 2, field: 'profile.age', types: ['number', 'array<string>'] },
        ],
      },
    });
  });
});
