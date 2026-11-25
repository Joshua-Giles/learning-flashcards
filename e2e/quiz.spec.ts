import { Page, expect, test } from '@playwright/test';

/** Sample-set answers by prompt fragment (quiz order is shuffled). */
const ANSWERS: [RegExp, string][] = [
  [/closest to the Sun/, 'Mercury'],
  [/hottest/, 'Venus'],
  [/largest planet/, 'Jupiter'],
  [/Red Planet/, 'Mars'],
  [/ring system/, 'Saturn'],
  [/rotates on its side/, 'Uranus'],
  [/farthest planet/, 'Neptune'],
  [/dwarf planet/, 'Pluto'],
];

async function currentAnswer(page: Page): Promise<string> {
  const prompt = (await page.locator('#quiz-prompt').textContent()) ?? '';
  const hit = ANSWERS.find(([re]) => re.test(prompt));
  if (!hit) throw new Error(`Unknown prompt: ${prompt}`);
  return hit[1];
}

/** Press Enter on the feedback panel and wait until question `n` is showing. */
async function nextQuestion(page: Page, n: number) {
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('quiz-position')).toHaveText(`${n} / 8`);
}

/** Introduce a one-letter typo (swap the 2nd and 3rd letters). */
const typo = (s: string) => s[0] + s[2] + s[1] + s.slice(3);

test.describe('Quiz mode', () => {
  test('keyboard-only quiz: correct, typo accepted as close, override, results', async ({
    page,
  }) => {
    await page.goto('/sets/sample-solar-system/quiz');
    await page.getByTestId('start-all').click();
    await expect(page.getByTestId('quiz-position')).toHaveText('1 / 8');
    const input = page.getByTestId('answer-input');
    await expect(input).toBeFocused();

    // 1) correct, lowercase
    await input.fill((await currentAnswer(page)).toLowerCase());
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-outcome', 'correct');
    await nextQuestion(page, 2); // focus is on the Next button
    await expect(input).toBeFocused();

    // 2) typo → close → accept with A
    await input.fill(typo(await currentAnswer(page)));
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-result', 'close');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-outcome', 'wrong');
    await page.keyboard.press('a');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-outcome', 'close');
    await nextQuestion(page, 3);

    // 3) wrong → "I was right" with R
    await input.fill('Pizza');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-outcome', 'wrong');
    await page.keyboard.press('r');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-outcome', 'override');
    await nextQuestion(page, 4);
    await expect(page.getByTestId('combo')).toHaveText('🔥 3');

    // 4) wrong, left wrong
    await input.fill('Pizza');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-outcome', 'wrong');
    await nextQuestion(page, 5);

    // 5–8) correct
    for (let n = 5; n <= 8; n++) {
      await input.fill(await currentAnswer(page));
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('feedback')).toHaveAttribute('data-outcome', 'correct');
      if (n < 8) await nextQuestion(page, n + 1);
      else await page.keyboard.press('Enter');
    }

    await expect(page.getByTestId('quiz-results')).toBeVisible();
    await expect(page.getByTestId('accuracy')).toContainText('88'); // 7 / 8
    await expect(page.getByTestId('missed-list').locator('li')).toHaveCount(1);

    await page.getByTestId('retry-missed').click();
    await expect(page.getByTestId('quiz-position')).toHaveText('1 / 1');
  });

  test('a leading article is ignored', async ({ page }) => {
    await page.goto('/sets/sample-solar-system/quiz');
    await page.getByTestId('start-all').click();
    await page.getByTestId('answer-input').fill(`the ${await currentAnswer(page)}`);
    await page.getByTestId('check').click();
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-outcome', 'correct');
  });
});
