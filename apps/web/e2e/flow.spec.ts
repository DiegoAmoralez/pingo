import { expect, test } from '@playwright/test';

test('register, add monitor, open, pause, delete', async ({ page }) => {
  const email = `e2e-${Date.now()}@pingo.local`;
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding|dashboard/);

  if (page.url().includes('onboarding')) {
    await page.getByPlaceholder('https://mywebsite.com').fill('https://example.com');
    await page.getByRole('button', { name: 'Start monitoring' }).click();
  } else {
    await page.getByRole('button', { name: /Add monitor|Add website/ }).first().click();
    await page.getByLabel('Website URL').fill('https://example.com');
    await page.getByRole('button', { name: 'Start monitoring' }).click();
  }

  await expect(page.getByText('example.com').first()).toBeVisible({ timeout: 30_000 });
  await page.goto('/dashboard');
  await page.getByRole('link', { name: /example.com/ }).first().click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByLabel('Pause monitoring').check();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.goto('/dashboard');
  await page.getByRole('link', { name: /example.com/ }).first().click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Delete monitor' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Nothing to monitor yet')).toBeVisible({ timeout: 15_000 });
});
