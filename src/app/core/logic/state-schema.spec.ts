import { STATE_VERSION, createInitialState } from '../models/state';
import { StateError, parseExport, parseState, serializeExport } from './state-schema';

const validCard = {
  box: 3,
  lastSeen: '2026-11-20',
  lastPromoted: '2026-11-20',
  last: 'right',
  timesRight: 4,
  timesWrong: 1,
};

const validSet = {
  firstOpened: '2026-11-01',
  lastStudied: '2026-11-20',
  lastActivityAt: '2026-11-20T18:00:00.000Z',
  totalPoints: 120,
  studyPasses: 2,
  quizzesCompleted: 3,
  bestAccuracy: 88,
  bestAccuracyOn: '2026-11-20',
};

describe('parseState', () => {
  it('returns a fresh state for null/undefined', () => {
    expect(parseState(null)).toEqual(createInitialState());
    expect(parseState(undefined)).toEqual(createInitialState());
  });

  it('round-trips a valid state unchanged', () => {
    const state = {
      version: STATE_VERSION,
      settings: { dailyGoal: 80 },
      cards: { 'set-a/c001': validCard },
      sets: { 'set-a': validSet },
      days: { '2026-11-20': { points: 60, cardsReviewed: 12, goalMet: true } },
    };
    expect(parseState(structuredClone(state))).toEqual(state);
  });

  it('drops malformed entries instead of failing', () => {
    const state = parseState({
      version: 1,
      settings: { dailyGoal: -5 },
      cards: {
        'set-a/c001': validCard,
        'set-a/bad-box': { ...validCard, box: 9 },
        'no-slash': validCard,
        'set-a/bad-day': { ...validCard, lastSeen: 'yesterday' },
      },
      sets: { 'set-a': validSet, 'set-b': { nonsense: true } },
      days: { '2026-11-20': { points: 10, cardsReviewed: 2, goalMet: false }, nope: {} },
    });
    expect(Object.keys(state.cards)).toEqual(['set-a/c001']);
    expect(Object.keys(state.sets)).toEqual(['set-a']);
    expect(Object.keys(state.days)).toEqual(['2026-11-20']);
    expect(state.settings.dailyGoal).toBe(50); // invalid goal → default
  });

  it('fills missing sections with defaults', () => {
    expect(parseState({ version: 1 })).toEqual(createInitialState());
  });

  it('rejects non-objects and states from a newer app version', () => {
    expect(() => parseState('hello')).toThrow(StateError);
    expect(() => parseState({ version: STATE_VERSION + 1 })).toThrow(/newer version/);
    expect(() => parseState({ version: 0 })).toThrow(StateError);
  });
});

describe('export / import format', () => {
  it('round-trips through serializeExport → parseExport', () => {
    const state = createInitialState();
    state.settings.dailyGoal = 70;
    state.days['2026-11-24'] = { points: 30, cardsReviewed: 5, goalMet: false };
    const text = serializeExport(state, new Date('2026-11-24T12:00:00Z'));
    expect(JSON.parse(text)).toMatchObject({
      app: 'learning-flashcards',
      exportedAt: '2026-11-24T12:00:00.000Z',
    });
    expect(parseExport(text)).toEqual(state);
  });

  it('rejects files that are not a learning-flashcards export', () => {
    expect(() => parseExport('not json')).toThrow(/valid JSON/);
    expect(() => parseExport('{"app":"something-else","state":{}}')).toThrow(/isn't a/);
  });
});
