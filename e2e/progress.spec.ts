import { expect, test } from '@playwright/test';
import { answerCorrectly, seedState, stateWith } from './helpers';

const SET = 'sample-solar-system';
const at = (day: string, hour = 12) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`);

test.describe('Points, goal and streak', () => {
  test('quiz points persist, reaching the goal starts a streak', async ({ page }) => {
    await page.clock.setFixedTime(at('2026-11-24'));
    await page.goto(`/sets/${SET}/quiz`);
    await expect(page.getByTestId('today-points')).toHaveText('0/50');
    await page.getByTestId('start-all').click();

    await answerCorrectly(page, 5); // 5 × 10 + combo bonus 5
    await expect(page.getByTestId('today-points')).toHaveText('55/50');
    await expect(page.getByTestId('streak')).toContainText('1');
    await expect(page.getByTestId('toast').filter({ hasText: 'Daily goal reached' })).toBeVisible();

    await page.reload();
    await expect(page.getByTestId('today-points')).toHaveText('55/50');
    await expect(page.getByTestId('streak')).toContainText('1');
  });

  test('a streak continues on the next day and is at risk until the goal is met', async ({
    page,
  }) => {
    await seedState(
      page,
      stateWith({ days: { '2026-11-23': { points: 60, cardsReviewed: 6, goalMet: true } } }),
    );
    await page.clock.setFixedTime(at('2026-11-24'));
    await page.goto(`/sets/${SET}/quiz`);
    await expect(page.getByTestId('streak')).toHaveAttribute('data-at-risk', 'true');
    await expect(page.getByTestId('streak')).toContainText('1');

    await page.getByTestId('start-all').click();
    await answerCorrectly(page, 5);
    await expect(page.getByTestId('streak')).toHaveAttribute('data-at-risk', 'false');
    await expect(page.getByTestId('streak')).toContainText('2');
  });

  test('missing a day resets the streak to 0', async ({ page }) => {
    await seedState(
      page,
      stateWith({
        days: {
          '2026-11-21': { points: 60, cardsReviewed: 6, goalMet: true },
          '2026-11-22': { points: 60, cardsReviewed: 6, goalMet: true },
        },
      }),
    );
    await page.clock.setFixedTime(at('2026-11-24'));
    await page.goto('/');
    await expect(page.getByTestId('streak')).toContainText('0');
    await expect(page.getByTestId('today-streak')).toContainText('0');
  });

  test('a full quiz sets the best score shown on the set page and the leaderboard', async ({
    page,
  }) => {
    test.slow(); // eight answered questions plus three page visits
    await page.goto(`/sets/${SET}/quiz`);
    await page.getByTestId('start-all').click();
    await answerCorrectly(page, 8);
    await expect(page.getByTestId('quiz-results')).toBeVisible();
    await expect(page.getByTestId('quiz-points')).toContainText('+'); // includes +25 first completion

    await page.goto(`/sets/${SET}`);
    await expect(page.getByTestId('best-accuracy')).toHaveText('100%');
    await page.goto('/stats');
    await expect(page.getByTestId('best-sets')).toContainText('Our Solar System');
    await expect(page.getByTestId('best-sets')).toContainText('100%');
  });
});

test.describe('Dashboard', () => {
  test('shows gathering-dust sets and continue, from seeded progress', async ({ page }) => {
    await seedState(
      page,
      stateWith({
        sets: {
          [SET]: {
            firstOpened: '2026-11-01',
            lastStudied: '2026-11-10',
            lastActivityAt: '2026-11-10T18:00:00.000Z',
            totalPoints: 40,
            studyPasses: 1,
            quizzesCompleted: 0,
          },
        },
      }),
    );
    await page.clock.setFixedTime(at('2026-11-24'));
    await page.goto('/');
    await expect(page.getByTestId('dusty-sets')).toContainText('Our Solar System');
    await expect(page.getByTestId('dusty-sets')).toContainText('14 days ago');
    await expect(page.getByTestId('continue')).toContainText('Our Solar System');
    await expect(page.getByTestId('fresh-sets')).not.toContainText('Our Solar System');
  });

  test('a never-opened set is a fresh pick', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('fresh-sets')).toContainText('Our Solar System');
  });

  test('the heatmap is keyboard navigable', async ({ page }) => {
    await page.clock.setFixedTime(at('2026-11-24'));
    await page.goto('/stats');
    const today = page.locator('[data-day="2026-11-24"]');
    await expect(today).toHaveAttribute('tabindex', '0');
    await today.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-day="2026-11-17"]')).toBeFocused();
    await expect(page.getByTestId('heatmap-detail')).toContainText('no activity');
  });
});

test.describe('Still learning', () => {
  test('cards marked "still learning" can be studied on their own', async ({ page }) => {
    await page.goto(`/sets/${SET}/study`);
    await expect(page.getByTestId('study-position')).toHaveText('1 / 8');
    await page.keyboard.press('Space');
    await page.keyboard.press('1'); // still learning: Mercury
    await expect(page.getByTestId('study-position')).toHaveText('2 / 8');

    await page.goto(`/sets/${SET}`);
    await page.getByTestId('study-learning').click();
    await expect(page.getByTestId('study-position')).toHaveText('1 / 1');
    await expect(page.getByTestId('card-front')).toContainText('closest to the Sun');
  });
});

test.describe('Settings', () => {
  test('daily goal, export, bad import and reset', async ({ page }) => {
    await page.goto('/settings');
    await page.getByTestId('goal-input').fill('20');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('today-points')).toHaveText('0/20');

    const download = page.waitForEvent('download');
    await page.getByTestId('export').click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^flashcards-progress-\d{4}-\d{2}-\d{2}\.json$/);

    await page.getByTestId('import').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"app":"something-else"}'),
    });
    await expect(page.getByRole('alert')).toContainText("isn't a Learning Flashcards");
    await expect(page.getByTestId('today-points')).toHaveText('0/20');

    await page.getByRole('button', { name: 'Reset all progress…' }).click();
    await page.getByTestId('confirm-reset').click();
    await expect(page.getByTestId('today-points')).toHaveText('0/50');
  });
});
