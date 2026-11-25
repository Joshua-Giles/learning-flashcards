import {
  AppState,
  CardProgress,
  DEFAULT_DAILY_GOAL,
  DayStats,
  MasteryBox,
  STATE_VERSION,
  SetProgress,
  createInitialState,
} from '../models/state';
import { isLocalDay } from './local-day';

export class StateError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isBox = (v: unknown): v is MasteryBox => Number.isInteger(v) && +v! >= 0 && +v! <= 5;
const optDay = (v: unknown) => v === undefined || isLocalDay(v);

/**
 * Migrations from version N to N+1. Add an entry when STATE_VERSION is bumped,
 * e.g. `1: (s) => ({ ...s, version: 2, newField: … })`, plus a test.
 */
const MIGRATIONS: Record<number, (state: Obj) => Obj> = {};

function migrate(raw: Obj): Obj {
  let state = raw;
  let version = state['version'];
  if (!Number.isInteger(version) || (version as number) < 1) {
    throw new StateError('Saved progress has no valid version.');
  }
  if ((version as number) > STATE_VERSION) {
    throw new StateError(
      `Saved progress comes from a newer version of the app (v${version}); this app understands up to v${STATE_VERSION}.`,
    );
  }
  while ((version as number) < STATE_VERSION) {
    const step = MIGRATIONS[version as number];
    if (!step) throw new StateError(`No migration from v${version}.`);
    state = step(state);
    version = state['version'];
  }
  return state;
}

function parseCard(v: unknown): CardProgress | undefined {
  if (!isObj(v)) return undefined;
  const { box, lastSeen, lastPromoted, last, timesRight, timesWrong } = v;
  if (!isBox(box) || !isLocalDay(lastSeen) || !optDay(lastPromoted)) return undefined;
  if ((last !== 'right' && last !== 'wrong') || !isCount(timesRight) || !isCount(timesWrong)) {
    return undefined;
  }
  return {
    box,
    lastSeen,
    ...(lastPromoted ? { lastPromoted: lastPromoted as string } : {}),
    last,
    timesRight,
    timesWrong,
  };
}

function parseSet(v: unknown): SetProgress | undefined {
  if (!isObj(v)) return undefined;
  const s = v;
  if (!isLocalDay(s['firstOpened']) || !isLocalDay(s['lastStudied'])) return undefined;
  if (typeof s['lastActivityAt'] !== 'string' || Number.isNaN(Date.parse(s['lastActivityAt']))) {
    return undefined;
  }
  if (![s['totalPoints'], s['studyPasses'], s['quizzesCompleted']].every(isCount)) return undefined;
  if (!optDay(s['completedOn']) || !optDay(s['bestAccuracyOn']) || !optDay(s['masteredOn'])) {
    return undefined;
  }
  const best = s['bestAccuracy'];
  if (best !== undefined && !(isCount(best) && best <= 100)) return undefined;

  const out: SetProgress = {
    firstOpened: s['firstOpened'],
    lastStudied: s['lastStudied'],
    lastActivityAt: s['lastActivityAt'],
    totalPoints: s['totalPoints'] as number,
    studyPasses: s['studyPasses'] as number,
    quizzesCompleted: s['quizzesCompleted'] as number,
  };
  if (s['completedOn']) out.completedOn = s['completedOn'] as string;
  if (best !== undefined) out.bestAccuracy = best;
  if (s['bestAccuracyOn']) out.bestAccuracyOn = s['bestAccuracyOn'] as string;
  if (s['masteredOn']) out.masteredOn = s['masteredOn'] as string;
  return out;
}

function parseDay(v: unknown): DayStats | undefined {
  if (!isObj(v)) return undefined;
  const { points, cardsReviewed, goalMet } = v;
  if (!isCount(points) || !isCount(cardsReviewed) || typeof goalMet !== 'boolean') return undefined;
  return { points, cardsReviewed, goalMet };
}

function parseRecord<T>(
  v: unknown,
  parseValue: (x: unknown) => T | undefined,
  keyOk: (k: string) => boolean,
): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(v)) return out;
  for (const [key, value] of Object.entries(v)) {
    const parsed = keyOk(key) ? parseValue(value) : undefined;
    if (parsed !== undefined) out[key] = parsed;
  }
  return out;
}

/**
 * Turns anything read from storage (or an import) into a valid AppState.
 * Unknown/malformed entries are dropped rather than failing the whole load;
 * only a non-object or an unusable version throws.
 */
export function parseState(raw: unknown): AppState {
  if (raw === null || raw === undefined) return createInitialState();
  if (!isObj(raw)) throw new StateError('Saved progress is not an object.');

  const s = migrate(raw);
  const settings = isObj(s['settings']) ? s['settings'] : {};
  const goal = settings['dailyGoal'];

  return {
    version: STATE_VERSION,
    settings: {
      dailyGoal:
        Number.isInteger(goal) && +goal! >= 1 && +goal! <= 10_000 ? +goal! : DEFAULT_DAILY_GOAL,
    },
    cards: parseRecord(s['cards'], parseCard, (k) => /^[^/]+\/[^/]+$/.test(k)),
    sets: parseRecord(s['sets'], parseSet, (k) => k.length > 0),
    days: parseRecord(s['days'], parseDay, isLocalDay),
  };
}

const EXPORT_APP = 'learning-flashcards';

export function serializeExport(state: AppState, now = new Date()): string {
  return JSON.stringify({ app: EXPORT_APP, exportedAt: now.toISOString(), state }, null, 2);
}

export function parseExport(text: string): AppState {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new StateError("That file isn't valid JSON.");
  }
  if (!isObj(data) || data['app'] !== EXPORT_APP) {
    throw new StateError("That file isn't a Learning Flashcards progress export.");
  }
  return parseState(data['state']);
}
