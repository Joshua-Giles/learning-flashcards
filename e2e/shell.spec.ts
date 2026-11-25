import { expect, test } from '@playwright/test';

test.describe('App shell', () => {
  test('opens a set from the sidebar in one click', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('set-link-sample-solar-system').click();
    await expect(page).toHaveURL(/\/sets\/sample-solar-system$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sample: Our Solar System');
    await expect(page.getByTestId('study-btn')).toBeVisible();
  });

  test('theme choice is applied and survives a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light'); // system → light

    await page.getByTestId('theme-toggle').click(); // system → light (explicit)
    await page.getByTestId('theme-toggle').click(); // light → dark
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('no flash: stored dark theme is on <html> before Angular boots', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('lf:theme', 'dark'));
    await page.route('**/main*.js', (route) => route.abort()); // block the app bundle entirely
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('collapsed sidebar state survives a reload on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const toggle = page.getByTestId('sidebar-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.reload();
    await expect(page.getByTestId('sidebar-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('set-link-sample-solar-system')).not.toBeVisible();
  });

  test('on mobile the sidebar is a drawer that closes after navigating', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const toggle = page.getByTestId('sidebar-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await page.getByTestId('set-link-sample-solar-system').click();
    await expect(page).toHaveURL(/\/sets\/sample-solar-system$/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile drawer closes on Escape', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const toggle = page.getByTestId('sidebar-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('unknown set shows a friendly not-found message', async ({ page }) => {
    await page.goto('/sets/does-not-exist');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Set not found');
  });
});
