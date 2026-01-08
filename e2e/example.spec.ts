import { test, expect } from '@playwright/test';

test('home loads and shows navbar tabs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'CALOR / DEMANDA' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'PROJEÇÕES DE FESTAS/EVENTOS' })).toBeVisible();
});
