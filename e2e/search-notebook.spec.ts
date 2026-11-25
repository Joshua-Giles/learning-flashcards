import { expect, test } from '@playwright/test';

test.describe('Search', () => {
  test('Ctrl+K opens search; a typo finds the card; Enter opens it in study mode', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('search-open')).toBeVisible();
    await page.keyboard.press('Control+k');
    const input = page.getByTestId('search-input');
    await expect(input).toBeFocused();

    await input.fill('buongorno');
    await expect(page.getByTestId('search-result').first()).toContainText('Buongiorno');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/sets\/italian-greetings\/study\?card=c001$/);
    await expect(page.getByTestId('card-front')).toContainText('good morning');
  });

  test('"/" opens search, arrows move, sets are listed first, Esc closes and restores focus', async ({
    page,
  }) => {
    await page.goto('/');
    const opener = page.getByTestId('search-open');
    await opener.focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('search-input').fill('modest mouse');
    const results = page.getByTestId('search-result');
    await expect(results.first()).toContainText('Modest Mouse');
    await expect(results.first()).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowDown');
    await expect(results.nth(1)).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('search-input')).toHaveCount(0);
    await expect(opener).toBeFocused();

    await page.locator('main').click();
    await page.keyboard.press('/');
    await expect(page.getByTestId('search-input')).toBeFocused();
  });

  test('takes no space while closed', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('search-input')).toHaveCount(0);
  });
});

test.describe('Questions notebook', () => {
  test('capture with ? from a card, then Copy for Claude', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/sets/sample-solar-system/study');
    await expect(page.getByTestId('study-position')).toHaveText('1 / 8');

    await page.keyboard.press('?');
    const text = page.getByTestId('capture-text');
    await expect(text).toBeFocused();
    await text.fill('Why is Mercury not the hottest planet?');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('toast').filter({ hasText: 'Question saved' })).toBeVisible();

    await page.goto('/questions');
    await page.getByTestId('new-question').fill('Is there a Modest Mouse song about space?');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByTestId('question')).toHaveCount(2);

    await page.getByTestId('copy-for-claude').click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('Please answer these questions and add them as new cards');
    expect(clip).toContain('- [sample-solar-system / c001] Why is Mercury not the hottest planet?');
    expect(clip).toContain('- [general] Is there a Modest Mouse song about space?');

    // Copied questions move from Open to Sent.
    await expect(page.getByTestId('question')).toHaveCount(0);
    await page.getByRole('button', { name: /^Sent/ }).click();
    await expect(page.getByTestId('question')).toHaveCount(2);

    await page.reload();
    await page.getByRole('button', { name: /^Sent/ }).click();
    await expect(page.getByTestId('question')).toHaveCount(2);
  });

  test('resolve, edit and delete a question', async ({ page }) => {
    await page.goto('/questions');
    await page.getByTestId('new-question').fill('Original text?');
    await page.getByRole('button', { name: 'Add' }).click();

    const item = page.getByTestId('question');
    await item.getByRole('button', { name: 'Edit' }).click();
    await item.getByRole('textbox').fill('Edited text?');
    await item.getByRole('button', { name: 'Save' }).click();
    await expect(item).toContainText('Edited text?');

    await item.getByRole('button', { name: 'Resolve' }).click();
    await expect(page.getByTestId('question')).toHaveCount(0);
    await page.getByRole('button', { name: /^Resolved/ }).click();
    await page.getByTestId('question').getByRole('button', { name: 'Delete' }).click();
    await page.getByTestId('question').getByRole('button', { name: 'Really delete?' }).click();
    await expect(page.getByTestId('question')).toHaveCount(0);
  });
});
