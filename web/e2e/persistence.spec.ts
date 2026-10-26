import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures';

test.describe('State Persistence & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('persists active panel tab and URL hash across reloads', async ({ page }) => {
    await page.goto('/');

    // Verify default view is Panel 2 (Backlog & Live DAG Board)
    await expect(page).toHaveURL(/.*#dag/);

    // Switch to Panel 1 (Docs & Specs)
    await page.getByRole('button', { name: /Panel 1: Docs & Specs/i }).click();
    await expect(page).toHaveURL(/.*#spec/);

    // Reload page and confirm URL and active tab persisted
    await page.reload();
    await expect(page).toHaveURL(/.*#spec/);

    // Switch to Panel 3 (AST & Synthesis X-Ray)
    await page.getByRole('button', { name: /Panel 3: AST & Synthesis X-Ray/i }).click();
    await expect(page).toHaveURL(/.*#xray/);

    // Direct hash deep-linking back to #dag
    await page.goto('/#dag');
    await expect(page.getByRole('button', { name: /Panel 2: Backlog & Live DAG Board/i })).toHaveClass(/text-cad-cyan/);
  });

  test('persists DagBoard view mode (DAG, Kanban, List) across reloads', async ({ page }) => {
    await page.goto('/#dag');

    // Switch to Kanban View
    const kanbanBtn = page.locator('button[title="Kanban Board"]');
    await kanbanBtn.click();
    await expect(page.locator('div[class*="bg-cad-subsurface"] span:has-text("Ready")')).toBeVisible();

    // Reload and verify Kanban view remained active
    await page.reload();
    await expect(kanbanBtn).toHaveClass(/text-cad-cyan/);

    // Switch to Dense List View
    const listBtn = page.locator('button[title="Dense Issue Table"]');
    await listBtn.click();
    await expect(page.locator('th:has-text("Key")')).toBeVisible();

    // Reload and verify List view remained active
    await page.reload();
    await expect(listBtn).toHaveClass(/text-cad-cyan/);
    await expect(page.locator('th:has-text("Key")')).toBeVisible();
  });

  test('persists Benji sidebar state in localStorage', async ({ page }) => {
    await page.goto('/#dag');

    // Benji sidebar should be visible
    const sidebar = page.locator('[data-testid="benji-sidebar"]');
    await expect(sidebar).toBeVisible();

    // Check docking toggle button
    const dockBtn = page.locator('button[title^="Dock "]');
    await expect(dockBtn).toBeVisible();
    await dockBtn.click();

    const dockState = await page.evaluate(() => localStorage.getItem('benji_sidebar_dock'));
    expect(dockState).toBe('right');
  });
});
