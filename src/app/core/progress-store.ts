import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { Clock } from './clock';
import { applyQuizResult, applyStudyGrade, isSetMastered, setMasteryPct } from './logic/mastery';
import { POINTS, QuizOutcomeKind, comboBonus, quizAnswerPoints } from './logic/scoring';
import { computeStreak } from './logic/streak';
import { AppState, DayStats, SetProgress, cardKey } from './models/state';
import { StorageService } from './storage.service';

/** What a recorded action earned, so pages can show points and celebrate. */
export interface Award {
  points: number;
  /** Today's daily goal was reached by this action. */
  goalJustMet: boolean;
  /** This action pushed the set past the mastery threshold. */
  setMastered: boolean;
  /** First full study pass or full quiz of the set (+25). */
  firstCompletion: boolean;
  /** A full-set quiz beat the previous best accuracy. */
  personalBest: boolean;
}

const NO_AWARD: Award = {
  points: 0,
  goalJustMet: false,
  setMastered: false,
  firstCompletion: false,
  personalBest: false,
};

const EMPTY_DAY: DayStats = { points: 0, cardsReviewed: 0, goalMet: false };

/**
 * Records study/quiz activity into the persisted state: per-card mastery, points,
 * the daily ledger (goal + streak) and per-set bests. All rules live in core/logic.
 */
@Injectable({ providedIn: 'root' })
export class ProgressStore {
  private readonly storage = inject(StorageService);
  private readonly clock = inject(Clock);

  /** Current local day; refreshed on focus/visibility and every minute (midnight rollover). */
  readonly today = signal(this.clock.today());

  readonly state = this.storage.state;
  readonly cards = computed(() => this.state().cards);
  readonly sets = computed(() => this.state().sets);
  readonly days = computed(() => this.state().days);
  readonly dailyGoal = computed(() => this.state().settings.dailyGoal);
  readonly todayStats = computed(() => this.days()[this.today()] ?? EMPTY_DAY);
  readonly streak = computed(() => computeStreak(this.days(), this.today()));
  readonly goalPct = computed(() =>
    Math.min(100, Math.round((this.todayStats().points / this.dailyGoal()) * 100)),
  );

  constructor() {
    const win = inject(DOCUMENT).defaultView;
    const refresh = () => this.refreshToday();
    win?.addEventListener('focus', refresh);
    win?.document.addEventListener('visibilitychange', refresh);
    win?.setInterval(refresh, 60_000);
  }

  refreshToday(): void {
    const today = this.clock.today();
    if (today !== this.today()) this.today.set(today);
  }

  setProgress(setId: string): SetProgress | undefined {
    return this.sets()[setId];
  }

  setDailyGoal(goal: number): void {
    const dailyGoal = Math.max(1, Math.min(10_000, Math.round(goal)));
    this.storage.update((s) => {
      const today = this.today();
      const day = s.days[today];
      // Raising the goal never un-meets a day; lowering it can complete today.
      const days =
        day && !day.goalMet && day.points >= dailyGoal
          ? { ...s.days, [today]: { ...day, goalMet: true } }
          : s.days;
      return { ...s, settings: { ...s.settings, dailyGoal }, days };
    });
  }

  /** A "knew it" / "still learning" grade in study mode. */
  recordStudyGrade(setId: string, cardId: string, knew: boolean): Award {
    return this.mutate(setId, (s, today) => {
      const key = cardKey(setId, cardId);
      s.cards = { ...s.cards, [key]: applyStudyGrade(s.cards[key], knew, today) };
      return { points: knew ? POINTS.studyKnew : 0, reviewed: 1 };
    });
  }

  /** A study pass reached the end. `full` = every card in the set was graded. */
  recordStudyPass(setId: string, full: boolean): Award {
    return this.mutate(setId, (s, today) => {
      const set = s.sets[setId];
      const firstCompletion = full && !set.completedOn;
      s.sets = {
        ...s.sets,
        [setId]: {
          ...set,
          studyPasses: set.studyPasses + 1,
          ...(firstCompletion ? { completedOn: today } : {}),
        },
      };
      return { points: firstCompletion ? POINTS.firstCompletion : 0, firstCompletion };
    });
  }

