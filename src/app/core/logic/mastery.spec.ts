import { Card } from '../models/set';
import { CardProgress } from '../models/state';
import {
  applyQuizResult,
  applyStudyGrade,
  approxSetMasteryPct,
  isSetMastered,
  orderWeakestFirst,
  setMasteryPct,
  stillLearning,
} from './mastery';
import { seededRng } from './shuffle';

const D1 = '2026-11-20';
const D2 = '2026-11-21';
const D3 = '2026-11-22';

const at = (box: CardProgress['box'], extra: Partial<CardProgress> = {}): CardProgress => ({
  box,
  lastSeen: D1,
  last: 'right',
  timesRight: 0,
  timesWrong: 0,
  ...extra,
});

describe('applyQuizResult', () => {
  it('creates progress for a new card and promotes it', () => {
    expect(applyQuizResult(undefined, true, D1)).toEqual({
      box: 1,
      lastSeen: D1,
      lastPromoted: D1,
      last: 'right',
      timesRight: 1,
      timesWrong: 0,
    });
  });

  it('promotes at most once per card per day', () => {
    const once = applyQuizResult(undefined, true, D1);
    const twice = applyQuizResult(once, true, D1);
    expect(twice.box).toBe(1);
    expect(twice.timesRight).toBe(2);

    const nextDay = applyQuizResult(twice, true, D2);
    expect(nextDay.box).toBe(2);
  });

  it('needs right answers on separate days to reach mastery (box 4)', () => {
    let p: CardProgress | undefined;
    for (const day of [D1, D1, D2, D2, D3]) p = applyQuizResult(p, true, day);
    expect(p!.box).toBe(3);
    p = applyQuizResult(p, true, '2026-11-23');
    expect(p.box).toBe(4);
  });

  it('caps at box 5', () => {
    expect(applyQuizResult(at(5, { lastPromoted: D1 }), true, D2).box).toBe(5);
  });

  it('a wrong answer drops to box 1 (and never raises box 0)', () => {
    expect(applyQuizResult(at(4), false, D2)).toMatchObject({
      box: 1,
      last: 'wrong',
      timesWrong: 1,
    });
    expect(applyQuizResult(undefined, false, D1).box).toBe(0);
  });
});

describe('applyStudyGrade', () => {
  it('"knew it" lifts a card only up to box 2', () => {
    let p = applyStudyGrade(undefined, true, D1);
    expect(p.box).toBe(1);
    p = applyStudyGrade(p, true, D1);
    expect(p.box).toBe(2);
    p = applyStudyGrade(p, true, D1);
    expect(p.box).toBe(2);
    expect(p.timesRight).toBe(3);
  });

  it('does not use up the quiz promotion for the day', () => {
    const studied = applyStudyGrade(at(1), true, D2);
    expect(applyQuizResult(studied, true, D2).box).toBe(3);
  });

  it('"still learning" never demotes but marks the card', () => {
    expect(applyStudyGrade(at(3), false, D2)).toMatchObject({
      box: 3,
      last: 'wrong',
      timesWrong: 1,
    });
  });
});

describe('set mastery', () => {
  const progress = {
    's/a': at(4),
    's/b': at(5),
    's/c': at(3),
    's/d': at(4),
    'other/a': at(5),
  };

  it('computes the % of quizzable cards at box ≥ 4', () => {
    expect(setMasteryPct('s', ['a', 'b', 'c', 'd'], progress)).toBe(75);
    expect(setMasteryPct('s', [], progress)).toBe(0);
  });

  it('a set is mastered at ≥ 90%', () => {
    expect(isSetMastered(89)).toBe(false);
    expect(isSetMastered(90)).toBe(true);
  });

  it('approximates from the manifest count (capped at 100)', () => {
    expect(approxSetMasteryPct('s', 4, progress)).toBe(75);
    expect(approxSetMasteryPct('s', 2, progress)).toBe(100);
    expect(approxSetMasteryPct('s', 0, progress)).toBe(0);
  });
});

describe('ordering and filters', () => {
  const cards: Card[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, prompt: id, answer: id }));
  const progress = {
    's/a': at(3, { lastSeen: D1 }),
    's/b': at(1, { lastSeen: D2, last: 'wrong' }),
    's/c': at(1, { lastSeen: D1, last: 'wrong' }),
    // d never seen
  };

  it('orders never-seen first, then by box, then least recently seen', () => {
    expect(orderWeakestFirst('s', cards, progress, seededRng(3)).map((c) => c.id)).toEqual([
      'd',
      'c',
      'b',
      'a',
    ]);
  });

  it('lists cards whose latest result was wrong', () => {
    expect(stillLearning('s', cards, progress).map((c) => c.id)).toEqual(['b', 'c']);
  });
});
