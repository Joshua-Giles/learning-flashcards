import { DayStats } from '../models/state';
import { computeStreak } from './streak';

const met = (points = 60): DayStats => ({ points, cardsReviewed: 5, goalMet: true });
const missed = (points = 10): DayStats => ({ points, cardsReviewed: 1, goalMet: false });

describe('computeStreak', () => {
  it('is zero with no history', () => {
    expect(computeStreak({}, '2026-11-24')).toEqual({
      current: 0,
      longest: 0,
      todayMet: false,
      atRisk: false,
    });
  });

  it('counts consecutive met days ending today', () => {
    const days = { '2026-11-22': met(), '2026-11-23': met(), '2026-11-24': met() };
    expect(computeStreak(days, '2026-11-24')).toMatchObject({
      current: 3,
      todayMet: true,
      atRisk: false,
    });
  });

  it("keeps yesterday's streak alive (at risk) until today is met", () => {
    const days = { '2026-11-22': met(), '2026-11-23': met(), '2026-11-24': missed() };
    expect(computeStreak(days, '2026-11-24')).toMatchObject({
      current: 2,
      todayMet: false,
      atRisk: true,
    });
  });

  it('resets to 0 after a missed day', () => {
    const days = { '2026-11-21': met(), '2026-11-22': met() }; // nothing on the 23rd
    expect(computeStreak(days, '2026-11-24')).toMatchObject({
      current: 0,
      longest: 2,
      atRisk: false,
    });
  });

  it('a day with points below the goal breaks the streak', () => {
    const days = { '2026-11-22': met(), '2026-11-23': missed(), '2026-11-24': met() };
    expect(computeStreak(days, '2026-11-24').current).toBe(1);
  });

  it('tracks the longest streak ever, across month boundaries and DST', () => {
    const days = {
      '2026-10-30': met(),
      '2026-10-31': met(),
      '2026-11-01': met(), // US DST ends
      '2026-11-02': met(),
      '2026-11-10': met(),
    };
    expect(computeStreak(days, '2026-11-24')).toMatchObject({ current: 0, longest: 4 });
  });

  it('streak crossing midnight: yesterday met counts once today is met too', () => {
    const days = { '2026-11-23': met() };
    expect(computeStreak(days, '2026-11-24').current).toBe(1);
    expect(computeStreak({ ...days, '2026-11-24': met() }, '2026-11-24').current).toBe(2);
  });
});
