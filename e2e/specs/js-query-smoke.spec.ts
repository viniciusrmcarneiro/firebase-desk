import { expect, test } from '@playwright/test';
import { addLocalEmulatorAccount, openJavaScriptQuery, openLiveApp } from '../fixtures/live-app.ts';

test('JavaScript Query runs against seeded Firestore emulator data', async () => {
  const live = await openLiveApp();
  try {
    const page = live.page;
    await addLocalEmulatorAccount(page);
    await openJavaScriptQuery(page);

    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
    await page.getByRole('button', { name: 'Run' }).click();

    await expect(page.getByText('yield DocumentSnapshot')).toBeVisible();
    await expect(page.getByText('yield QuerySnapshot')).toBeVisible();
    await expect(page.getByText('return value')).toBeVisible();
    await expect(page.getByText('ord_1024').first()).toBeVisible();

    await page.getByRole('tab', { name: /Logs/ }).click();
    await expect(page.getByText(/Fetched \d+ orders/)).toBeVisible();

    await page.getByRole('tab', { name: /Errors/ }).click();
    await expect(page.getByText('No errors')).toBeVisible();
  } finally {
    await live.close();
  }
});
