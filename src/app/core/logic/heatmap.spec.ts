import { buildHeatmap } from './heatmap';

describe('buildHeatmap', () => {
  // 2026-11-24 is a Tuesday.
  const grid = buildHeatmap(
    {
      '2026-11-24': { points: 120, cardsReviewed: 10, goalMet: true },
      '2026-11-23': { points: 60, cardsReviewed: 5, goalMet: true },
      '2026-11-22': { points: 30, cardsReviewed: 3, goalMet: false },
      '2026-11-21': { points: 10, cardsReviewed: 1, goalMet: false },
    },
    '2026-11-24',
    50,
  );

  it('is 7 weekday rows by 26 week columns', () => {
    expect(grid.length).toBe(7);
    expect(grid.every((row) => row.length === 26)).toBe(true);
  });

  it('ends with the current week, Sunday first', () => {
    expect(grid[0][25].day).toBe('2026-11-22'); // Sunday
    expect(grid[2][25].day).toBe('2026-11-24'); // Tuesday = today
    expect(grid[3][25]).toMatchObject({ day: '2026-11-25', future: true });
    expect(grid[0][0].day).toBe('2026-05-31');
  });

  it('assigns intensity levels relative to the goal', () => {
    expect(grid[2][25].level).toBe(4); // ≥ 2× goal
    expect(grid[1][25].level).toBe(3); // goal met
    expect(grid[0][25].level).toBe(2); // ≥ half
    expect(grid[6][24].level).toBe(1); // some (Sat 21st)
    expect(grid[5][24].level).toBe(0); // none
  });
});
