import { POINTS, comboBonus, quizAnswerPoints } from './scoring';

describe('scoring', () => {
  it.each([
    ['correct', false, 10],
    ['close', false, 7],
    ['override', false, 5],
    ['wrong', false, 0],
    ['correct', true, 7],
    ['close', true, 4],
    ['override', true, 2],
    ['wrong', true, 0],
  ] as const)('%s (hint: %s) → %i points', (outcome, hint, points) => {
    expect(quizAnswerPoints(outcome, hint)).toBe(points);
  });

  it('awards a combo bonus on every 5th consecutive right answer', () => {
    expect([0, 1, 4, 5, 6, 9, 10, 15].map(comboBonus)).toEqual([0, 0, 0, 5, 0, 0, 5, 5]);
  });

  it('keeps the spec point values', () => {
    expect(POINTS).toMatchObject({ studyKnew: 2, firstCompletion: 25, setMastered: 100 });
  });
});
