import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CardSet, SetCategory, SetManifest, SetSummary } from './models/set';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

const SETS_BASE = 'sets/';

/** Loads the set manifest at startup and individual sets on demand (cached). */
@Injectable({ providedIn: 'root' })
export class SetStore {
  private readonly http = inject(HttpClient);
  private readonly setCache = new Map<string, Promise<CardSet>>();

  readonly sets = signal<SetSummary[]>([]);
  readonly status = signal<LoadStatus>('idle');

  /** Sets grouped by category, both alphabetical. */
  readonly categories = computed<SetCategory[]>(() => {
    const groups = new Map<string, SetSummary[]>();
    for (const set of this.sets()) {
      const list = groups.get(set.category) ?? [];
      list.push(set);
      groups.set(set.category, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, sets]) => ({
        name,
        sets: [...sets].sort((a, b) => a.title.localeCompare(b.title)),
      }));
  });

  summary(id: string): SetSummary | undefined {
    return this.sets().find((s) => s.id === id);
  }

  /** Never throws: failures surface through `status`. */
  async loadManifest(): Promise<void> {
    this.status.set('loading');
    try {
      const manifest = await firstValueFrom(this.http.get<SetManifest>(`${SETS_BASE}index.json`));
      this.sets.set(manifest.sets);
      this.status.set('ready');
    } catch (err) {
      console.error('Failed to load set manifest', err);
      this.status.set('error');
    }
  }

  /** Loads a full set. Concurrent and repeat calls share one request; failures are not cached. */
  getSet(id: string): Promise<CardSet> {
    let pending = this.setCache.get(id);
    if (!pending) {
      pending = firstValueFrom(
        this.http.get<CardSet>(`${SETS_BASE}${encodeURIComponent(id)}.json`),
      );
      pending.catch(() => this.setCache.delete(id));
      this.setCache.set(id, pending);
    }
    return pending;
  }
}
