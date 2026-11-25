import { SetSummary } from '../models/set';
import { SetProgress } from '../models/state';
import { bestSets, continueSet, freshPicks, gatheringDust, masteredSets } from './leaderboard';

const set = (id: string): SetSummary => ({
  id,
  title: id,
  description: '',
  category: 'C',
  emoji: '·',
  tags: [],
  version: 1,
  updated: '2026-11-01',
  cardCount: 10,
  quizzableCount: 10,
});

const prog = (extra: Partial<SetProgress>): SetProgress => ({
  firstOpened: '2026-11-01',
  lastStudied: '2026-11-20',
  lastActivityAt: '2026-11-20T10:00:00.000Z',
  totalPoints: 0,
  studyPasses: 0,
  quizzesCompleted: 0,
  ...extra,
});

const sets = ['a', 'b', 'c', 'd', 'e'].map(set);
const progress: Record<string, SetProgress> = {
  a: prog({
    bestAccuracy: 80,
    totalPoints: 100,
    lastStudied: '2026-11-24',
    lastActivityAt: '2026-11-24T09:00:00.000Z',
  }),
  b: prog({
    bestAccuracy: 95,
    totalPoints: 50,
    masteredOn: '2026-11-10',
    lastStudied: '2026-11-10',
  }),
  c: prog({
    bestAccuracy: 80,
    totalPoints: 300,
    masteredOn: '2026-11-20',
    lastStudied: '2026-11-17',
  }),
  d: prog({ lastStudied: '2026-11-01', lastActivityAt: '2026-11-24T20:00:00.000Z' }),
  // e never opened
};
const TODAY = '2026-11-24';

describe('leaderboard selectors', () => {
  it('ranks best sets by accuracy, then total points', () => {
    expect(bestSets(sets, progress).map((r) => r.set.id)).toEqual(['b', 'c', 'a']);
  });

  it('lists mastered sets, newest first', () => {
    expect(masteredSets(sets, progress).map((r) => r.set.id)).toEqual(['c', 'b']);
  });

  it('gathering dust: ≥ 7 days since studied, stalest first', () => {
    expect(gatheringDust(sets, progress, TODAY).map((r) => [r.set.id, r.daysAgo])).toEqual([
      ['d', 23],
      ['b', 14],
      ['c', 7],
    ]);
  });

  it('fresh picks are sets never opened', () => {
    expect(freshPicks(sets, progress).map((s) => s.id)).toEqual(['e']);
  });

  it('continue = most recent activity timestamp', () => {
    expect(continueSet(sets, progress)?.set.id).toBe('d');
    expect(continueSet(sets, {})).toBeUndefined();
  });

  it('ignores progress for sets no longer in the manifest', () => {
    expect(bestSets([set('a')], progress).map((r) => r.set.id)).toEqual(['a']);
  });
});
