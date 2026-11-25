import { Injectable, signal } from '@angular/core';
import { AppState, createInitialState } from './models/state';
import { parseExport, parseState, serializeExport } from './logic/state-schema';

export const STATE_KEY = 'lf:state';
/** Where unreadable saved state is parked instead of being thrown away. */
export const STATE_BACKUP_KEY = 'lf:state:backup';

/**
 * Owns the single versioned learning-state document in localStorage.
 * If storage is unavailable or full the app keeps working in memory and
 * `available` turns false so the shell can show a banner.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  readonly state = signal<AppState>(createInitialState());
  readonly available = signal(true);
  /** Set when saved progress couldn't be read at startup (it was backed up). */
  readonly loadProblem = signal<string | null>(null);

  constructor() {
    this.load();
  }

  update(fn: (state: AppState) => AppState): void {
    const next = fn(this.state());
    this.state.set(next);
    this.persist(next);
  }

  exportText(now = new Date()): string {
    return serializeExport(this.state(), now);
  }

  /** Replaces all progress with an export file's contents. Throws StateError on bad input. */
  importText(text: string): void {
    const state = parseExport(text);
    this.state.set(state);
    this.persist(state);
  }

  reset(): void {
    const fresh = createInitialState();
    this.state.set(fresh);
    this.persist(fresh);
  }

  private load(): void {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STATE_KEY);
      localStorage.setItem('lf:probe', '1');
      localStorage.removeItem('lf:probe');
    } catch {
      this.available.set(false);
      return;
    }
    if (raw === null) return;

    try {
      this.state.set(parseState(JSON.parse(raw)));
    } catch (err) {
      console.error('Could not read saved progress; starting fresh', err);
      this.loadProblem.set(
        err instanceof Error ? err.message : 'Saved progress could not be read.',
      );
      try {
        localStorage.setItem(STATE_BACKUP_KEY, raw);
      } catch {
        // Nothing more we can do; the in-memory state still works.
      }
    }
  }

  private persist(state: AppState): void {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      if (!this.available()) this.available.set(true);
    } catch (err) {
      console.error('Could not save progress', err);
      this.available.set(false);
    }
  }
}
