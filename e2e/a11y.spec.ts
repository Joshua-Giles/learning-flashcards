import AxeBuilder from '@axe-core/playwright';
import { Page, expect, test } from '@playwright/test';
import { answerCorrectly } from './helpers';

/**
 * Automated WCAG 2.2 AA smoke test (axe-core) on every route and key state, in
 * both themes. Automated checks are not proof of conformance; see SPEC.md for the
 * manual keyboard / screen-reader checklist.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map(
    (v) =>
      `${v.impact} ${v.id}: ${v.help}\n` +
      v.nodes
        .slice(0, 3)
        .map((n) => `    ${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1]?.trim()}`)
        .join('\n'),
  );
  expect(summary, `${label}\n${summary.join('\n')}`).toEqual([]);
}

const SET = 'sample-solar-system';

for (const theme of ['light', 'dark'] as const) {
  test.describe(`axe (${theme} theme)`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('lf:theme', t), theme);
      await page.emulateMedia({ reducedMotion: 'reduce' }); // settle animations for stable checks
    });

    for (const path of ['/', '/stats', '/settings', '/questions']) {
      test(`page ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoViolations(page, `${theme} ${path}`);
      });
    }

    test('set overview and study (front, back, summary)', async ({ page }) => {
      await page.goto(`/sets/${SET}`);
      await expect(page.getByTestId('set-progress')).toBeVisible();
      await expectNoViolations(page, `${theme} set overview`);

      await page.goto(`/sets/${SET}/study`);
      await expect(page.getByTestId('study-position')).toHaveText('1 / 8');
      await expectNoViolations(page, `${theme} study front`);
      await page.keyboard.press('Space');
      await expect(page.getByTestId('grade-knew')).toBeVisible();
      // Reduced motion crossfades the faces; scan only once the answer is fully opaque,
      // otherwise axe measures half-transparent text mid-fade (flaky in CI).
      await expect(page.getByTestId('card-back')).toHaveCSS('opacity', '1');
      await expect(page.getByTestId('card-front')).toHaveCSS('opacity', '0');
      await expectNoViolations(page, `${theme} study back`);
      await page.keyboard.press('2'); // grade the flipped first card
      for (let i = 0; i < 7; i++) {
        await page.keyboard.press('Space');
        await page.keyboard.press('2');
      }
      await expect(page.getByTestId('study-summary')).toBeVisible();
      await expectNoViolations(page, `${theme} study summary`);
    });

    test('quiz (start, feedback, results)', async ({ page }) => {
      await page.goto(`/sets/${SET}/quiz`);
      await expect(page.getByTestId('start-all')).toBeVisible();
      await expectNoViolations(page, `${theme} quiz start`);

      await page.getByTestId('start-all').click();
      await page.getByTestId('answer-input').fill('Pizza');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('feedback')).toBeVisible();
      await expectNoViolations(page, `${theme} quiz feedback`);

      await page.getByTestId('next').click();
      await expect(page.getByTestId('quiz-position')).toHaveText('2 / 8');
      await answerCorrectly(page, 7);
      await expect(page.getByTestId('quiz-results')).toBeVisible();
      await expectNoViolations(page, `${theme} quiz results`);
    });

    test('search and capture dialogs', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId('search-open')).toBeVisible();
      await page.keyboard.press('Control+k');
      await page.getByTestId('search-input').fill('mars');
      await expect(page.getByTestId('search-result').first()).toBeVisible();
      await expectNoViolations(page, `${theme} search dialog`);
      await page.keyboard.press('Escape');

      await page.goto(`/sets/${SET}/study`);
      await expect(page.getByTestId('study-position')).toHaveText('1 / 8');
      await page.keyboard.press('?');
      await expect(page.getByTestId('capture-text')).toBeFocused();
      await expectNoViolations(page, `${theme} capture dialog`);
    });

    test('mobile drawer open', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto('/');
      await page.getByTestId('sidebar-toggle').click();
      await expect(page.getByTestId('sidebar')).toBeVisible();
      await expectNoViolations(page, `${theme} mobile drawer`);
    });
  });
}

test.describe('Reduced motion', () => {
  test('cards crossfade instead of rotating, and no confetti canvas appears', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/sets/${SET}/study`);
    await expect(page.getByTestId('study-position')).toHaveText('1 / 8');
    await page.keyboard.press('Space');
    await expect(page.locator('lf-flip-card')).toHaveClass(/flipped/);
    const transform = await page
      .locator('lf-flip-card .card')
      .evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toBe('none');
    await expect(page.getByTestId('card-back')).toHaveCSS('opacity', '1');

    // A first full study pass triggers rewards; the celebration must stay still.
    await page.keyboard.press('2');
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Space');
      await page.keyboard.press('2');
    }
    await expect(page.getByTestId('study-summary')).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});
