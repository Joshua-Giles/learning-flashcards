import { TestBed } from '@angular/core/testing';
import { Clock } from './clock';
import { QuizOutcomeKind } from './logic/scoring';
import { ProgressStore } from './progress-store';

class FakeClock extends Clock {
  current = new Date(2026, 10, 24, 10, 0);
  override now() {
    return new Date(this.current);
  }
  setDay(y: number, m: number, d: number, h = 10) {
    this.current = new Date(y, m - 1, d, h);
  }
}

function setup() {
  const clock = new FakeClock();
  TestBed.configureTestingModule({ providers: [{ provide: Clock, useValue: clock }] });
  return { store: TestBed.inject(ProgressStore), clock };
}

const IDS = ['c1', 'c2', 'c3', 'c4', 'c5'];
const quiz = (
  store: ProgressStore,
  cardId: string,
  outcome: QuizOutcomeKind = 'correct',
  combo = 1,
) =>
  store.recordQuizAnswer({
    setId: 's',
    cardId,
    outcome,
    hintUsed: false,
    combo,
    quizzableIds: IDS,
  });

describe('ProgressStore', () => {
  beforeEach(() => localStorage.clear());

  it('awards study points and tracks the day ledger and set activity', () => {
    const { store } = setup();
    expect(store.recordStudyGrade('s', 'c1', true).points).toBe(2);
    expect(store.recordStudyGrade('s', 'c2', false).points).toBe(0);

    expect(store.todayStats()).toEqual({ points: 2, cardsReviewed: 2, goalMet: false });
    expect(store.setProgress('s')).toMatchObject({
      firstOpened: '2026-11-24',
      lastStudied: '2026-11-24',
      totalPoints: 2,
    });
    expect(store.cards()['s/c1']).toMatchObject({ box: 1, last: 'right' });
    expect(store.cards()['s/c2']).toMatchObject({ box: 0, last: 'wrong' });
  });

  it('quiz points include hint penalty and combo bonus', () => {
    const { store } = setup();
    expect(
      store.recordQuizAnswer({
        setId: 's',
        cardId: 'c1',
        outcome: 'correct',
        hintUsed: true,
        combo: 1,
        quizzableIds: IDS,
      }).points,
    ).toBe(7);
    expect(quiz(store, 'c2', 'correct', 5).points).toBe(15); // 10 + combo bonus
    expect(quiz(store, 'c3', 'wrong', 0).points).toBe(0);
  });

  it('flags the moment the daily goal is reached, once', () => {
    const { store } = setup();
    store.setDailyGoal(25);
    expect(quiz(store, 'c1').goalJustMet).toBe(false); // 10
    expect(quiz(store, 'c2').goalJustMet).toBe(false); // 20
    expect(quiz(store, 'c3').goalJustMet).toBe(true); // 30
    expect(quiz(store, 'c4').goalJustMet).toBe(false);
    expect(store.todayStats().goalMet).toBe(true);
    expect(store.goalPct()).toBe(100);
  });

  it('builds a streak across days and resets after a gap', () => {
    const { store, clock } = setup();
    store.setDailyGoal(10);
    quiz(store, 'c1');
    expect(store.streak().current).toBe(1);

    clock.setDay(2026, 11, 25);
    store.refreshToday();
    expect(store.streak()).toMatchObject({ current: 1, atRisk: true });
    quiz(store, 'c2');
    expect(store.streak()).toMatchObject({ current: 2, atRisk: false });

    clock.setDay(2026, 11, 27); // skipped the 26th
    store.refreshToday();
    expect(store.streak()).toMatchObject({ current: 0, longest: 2 });
  });

  it('lowering the goal can complete today; raising it never un-meets', () => {
    const { store } = setup();
    quiz(store, 'c1');
    quiz(store, 'c2'); // 20 pts, goal 50
    store.setDailyGoal(20);
    expect(store.todayStats().goalMet).toBe(true);
    store.setDailyGoal(500);
    expect(store.todayStats().goalMet).toBe(true);
  });

  it('awards the mastery bonus exactly once when ≥ 90% of cards reach box 4', () => {
    const { store, clock } = setup();
    let mastered = 0;
    for (let day = 0; day < 4; day++) {
      clock.setDay(2026, 11, 24 + day);
      for (const id of IDS) {
        const award = quiz(store, id);
        if (award.setMastered) {
          mastered++;
          expect(award.points).toBe(110);
          expect(id).toBe('c5'); // the 5th card on day 4 tips it to 100%
        }
      }
    }
    expect(mastered).toBe(1);
    expect(store.setProgress('s')?.masteredOn).toBe('2026-11-27');

    clock.setDay(2026, 11, 28);
    expect(quiz(store, 'c1').setMastered).toBe(false);
  });

  it('tracks full-quiz bests, first completion and personal bests', () => {
    const { store } = setup();
    quiz(store, 'c1');
    const first = store.recordQuizFinish('s', 60, true);
    expect(first).toMatchObject({ points: 25, firstCompletion: true, personalBest: false });
    expect(store.setProgress('s')).toMatchObject({ bestAccuracy: 60, quizzesCompleted: 1 });

    expect(store.recordQuizFinish('s', 100, false).personalBest).toBe(false); // quick quiz
    expect(store.setProgress('s')?.bestAccuracy).toBe(60);

    const better = store.recordQuizFinish('s', 80, true);
    expect(better).toMatchObject({ points: 0, firstCompletion: false, personalBest: true });
    expect(store.setProgress('s')?.bestAccuracy).toBe(80);
  });

  it('a full study pass counts as the first completion too', () => {
    const { store } = setup();
    expect(store.recordStudyPass('s', false).firstCompletion).toBe(false);
    expect(store.recordStudyPass('s', true)).toMatchObject({ points: 25, firstCompletion: true });
    expect(store.recordQuizFinish('s', 90, true).firstCompletion).toBe(false);
    expect(store.setProgress('s')?.studyPasses).toBe(2);
  });

  it('persists across reloads', () => {
    const { store } = setup();
    quiz(store, 'c1');
    TestBed.resetTestingModule();
    const again = setup().store;
    expect(again.todayStats().points).toBe(10);
    expect(again.cards()['s/c1']?.box).toBe(1);
  });
});
