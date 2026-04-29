import { expect, type Locator, type Page } from '@playwright/test';

type MonacoModelGlobal = {
  readonly monaco?: {
    readonly editor?: {
      readonly getModels?: () => Array<{
        getValue: () => string;
        setValue: (value: string) => void;
      }>;
    };
  };
};

export async function replaceMonacoEditorValue(
  page: Page,
  scope: Locator,
  value: string,
): Promise<void> {
  const editor = scope.locator('.monaco-editor').last();
  await expect(editor).toBeVisible();
  await page.evaluate((nextValue) => {
    const models = (globalThis as MonacoModelGlobal).monaco?.editor?.getModels?.() ?? [];
    const model = models[models.length - 1];
    if (!model) throw new Error('No Monaco editor model found.');
    model.setValue(nextValue);
  }, value);
  await expect.poll(async () =>
    await page.evaluate(() => {
      const models = (globalThis as MonacoModelGlobal).monaco?.editor?.getModels?.() ?? [];
      return models[models.length - 1]?.getValue() ?? null;
    })
  ).toBe(value);
}
