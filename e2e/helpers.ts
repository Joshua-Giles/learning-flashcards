import { Page, expect } from '@playwright/test';

/** Sample-set answers by prompt fragment (quiz order varies). */
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

export async function currentAnswer(page: Page): Promise<string> {
  const prompt = (await page.locator('#quiz-prompt').textContent()) ?? '';
  const hit = ANSWERS.find(([re]) => re.test(prompt));
  if (!hit) throw new Error(`Unknown prompt: ${prompt}`);
  return hit[1];
}

/** Answer `count` sample-set quiz questions correctly, starting from the current one. */
export async function answerCorrectly(page: Page, count: number) {
  const input = page.getByTestId('answer-input');
  for (let i = 0; i < count; i++) {
    const position = await page.getByTestId('quiz-position').textContent();
    await input.fill(await currentAnswer(page));
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('feedback')).toHaveAttribute('data-outcome', 'correct');
    await page.keyboard.press('Enter');
    // Wait for the next question (or the results screen) before continuing.
    await expect(
      page.getByTestId('quiz-position').or(page.getByTestId('quiz-results')),
    ).not.toHaveText(position ?? '');
  }
}

/** Seed `lf:state` once per test (not again on reload). */
export async function seedState(page: Page, state: unknown) {
  await page.addInitScript((json) => {
    if (!sessionStorage.getItem('lf:seeded')) {
      localStorage.setItem('lf:state', json);
      sessionStorage.setItem('lf:seeded', '1');
    }
  }, JSON.stringify(state));
}

export function stateWith(partial: Record<string, unknown>) {
  return {
    version: 1,
    settings: { dailyGoal: 50 },
    cards: {},
    sets: {},
    days: {},
    ...partial,
  };
}
