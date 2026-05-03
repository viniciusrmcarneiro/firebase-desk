import type { BackgroundJob } from '@firebase-desk/repo-contracts/jobs';
import { describe, expect, it, vi } from 'vitest';
import { createBackgroundJobNotifier } from './native-app.ts';

type ShowNotification = NonNullable<
  Parameters<typeof createBackgroundJobNotifier>[0]
>['showNotification'];

vi.mock('electron', () => ({
  app: { isPackaged: true, name: 'Firebase Desk' },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
    getFocusedWindow: vi.fn(() => null),
  },
  Menu: { buildFromTemplate: vi.fn(), setApplicationMenu: vi.fn() },
  nativeTheme: { themeSource: 'system' },
  Notification: { isSupported: vi.fn(() => true) },
  shell: { openExternal: vi.fn() },
}));

describe('background job notifier', () => {
  it('dedupes final job notifications', () => {
    const showNotification = vi.fn<ShowNotification>();
    const notify = notifier(showNotification);

    notify({ job: job('job-1'), type: 'job-updated' });
    notify({ job: job('job-1'), type: 'job-updated' });

    expect(showNotification).toHaveBeenCalledTimes(1);
  });

  it('forgets removed jobs', () => {
    const showNotification = vi.fn<ShowNotification>();
    const notify = notifier(showNotification);

    notify({ job: job('job-1'), type: 'job-updated' });
    notify({ id: 'job-1', type: 'job-removed' });
    notify({ job: job('job-1'), type: 'job-updated' });

    expect(showNotification).toHaveBeenCalledTimes(2);
  });

  it('forgets acknowledged jobs', () => {
    const showNotification = vi.fn<ShowNotification>();
    const notify = notifier(showNotification);

    notify({ job: job('job-1'), type: 'job-updated' });
    notify({
      job: { ...job('job-1'), acknowledgedAt: '2026-05-01T00:02:00.000Z' },
      type: 'job-updated',
    });
    notify({ job: job('job-1'), type: 'job-updated' });

    expect(showNotification).toHaveBeenCalledTimes(2);
  });

  it('bounds remembered job ids', () => {
    const showNotification = vi.fn<ShowNotification>();
    const notify = notifier(showNotification);

    for (let index = 0; index <= 500; index += 1) {
      notify({ job: job(`job-${index}`), type: 'job-updated' });
    }
    notify({ job: job('job-0'), type: 'job-updated' });

    expect(showNotification).toHaveBeenCalledTimes(502);
  });
});

function notifier(
  showNotification: ShowNotification,
): ReturnType<typeof createBackgroundJobNotifier> {
  return createBackgroundJobNotifier({
    focusApp: vi.fn(),
    isAppFocused: () => false,
    isNotificationSupported: () => true,
    showNotification,
  });
}

function job(id: string): BackgroundJob {
  return {
    createdAt: '2026-05-01T00:00:00.000Z',
    finishedAt: '2026-05-01T00:01:00.000Z',
    id,
    progress: { deleted: 0, failed: 0, read: 2, skipped: 0, written: 0 },
    request: {
      collectionPath: 'orders',
      connectionId: 'demo',
      encoding: 'encoded',
      filePath: '/tmp/orders.jsonl',
      format: 'jsonl',
      includeSubcollections: false,
      type: 'firestore.exportCollection',
    },
    status: 'succeeded',
    summary: 'Exported 2 rows.',
    title: 'Export collection',
    type: 'firestore.exportCollection',
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
}
