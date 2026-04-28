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
      }).snapshot.resultTableLayouts,
    ).toEqual({});
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
});
