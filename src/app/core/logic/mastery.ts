import { Card } from '../models/set';
import { CardProgress, LocalDay, MasteryBox, cardKey } from '../models/state';
import { Rng, shuffle } from './shuffle';

export const MASTERED_BOX = 4;
export const STUDY_MAX_BOX = 2;
export const SET_MASTERED_PCT = 90;

const clampBox = (n: number) => Math.max(0, Math.min(5, n)) as MasteryBox;

function base(p: CardProgress | undefined, today: LocalDay): CardProgress {
  return p ?? { box: 0, lastSeen: today, last: 'wrong', timesRight: 0, timesWrong: 0 };
}

/**
 * Quiz answer. Right (correct/close/override) moves up one box, at most once per
 * card per day, so mastery needs recall on separate days. Wrong drops to box 1.
 */
export function applyQuizResult(
  p: CardProgress | undefined,
  right: boolean,
  today: LocalDay,
): CardProgress {
  const cur = base(p, today);
  if (!right) {
    return {
      ...cur,
      box: clampBox(Math.min(cur.box, 1)),
      lastSeen: today,
      last: 'wrong',
      timesWrong: cur.timesWrong + 1,
    };
  }
  const canPromote = cur.lastPromoted !== today;
  return {
    ...cur,
    box: canPromote ? clampBox(cur.box + 1) : cur.box,
    lastSeen: today,
    ...(canPromote ? { lastPromoted: today } : {}),
    last: 'right',
    timesRight: cur.timesRight + 1,
  };
}

/**
 * Study (flip) grade. Recognition is weaker than recall: "knew it" can only lift a
 * card up to box 2, and "still learning" never demotes. Doesn't use the quiz's
 * once-per-day slot, so flipping then quizzing on the same day still counts.
 */
export function applyStudyGrade(
  p: CardProgress | undefined,
  knew: boolean,
  today: LocalDay,
): CardProgress {
  const cur = base(p, today);
  return {
    ...cur,
    box: knew && cur.box < STUDY_MAX_BOX ? clampBox(cur.box + 1) : cur.box,
    lastSeen: today,
    last: knew ? 'right' : 'wrong',
    timesRight: cur.timesRight + (knew ? 1 : 0),
    timesWrong: cur.timesWrong + (knew ? 0 : 1),
  };
}

export const isMastered = (p: CardProgress | undefined) => (p?.box ?? 0) >= MASTERED_BOX;

/** % (0–100, rounded down) of a set's quizzable cards that are mastered. */
export function setMasteryPct(
  setId: string,
  quizzableCardIds: readonly string[],
  cards: Readonly<Record<string, CardProgress>>,
): number {
  if (quizzableCardIds.length === 0) return 0;
  const mastered = quizzableCardIds.filter((id) => isMastered(cards[cardKey(setId, id)])).length;
  return Math.floor((mastered / quizzableCardIds.length) * 100);
}

export const isSetMastered = (pct: number) => pct >= SET_MASTERED_PCT;

/**
 * Mastery % from the manifest's quizzable count when the full set isn't loaded
 * (sidebar rings). Counts mastered progress entries under the set's prefix.
 */
export function approxSetMasteryPct(
  setId: string,
  quizzableCount: number,
  cards: Readonly<Record<string, CardProgress>>,
): number {
  if (quizzableCount <= 0) return 0;
  const prefix = `${setId}/`;
  let mastered = 0;
  for (const [key, p] of Object.entries(cards)) {
    if (key.startsWith(prefix) && isMastered(p)) mastered++;
  }
  return Math.min(100, Math.floor((mastered / quizzableCount) * 100));
}

/** Cards whose most recent grade/answer was wrong ("still learning"). */
export function stillLearning(
  setId: string,
  cards: readonly Card[],
  progress: Readonly<Record<string, CardProgress>>,
): Card[] {
  return cards.filter((c) => progress[cardKey(setId, c.id)]?.last === 'wrong');
}

/**
 * Weakest first: lowest box, then least recently seen (never-seen first).
 * Shuffling before the stable sort randomises order among equals.
 */
export function orderWeakestFirst(
  setId: string,
  cards: readonly Card[],
  progress: Readonly<Record<string, CardProgress>>,
  rng?: Rng,
): Card[] {
  const rank = (c: Card) => {
    const p = progress[cardKey(setId, c.id)];
    return { box: p?.box ?? -1, seen: p?.lastSeen ?? '' };
  };
  return shuffle(cards, rng).sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return ra.box - rb.box || ra.seen.localeCompare(rb.seen);
  });
}