  /**
   * A final quiz outcome for one card (recorded when moving on, so accept/override count).
   * `combo` is the running streak including this answer; `quizzableIds` lets us check
   * whether the set just became mastered.
   */
  recordQuizAnswer(args: {
    setId: string;
    cardId: string;
    outcome: QuizOutcomeKind;
    hintUsed: boolean;
    combo: number;
    quizzableIds: readonly string[];
  }): Award {
    const { setId, cardId, outcome, hintUsed, combo, quizzableIds } = args;
    return this.mutate(setId, (s, today) => {
      const key = cardKey(setId, cardId);
      const right = outcome !== 'wrong';
      s.cards = { ...s.cards, [key]: applyQuizResult(s.cards[key], right, today) };

      let points = quizAnswerPoints(outcome, hintUsed) + (right ? comboBonus(combo) : 0);
      let setMastered = false;
      const set = s.sets[setId];
      if (!set.masteredOn && isSetMastered(setMasteryPct(setId, quizzableIds, s.cards))) {
        setMastered = true;
        points += POINTS.setMastered;
        s.sets = { ...s.sets, [setId]: { ...set, masteredOn: today } };
      }
      return { points, reviewed: 1, setMastered };
    });
  }

  /** A quiz reached its results screen. `full` = it covered every quizzable card. */
  recordQuizFinish(setId: string, accuracy: number, full: boolean): Award {
    return this.mutate(setId, (s, today) => {
      const set = s.sets[setId];
      const previous = set.bestAccuracy;
      const isBest = full && (previous === undefined || accuracy > previous);
      const firstCompletion = full && !set.completedOn;
      s.sets = {
        ...s.sets,
        [setId]: {
          ...set,
          quizzesCompleted: set.quizzesCompleted + 1,
          ...(isBest ? { bestAccuracy: accuracy, bestAccuracyOn: today } : {}),
          ...(firstCompletion ? { completedOn: today } : {}),
        },
      };
      return {
        points: firstCompletion ? POINTS.firstCompletion : 0,
        firstCompletion,
        personalBest: isBest && previous !== undefined,
      };
    });
  }

  /**
   * Applies a change on a draft copy of the state, touches the set's activity
   * timestamps, then adds points to the day and set ledgers.
   */
  private mutate(
    setId: string,
    change: (
      draft: AppState,
      today: string,
    ) => Partial<Omit<Award, 'goalJustMet'>> & { points: number; reviewed?: number },
  ): Award {
    this.refreshToday();
    const today = this.today();
    const nowIso = this.clock.now().toISOString();
    let award = NO_AWARD;

    this.storage.update((state) => {
      const draft: AppState = { ...state };
      const existing = draft.sets[setId];
      draft.sets = {
        ...draft.sets,
        [setId]: {
          ...(existing ?? {
            firstOpened: today,
            totalPoints: 0,
            studyPasses: 0,
            quizzesCompleted: 0,
          }),
          lastStudied: today,
          lastActivityAt: nowIso,
        } as SetProgress,
      };

      const { points, reviewed = 0, ...flags } = change(draft, today);

      const day = draft.days[today] ?? EMPTY_DAY;
      const dayPoints = day.points + points;
      const goalJustMet = !day.goalMet && dayPoints >= draft.settings.dailyGoal;
      draft.days = {
        ...draft.days,
        [today]: {
          points: dayPoints,
          cardsReviewed: day.cardsReviewed + reviewed,
          goalMet: day.goalMet || goalJustMet,
        },
      };
      const set = draft.sets[setId];
      draft.sets = { ...draft.sets, [setId]: { ...set, totalPoints: set.totalPoints + points } };

      award = { ...NO_AWARD, ...flags, points, goalJustMet };
      return draft;
    });
    return award;
  }
}
