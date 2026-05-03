import { expect, type Page, test } from '@playwright/test';
import { authCustomClaims, getAuthEmulatorUser } from '../fixtures/auth-rest.ts';
import { replaceMonacoEditorValue } from '../fixtures/editor.ts';
import {
  addLocalEmulatorAccount,
  openAuthentication,
  openLiveApp,
  uniqueSmokeId,
} from '../fixtures/live-app.ts';

test('Authentication lists, filters, selects, and edits custom claims through emulator UI', async () => {
  const live = await openLiveApp();
  try {
    const page = live.page;
    const role = uniqueSmokeId('auth-role');
    await addLocalEmulatorAccount(page);
    await openAuthentication(page);

    await expect(page.getByText('u_ada').first()).toBeVisible();
    await expect(page.getByText('u_grace').first()).toBeVisible();
    await expect(page.getByText('u_barbara').first()).toBeVisible();
    await expect(page.getByText('disabled').first()).toBeVisible();

    await assertAuthTabRevisitDoesNotReload(page);

    await page.getByLabel('Filter users').fill('ada@example.com');
    await expect(page.getByText('u_ada').first()).toBeVisible();
    await page.getByText('u_ada', { exact: true }).first().click();
    await expect(page.getByText('Ada Lovelace').first()).toBeVisible();
    await expect(page.getByText('ada@example.com').first()).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).last().click();
    const dialog = page.getByRole('dialog', { name: 'Custom claims' });
    await expect(dialog).toBeVisible();
    await replaceMonacoEditorValue(
      page,
      dialog,
      JSON.stringify(
        {
          permissions: ['read', 'write'],
          role,
          smoke: true,
        },
        null,
        2,
      ),
    );
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText(`"role": "${role}"`)).toBeVisible();
    const user = await getAuthEmulatorUser('u_ada');
    expect(authCustomClaims(user)).toMatchObject({
      permissions: ['read', 'write'],
      role,
      smoke: true,
    });
  } finally {
    await live.close();
  }
});

async function assertAuthTabRevisitDoesNotReload(page: Page) {
  const tree = page.getByRole('tree', { name: 'Account tree' });
  const workspaceTabs = page.locator('[role="tablist"]').first();
  await tree.getByRole('treeitem', { name: /JavaScript Query/ }).click();
  await expect(workspaceTabs.getByRole('tab', { name: /JS Query/ })).toBeVisible();
  await workspaceTabs.getByRole('tab', { name: /Auth/ }).click();
  await expect(page.getByText('u_ada').first()).toBeVisible();

  await page.getByRole('button', { name: /Activity/ }).click();
  const activity = page.getByRole('region', { name: 'Activity' });
  await expect(activity).toBeVisible();
  await expect(activity.getByText('Load users')).toHaveCount(1);
  await activity.getByRole('button', { name: 'Close' }).click();
}
