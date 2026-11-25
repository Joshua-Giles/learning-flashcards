import { SetSummary } from '../models/set';
import { LocalDay, SetProgress } from '../models/state';
import { daysBetween } from './local-day';

export const DUSTY_AFTER_DAYS = 7;

type Progress = Readonly<Record<string, SetProgress>>;

export interface RankedSet {
  set: SetSummary;
  progress: SetProgress;
}

export interface DustySet extends RankedSet {
  daysAgo: number;
}

const withProgress = (sets: readonly SetSummary[], progress: Progress): RankedSet[] =>
  sets.flatMap((set) => (progress[set.id] ? [{ set, progress: progress[set.id] }] : []));

/** Sets with a full-quiz best, highest accuracy first; ties broken by total points. */
export function bestSets(sets: readonly SetSummary[], progress: Progress): RankedSet[] {
  return withProgress(sets, progress)
    .filter((r) => r.progress.bestAccuracy !== undefined)
    .sort(
      (a, b) =>
        b.progress.bestAccuracy! - a.progress.bestAccuracy! ||
        b.progress.totalPoints - a.progress.totalPoints,
    );
}

/** Mastered sets, most recently mastered first. */
export function masteredSets(sets: readonly SetSummary[], progress: Progress): RankedSet[] {
  return withProgress(sets, progress)
    .filter((r) => r.progress.masteredOn)
    .sort((a, b) => b.progress.masteredOn!.localeCompare(a.progress.masteredOn!));
}

/** Studied before but not for ≥ 7 days; stalest first. */
export function gatheringDust(
  sets: readonly SetSummary[],
  progress: Progress,
  today: LocalDay,
): DustySet[] {
  return withProgress(sets, progress)
    .map((r) => ({ ...r, daysAgo: daysBetween(r.progress.lastStudied, today) }))
    .filter((r) => r.daysAgo >= DUSTY_AFTER_DAYS)
    .sort((a, b) => b.daysAgo - a.daysAgo);
}

/** Sets never opened, in manifest order. */
export function freshPicks(sets: readonly SetSummary[], progress: Progress): SetSummary[] {
  return sets.filter((s) => !progress[s.id]);
}

/** The most recently active set, if any. */
export function continueSet(
  sets: readonly SetSummary[],
  progress: Progress,
): RankedSet | undefined {
  return withProgress(sets, progress).sort((a, b) =>
    b.progress.lastActivityAt.localeCompare(a.progress.lastActivityAt),
  )[0];
}
