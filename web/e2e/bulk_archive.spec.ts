import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures';

test.describe('Bulk Task Selection & Batch Archiving', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('selects tasks in List View and performs bulk archiving', async ({ page }) => {
    await page.goto('/#dag');

    // Switch to List View
    await page.locator('button[title="Dense Issue Table"]').click();
    await expect(page.locator('th:has-text("Key")')).toBeVisible();

    // Floating action bar should not be visible initially
    const bulkBar = page.locator('[data-testid="bulk-action-bar"]');
    await expect(bulkBar).not.toBeVisible();

    // Select first and second task checkboxes in table body
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(3);

    await checkboxes.nth(0).click();
    await expect(bulkBar).toBeVisible();
    await expect(bulkBar).toContainText('1 task selected');

    await checkboxes.nth(1).click();
    await expect(bulkBar).toContainText('2 tasks selected');

    // Click "Archive Selected"
    const archiveBtn = page.locator('[data-testid="bulk-archive-button"]');
    await archiveBtn.click();

    // After archive, bar should disappear and table only contains 1 remaining task
    await expect(bulkBar).not.toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText('GB-103');
  });

  test('toggles select all header checkbox in List View', async ({ page }) => {
    await page.goto('/#dag');

    await page.locator('button[title="Dense Issue Table"]').click();
    const bulkBar = page.locator('[data-testid="bulk-action-bar"]');

    // Click header select all checkbox
    const selectAllCheckbox = page.locator('thead input[type="checkbox"]');
    await selectAllCheckbox.click();

    await expect(bulkBar).toBeVisible();
    await expect(bulkBar).toContainText('3 tasks selected');

    // Uncheck header select all checkbox
    await selectAllCheckbox.click();
    await expect(bulkBar).not.toBeVisible();
  });

  test('selects cards in Kanban View and clears selection', async ({ page }) => {
    await page.goto('/#dag');

    // Switch to Kanban View
    await page.locator('button[title="Kanban Board"]').click();
    const bulkBar = page.locator('[data-testid="bulk-action-bar"]');

    // Select first card checkbox
    const cardCheckboxes = page.locator('div[class*="rounded border bg-cad-surface"] input[type="checkbox"]');
    await expect(cardCheckboxes.first()).toBeVisible();

    await cardCheckboxes.first().click();
    await expect(bulkBar).toBeVisible();
    await expect(bulkBar).toContainText('1 task selected');

    // Clear selection via close button in bulk action bar
    const clearBtn = bulkBar.locator('button[title="Clear selection"]');
    await clearBtn.click();
    await expect(bulkBar).not.toBeVisible();
  });
});
