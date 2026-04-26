import { expect, test } from '@playwright/test';
import { launchDesktop } from '../fixtures/launch.ts';

test('desktop window boots and IPC health round-trips', async () => {
  const app = await launchDesktop();
  try {
    const window = await app.firstWindow();
    await expect(window).toHaveTitle(/Firebase Desk/);

    const result = await app.evaluate(async ({ ipcMain }: { ipcMain: unknown; }) => {
      // Round-trip via the registered IPC handler.
      const handler = (ipcMain as {
        _invokeHandlers: Map<string, (e: unknown, r: unknown) => unknown>;
      })
        ._invokeHandlers.get('health.check');
      if (!handler) throw new Error('health.check handler not registered');
      return handler({}, { ping: 'ping', sentAt: new Date().toISOString() });
    });

    expect((result as { pong: string; }).pong).toBe('pong');
  } finally {
    await app.close();
  }
});
