/** Point values from SPEC.md F5. Changing these is an "Ask first" change. */
export const POINTS = {
  studyKnew: 2,
  quizCorrect: 10,
  quizClose: 7,
  quizOverride: 5,
  hintPenalty: 3,
  comboBonus: 5,
  comboEvery: 5,
  firstCompletion: 25,
  setMastered: 100,
} as const;

export type QuizOutcomeKind = 'correct' | 'close' | 'override' | 'wrong';

/** Points for one quiz answer (never negative). */
export function quizAnswerPoints(outcome: QuizOutcomeKind, hintUsed: boolean): number {
  const base = {
    correct: POINTS.quizCorrect,
    close: POINTS.quizClose,
    override: POINTS.quizOverride,
    wrong: 0,
  }[outcome];
  if (base === 0) return 0;
  return Math.max(0, base - (hintUsed ? POINTS.hintPenalty : 0));
}

/** Bonus earned when a right answer brings the running combo to `combo` (every 5th in a row). */
export function comboBonus(combo: number): number {
  return combo > 0 && combo % POINTS.comboEvery === 0 ? POINTS.comboBonus : 0;
}
