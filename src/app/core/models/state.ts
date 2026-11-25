/**
 * The persisted learning state (localStorage key `lf:state`). UI preferences
 * (theme, sidebar) intentionally live in their own small keys — see local-prefs.ts.
 *
 * Changing this shape requires a STATE_VERSION bump and a migration
 * (core/logic/state-schema.ts). That is an "Ask first" change per SPEC.md.
 */
export const STATE_VERSION = 1;

/** A calendar day in the user's local time zone: `YYYY-MM-DD`. Never UTC. */
export type LocalDay = string;

/** 0 = new … 5 = rock solid. A card is mastered at box ≥ 4. */
export type MasteryBox = 0 | 1 | 2 | 3 | 4 | 5;

export interface CardProgress {
  box: MasteryBox;
  /** Last day the card was studied or quizzed. */
  lastSeen: LocalDay;
  /** Last day a quiz promoted the card (quiz promotes at most once per day). */
  lastPromoted?: LocalDay;
  /** Outcome of the most recent study grade or quiz answer. */
  last: 'right' | 'wrong';
  timesRight: number;
  timesWrong: number;
}

export interface SetProgress {
  firstOpened: LocalDay;
  lastStudied: LocalDay;
  /** ISO timestamp of the latest activity, for "continue where you left off". */
  lastActivityAt: string;
  totalPoints: number;
  studyPasses: number;
  quizzesCompleted: number;
  /** Set once the first full study pass or full quiz is finished (+25 bonus). */
  completedOn?: LocalDay;
  /** Best accuracy (0–100) on a full-set quiz. Quick/retry quizzes don't count. */
  bestAccuracy?: number;
  bestAccuracyOn?: LocalDay;
  /** Set once ≥ 90% of quizzable cards are mastered (+100 bonus, once). */
  masteredOn?: LocalDay;
}

export interface DayStats {
  points: number;
  cardsReviewed: number;
  /** Recorded at the moment the goal was reached, so later goal changes don't rewrite history. */
  goalMet: boolean;
}

export interface Settings {
  dailyGoal: number;
}

export interface AppState {
  version: typeof STATE_VERSION;
  settings: Settings;
  /** Keyed by `setId/cardId`. */
  cards: Record<string, CardProgress>;
  sets: Record<string, SetProgress>;
  days: Record<LocalDay, DayStats>;
}

export const DEFAULT_DAILY_GOAL = 50;

export function createInitialState(): AppState {
  return {
    version: STATE_VERSION,
    settings: { dailyGoal: DEFAULT_DAILY_GOAL },
    cards: {},
    sets: {},
    days: {},
  };
}

export const cardKey = (setId: string, cardId: string) => `${setId}/${cardId}`;
