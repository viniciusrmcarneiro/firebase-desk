import { expect, test } from '@playwright/test';
import type { IpcRequest, IpcResponse } from '@firebase-desk/ipc-schemas';
import { launchDesktop } from '../fixtures/launch.ts';

type FirebaseDeskGlobal = {
  readonly firebaseDesk: {
    readonly health: {
      readonly check: (
        request: IpcRequest<'health.check'>,
      ) => Promise<IpcResponse<'health.check'>>;
    };
  };
};

test('desktop window boots and IPC health round-trips', async () => {
  const app = await launchDesktop();
  try {
    const page = await app.firstWindow();
    await expect(page).toHaveTitle(/Firebase Desk/);

    const result = await page.evaluate(async () => {
      const api = (globalThis as unknown as FirebaseDeskGlobal).firebaseDesk;
      return api.health.check({ ping: 'ping', sentAt: new Date().toISOString() });
    });

    expect(result.pong).toBe('pong');
  } finally {
    await app.close();
  }
});
