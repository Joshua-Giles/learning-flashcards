import { Card } from '../../core/models/set';
import { seededRng } from '../../core/logic/shuffle';
import { QuizSession } from './quiz-session';

function makeCards(n: number): Card[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `c${i + 1}`,
    prompt: `Question ${i + 1}?`,
    answer: `answer${i + 1}`,
    hint: 'a hint',
  }));
}

const fixed: Card[] = [
  { id: 'a', prompt: 'Good morning?', answer: 'Buongiorno', hint: 'buon…' },
  { id: 'b', prompt: 'Why?', answer: 'Perché' },
  { id: 'c', prompt: 'Explain', answer: 'long', quizzable: false },
  { id: 'd', prompt: 'Red planet?', answer: 'Mars' },
];

function started(cards = fixed, limit?: number) {
  const s = new QuizSession();
  s.start(cards, { shuffle: false, limit });
  return s;
}

describe('QuizSession', () => {
  it('skips non-quizzable cards', () => {
    const s = started();
    expect(s.deck().map((c) => c.id)).toEqual(['a', 'b', 'd']);
  });

  it('limits the deck for a quick quiz and shuffles with an injected rng', () => {
    const s = new QuizSession();
    s.start(makeCards(25), { limit: 10, rng: seededRng(1) });
    expect(s.total()).toBe(10);
    expect(new Set(s.deck().map((c) => c.id)).size).toBe(10);
  });

  it('records a correct answer', () => {
    const s = started();
    s.submit('buongiorno');
    expect(s.currentRecord()).toMatchObject({ outcome: 'correct', typed: 'buongiorno' });
    expect(s.currentRecord()?.match.result).toBe('correct');
  });

  it('ignores a second submit for the same card', () => {
    const s = started();
    s.submit('nope');
    s.submit('buongiorno');
    expect(s.currentRecord()?.outcome).toBe('wrong');
  });

  it('a close answer counts as wrong until accepted', () => {
    const s = started();
    s.submit('Buongorno');
    expect(s.currentRecord()?.match.result).toBe('close');
    expect(s.currentRecord()?.outcome).toBe('wrong');

    s.acceptClose();
    expect(s.currentRecord()?.outcome).toBe('close');
  });

  it('"I was right" overrides a wrong answer, but not a correct one', () => {
    const s = started();
    s.submit('Ciao');
    s.override();
    expect(s.currentRecord()?.outcome).toBe('override');

    const t = started();
    t.submit('buongiorno');
    t.override();
    expect(t.currentRecord()?.outcome).toBe('correct');
  });

  it('acceptClose does nothing for a plain wrong answer', () => {
    const s = started();
    s.submit('Ciao');
    s.acceptClose();
    expect(s.currentRecord()?.outcome).toBe('wrong');
  });

  it('hints are only available before answering and are recorded', () => {
    const s = started();
    s.showHint();
    s.submit('buongiorno');
    expect(s.currentRecord()?.hintUsed).toBe(true);

    s.next();
    s.showHint(); // card b has no hint
    expect(s.hintShown()).toBe(false);
  });

  it('next requires an answer first, then moves on and resets the hint', () => {
    const s = started();
    s.next();
    expect(s.current()?.id).toBe('a');
    s.showHint();
    s.submit('x');
    s.next();
    expect(s.current()?.id).toBe('b');
    expect(s.hintShown()).toBe(false);
  });

  it('tracks the current combo and the best combo', () => {
    const s = started(makeCards(6));
    const answers = ['answer1', 'answer2', 'nope', 'answer4', 'answer5', 'answer6'];
    answers.forEach((a, i) => {
      s.submit(a);
      if (i === 2) {
        expect(s.combo()).toBe(0);
      }
      s.next();
    });
    expect(s.bestCombo()).toBe(3);
    expect(s.combo()).toBe(3);
  });

  it('an override restores the combo', () => {
    const s = started(makeCards(3));
    s.submit('answer1');
    s.next();
    s.submit('wrong');
    expect(s.combo()).toBe(0);
    s.override();
    expect(s.combo()).toBe(2);
  });

  it('finishes after the last card with results', () => {
    const s = started();
    s.submit('buongiorno'); // correct
    s.next();
    s.submit('perche'); // correct (accent only)
    s.next();
    s.submit('Venus'); // wrong
    s.next();

    expect(s.finished()).toBe(true);
    expect(s.results()).toMatchObject({
      total: 3,
      correct: 2,
      close: 0,
      override: 0,
      wrong: 1,
      accuracy: 67,
      bestCombo: 2,
    });
    expect(s.results().missedCards.map((c) => c.id)).toEqual(['d']);
  });
});
