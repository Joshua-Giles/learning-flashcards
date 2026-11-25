import { TestBed } from '@angular/core/testing';
import { createInitialState } from './models/state';
import { StateError } from './logic/state-schema';
import { STATE_BACKUP_KEY, STATE_KEY, StorageService } from './storage.service';

const create = () => TestBed.inject(StorageService);

describe('StorageService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('starts with a fresh state when nothing is saved', () => {
    const s = create();
    expect(s.state()).toEqual(createInitialState());
    expect(s.available()).toBe(true);
  });

  it('persists updates and reloads them', () => {
    create().update((st) => ({ ...st, settings: { dailyGoal: 77 } }));
    TestBed.resetTestingModule();
    expect(create().state().settings.dailyGoal).toBe(77);
    expect(JSON.parse(localStorage.getItem(STATE_KEY)!).settings.dailyGoal).toBe(77);
  });

  it('backs up unreadable state and starts fresh', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem(STATE_KEY, '{broken');
    const s = create();
    expect(s.state()).toEqual(createInitialState());
    expect(s.loadProblem()).toBeTruthy();
    expect(localStorage.getItem(STATE_BACKUP_KEY)).toBe('{broken');
  });

  it('export → import round-trips to an identical state', () => {
    const a = create();
    a.update((st) => ({
      ...st,
      settings: { dailyGoal: 65 },
      days: { '2026-11-24': { points: 40, cardsReviewed: 6, goalMet: false } },
    }));
    const text = a.exportText();
    const before = a.state();

    a.reset();
    expect(a.state()).toEqual(createInitialState());
    a.importText(text);
    expect(a.state()).toEqual(before);
  });

  it('rejects a bad import without touching current progress', () => {
    const s = create();
    s.update((st) => ({ ...st, settings: { dailyGoal: 90 } }));
    expect(() => s.importText('{"app":"nope"}')).toThrow(StateError);
    expect(s.state().settings.dailyGoal).toBe(90);
  });

  it('keeps working in memory and flags when storage throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const s = create();
    expect(s.available()).toBe(false);
    s.update((st) => ({ ...st, settings: { dailyGoal: 55 } }));
    expect(s.state().settings.dailyGoal).toBe(55);
    expect(s.available()).toBe(false);
  });
});
