import { DayStats, LocalDay } from '../models/state';
import { addDays, daysBetween } from './local-day';

export interface StreakInfo {
  /** Consecutive goal-met days ending today, or yesterday if today isn't met yet. */
  current: number;
  longest: number;
  todayMet: boolean;
  /** Streak is alive but today's goal isn't met yet. */
  atRisk: boolean;
}

/** Streaks count local days on which the daily goal was reached (`goalMet`). */
export function computeStreak(
  days: Readonly<Record<LocalDay, DayStats>>,
  today: LocalDay,
): StreakInfo {
  const met = (day: LocalDay) => days[day]?.goalMet === true;
  const todayMet = met(today);

  let current = 0;
  let cursor = todayMet ? today : addDays(today, -1);
  while (met(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const metDays = Object.keys(days).filter(met).sort();
  let longest = 0;
  let run = 0;
  let prev: LocalDay | undefined;
  for (const day of metDays) {
    run = prev && daysBetween(prev, day) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }

  return {
    current,
    longest: Math.max(longest, current),
    todayMet,
    atRisk: current > 0 && !todayMet,
  };
}
