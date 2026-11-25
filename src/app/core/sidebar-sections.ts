import { Injectable, computed, signal } from '@angular/core';
import { PREF_KEYS, readPref, writePref } from './local-prefs';

/** Section keys: `c:<category>` for categories, `g:<category>/<group>` for groups. */
export const categoryKey = (category: string) => `c:${category}`;
export const groupKey = (category: string, group: string) => `g:${category}/${group}`;

/**
 * Which sidebar sections (categories and band/artist groups) are collapsed.
 * Everything is expanded by default; the choice is remembered as a UI preference.
 */
@Injectable({ providedIn: 'root' })
export class SidebarSections {
  private readonly collapsed = signal<ReadonlySet<string>>(this.read());

  readonly anyCollapsed = computed(() => this.collapsed().size > 0);

  isCollapsed(key: string): boolean {
    return this.collapsed().has(key);
  }

  toggle(key: string): void {
    const next = new Set(this.collapsed());
    if (!next.delete(key)) next.add(key);
    this.save(next);
  }

  collapseAll(keys: readonly string[]): void {
    this.save(new Set(keys));
  }

  expandAll(): void {
    this.save(new Set());
  }

  private save(next: Set<string>): void {
    this.collapsed.set(next);
    writePref(PREF_KEYS.sidebarCollapsed, JSON.stringify([...next]));
  }

  private read(): ReadonlySet<string> {
    try {
      const parsed: unknown = JSON.parse(readPref(PREF_KEYS.sidebarCollapsed) ?? '[]');
      return new Set(
        Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [],
      );
    } catch {
      return new Set();
    }
  }
}
