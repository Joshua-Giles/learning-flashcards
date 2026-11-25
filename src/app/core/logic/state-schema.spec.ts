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
      questions: [
        {
          id: 'q1',
          text: 'Why "Modest Mouse"?',
          setId: 'set-a',
          cardId: 'c001',
          createdAt: '2026-11-20T18:00:00.000Z',
          status: 'open',
        },
        { id: 'q2', text: 'General one', createdAt: '2026-11-21T09:00:00.000Z', status: 'sent' },
      ],
    };
    expect(parseState(structuredClone(state))).toEqual(state);
  });

  it('drops malformed entries instead of failing', () => {
    const state = parseState({
      version: STATE_VERSION,
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
    expect(parseState({ version: STATE_VERSION })).toEqual(createInitialState());
  });

  it('migrates a v1 state (no notebook) to the current version', () => {
    const v1 = {
      version: 1,
      settings: { dailyGoal: 60 },
      cards: { 'set-a/c001': validCard },
      sets: {},
      days: {},
    };
    const state = parseState(v1);
    expect(state.version).toBe(STATE_VERSION);
    expect(state.questions).toEqual([]);
    expect(state.settings.dailyGoal).toBe(60);
    expect(state.cards['set-a/c001']).toEqual(validCard);
  });

  it('drops malformed questions', () => {
    const state = parseState({
      version: STATE_VERSION,
      questions: [
        { id: 'ok', text: 'Fine?', createdAt: '2026-11-20T00:00:00Z', status: 'open' },
        { id: 'blank', text: '   ', createdAt: '2026-11-20T00:00:00Z', status: 'open' },
        { id: 'bad-status', text: 'x', createdAt: '2026-11-20T00:00:00Z', status: 'done' },
        {
          id: 'card-no-set',
          text: 'x',
          cardId: 'c1',
          createdAt: '2026-11-20T00:00:00Z',
          status: 'open',
        },
      ],
    });
    expect(state.questions.map((q) => q.id)).toEqual(['ok']);
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
