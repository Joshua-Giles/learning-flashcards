import { expect, test } from '@playwright/test';

test.describe('Sidebar sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('categories collapse and expand, and the choice survives a reload', async ({ page }) => {
    await page.goto('/');
    const languages = page.getByTestId('category-Languages');
    await expect(languages).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('set-link-italian-greetings')).toBeVisible();

    await languages.click();
    await expect(languages).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('set-link-italian-greetings')).toBeHidden();
    await expect(page.getByTestId('set-link-modest-mouse-band')).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('category-Languages')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('set-link-italian-greetings')).toBeHidden();
  });

  test('band groups nest their sets (main set first) and collapse on their own', async ({
    page,
  }) => {
    await page.goto('/');
    const drake = page.getByTestId('group-Nick Drake');
    await expect(drake).toContainText('2');

    // Inside the group the "Nick Drake: " prefix is dropped and the main set comes first.
    const links = page.locator('#lf-sidebar [data-testid^="set-link-nick-drake"]');
    await expect(links).toHaveText([/The Artist/, /Pink Moon/]);

    await drake.click();
    await expect(page.getByTestId('set-link-nick-drake-pink-moon')).toBeHidden();
    await expect(page.getByTestId('set-link-elliott-smith-artist')).toBeVisible();
  });

  test('collapse all, then open just the band you are focusing on', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('collapse-all').click();
    await expect(page.getByTestId('collapse-all')).toHaveText('Expand all');
    await expect(page.getByTestId('group-The Strokes')).toBeHidden(); // inside collapsed Music

    await page.getByTestId('category-Music').click();
    await expect(page.getByTestId('group-The Strokes')).toHaveAttribute('aria-expanded', 'false');
    await page.getByTestId('group-The Strokes').click();
    await expect(page.getByTestId('set-link-the-strokes-band')).toBeVisible();
    await expect(page.getByTestId('set-link-foo-fighters-band')).toBeHidden();

    await page.getByTestId('collapse-all').click(); // now "Expand all"
    await expect(page.getByTestId('set-link-foo-fighters-band')).toBeVisible();
  });

  test('a collapsed section with the current set shows a marker dot', async ({ page }) => {
    await page.goto('/sets/geese-band');
    const geese = page.getByTestId('group-Geese');
    await geese.click();
    await expect(geese.locator('.bg-accent')).toHaveCount(1);
    await page.getByTestId('group-Geese').click();
    await expect(geese.locator('.bg-accent')).toHaveCount(0);
  });
});
