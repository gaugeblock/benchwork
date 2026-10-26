import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures';

test.describe('Benji AI Assistant & Chat Stream', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('displays role selector with available Sawhorse roles', async ({ page }) => {
    await page.goto('/#dag');

    const roleSelector = page.locator('select[title="Sawhorse Routing Role"]');
    await expect(roleSelector).toBeVisible();

    await roleSelector.selectOption('oracle');
    await expect(roleSelector).toHaveValue('oracle');
  });

  test('triggers autocomplete suggestions via quick pill bar', async ({ page }) => {
    await page.goto('/#dag');

    const textarea = page.getByPlaceholder(/Ask Benji/i);
    await expect(textarea).toBeVisible();

    // Click pill in AutocompletePillBar
    const planPill = page.locator('button:has-text("/plan")').first();
    await expect(planPill).toBeVisible();
    await planPill.click();

    await expect(textarea).toHaveValue(/\/plan/);
  });

  test('sends turn and streams back live tokens', async ({ page }) => {
    await page.goto('/#dag');

    const textarea = page.getByPlaceholder(/Ask Benji/i);
    await textarea.fill('Explain the current backlog');

    // Click send button
    const sendBtn = page.locator('button[title*="Send message"]');
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Expect streamed response tokens
    await expect(page.locator('text=Hello from Benji!')).toBeVisible({ timeout: 5000 });
  });
});
