import { expect, test } from '@playwright/test';

test.describe('Study mode', () => {
  test('flip, grade with the keyboard, and finish with a summary', async ({ page }) => {
    await page.goto('/sets/sample-solar-system');
    await page.getByTestId('study-btn').click();
    await expect(page.getByTestId('study-position')).toHaveText('1 / 8');
    await expect(page.getByTestId('card-front')).toContainText('closest to the Sun');

    // Grading is ignored before flipping.
    await page.keyboard.press('2');
    await expect(page.getByTestId('study-position')).toHaveText('1 / 8');

    await page.keyboard.press('Space');
    await expect(page.getByTestId('card-back')).toContainText('Mercury');
    await page.keyboard.press('2'); // knew it
    await expect(page.getByTestId('study-position')).toHaveText('2 / 8');

    // Mouse: show answer, still learning.
    await page.getByTestId('show-answer').click();
    await page.getByTestId('grade-learning').click();

    // Rest by keyboard.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Space');
      await page.keyboard.press('2');
    }

    await expect(page.getByTestId('study-summary')).toBeVisible();
    await expect(page.getByTestId('summary-knew')).toHaveText('7');
    await expect(page.getByTestId('summary-learning')).toHaveText('1');

    await page.getByRole('button', { name: /Study the 1 I'm still learning/ }).click();
    await expect(page.getByTestId('study-position')).toHaveText('1 / 1');
    await expect(page.getByTestId('card-front')).toContainText('hottest');
  });

  test('hint and arrow navigation', async ({ page }) => {
    await page.goto('/sets/sample-solar-system/study');
    await expect(page.getByTestId('study-position')).toHaveText('1 / 8');
    await page.keyboard.press('h');
    await expect(page.getByTestId('card-hint')).toContainText('messenger god');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('study-position')).toHaveText('2 / 8');
    await expect(page.getByTestId('card-hint')).toHaveCount(0);
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('study-position')).toHaveText('1 / 8');
  });

  test('can start at a specific card via ?card=', async ({ page }) => {
    await page.goto('/sets/sample-solar-system/study?card=c004');
    await expect(page.getByTestId('card-front')).toContainText('Red Planet');
  });
});
