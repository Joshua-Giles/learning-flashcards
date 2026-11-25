import { DayStats, LocalDay } from '../models/state';
import { addDays, parseLocalDay } from './local-day';

export interface HeatCell {
  day: LocalDay;
  points: number;
  goalMet: boolean;
  /** 0 = nothing, 1 = some, 2 = over half the goal, 3 = goal met, 4 = double the goal. */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/**
 * Grid of the last `weeks` weeks, GitHub style: `rows[weekday][week]`,
 * Sunday-first, with the current week as the last column.
 */
export function buildHeatmap(
  days: Readonly<Record<LocalDay, DayStats>>,
  today: LocalDay,
  goal: number,
  weeks = 26,
): HeatCell[][] {
  const weekday = parseLocalDay(today).getDay();
  const start = addDays(today, -(weekday + 7 * (weeks - 1)));
  const rows: HeatCell[][] = Array.from({ length: 7 }, () => []);

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      const stats = days[day];
      const points = stats?.points ?? 0;
      const level: HeatCell['level'] =
        points === 0
          ? 0
          : points >= goal * 2
            ? 4
            : stats?.goalMet || points >= goal
              ? 3
              : points >= goal / 2
                ? 2
                : 1;
      rows[d].push({ day, points, goalMet: stats?.goalMet ?? false, level, future: day > today });
    }
  }
  return rows;
}
