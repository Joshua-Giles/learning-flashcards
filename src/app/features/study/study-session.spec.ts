import { Card } from '../../core/models/set';
import { seededRng } from '../../core/logic/shuffle';
import { StudySession } from './study-session';

const cards: Card[] = ['a', 'b', 'c'].map((id) => ({
  id,
  prompt: `Q ${id}?`,
  answer: `A ${id}`,
  hint: id === 'a' ? 'hint a' : undefined,
}));

function started(options?: Parameters<StudySession['start']>[1]) {
  const s = new StudySession();
  s.start(cards, options);
  return s;
}

describe('StudySession', () => {
  it('starts at the first card, unflipped', () => {
    const s = started();
    expect(s.current()?.id).toBe('a');
    expect(s.position()).toBe(1);
    expect(s.total()).toBe(3);
    expect(s.flipped()).toBe(false);
  });

  it('can start at a specific card', () => {
    expect(started({ startAt: 'c' }).current()?.id).toBe('c');
    expect(started({ startAt: 'missing' }).current()?.id).toBe('a');
  });

  it('only accepts a grade after the card is flipped', () => {
    const s = started();
    s.grade('knew');
    expect(s.gradedCount()).toBe(0);
    expect(s.current()?.id).toBe('a');

    s.flip();
    s.grade('knew');
    expect(s.grades()).toEqual({ a: 'knew' });
    expect(s.current()?.id).toBe('b');
    expect(s.flipped()).toBe(false);
  });

  it('finishes after grading the last card and summarises', () => {
    const s = started();
    for (const grade of ['knew', 'learning', 'knew'] as const) {
      s.flip();
      s.grade(grade);
    }
    expect(s.finished()).toBe(true);
    expect(s.summary()).toMatchObject({ total: 3, knew: 2, learning: 1, skipped: 0 });
    expect(s.summary().learningCards.map((c) => c.id)).toEqual(['b']);
  });

  it('counts skipped cards when you navigate past them', () => {
    const s = started();
    s.next();
    s.next();
    s.flip();
    s.grade('knew');
    expect(s.finished()).toBe(true);
    expect(s.summary()).toMatchObject({ knew: 1, skipped: 2 });
  });

  it('next on the last card finishes; prev on the first does nothing', () => {
    const s = started({ startAt: 'c' });
    s.next();
    expect(s.finished()).toBe(true);

    const t = started();
    t.prev();
    expect(t.current()?.id).toBe('a');
  });

  it('navigation resets the flip and hint', () => {
    const s = started();
    s.showHint();
    expect(s.hintShown()).toBe(true);
    s.flip();
    s.next();
    s.prev();
    expect(s.flipped()).toBe(false);
    expect(s.hintShown()).toBe(false);
  });

  it('only shows a hint when the card has one and is not flipped', () => {
    const s = started({ startAt: 'b' });
    s.showHint();
    expect(s.hintShown()).toBe(false);
  });

  it('shuffles with an injected rng and restart clears grades', () => {
    const s = started({ shuffle: true, rng: seededRng(42) });
    expect(
      s
        .deck()
        .map((c) => c.id)
        .sort(),
    ).toEqual(['a', 'b', 'c']);
    s.flip();
    s.grade('learning');

    s.start(s.summary().learningCards);
    expect(s.total()).toBe(1);
    expect(s.gradedCount()).toBe(0);
    expect(s.finished()).toBe(false);
  });

  it('handles an empty deck safely', () => {
    const s = new StudySession();
    s.start([]);
    s.flip();
    s.next();
    expect(s.current()).toBeUndefined();
    expect(s.finished()).toBe(false);
  });
});
