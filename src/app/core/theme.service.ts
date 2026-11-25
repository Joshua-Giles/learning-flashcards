import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';
import { PREF_KEYS, readPref, writePref } from './local-prefs';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isThemeMode(value: unknown): value is ThemeMode {
  return MODES.includes(value as ThemeMode);
}

/**
 * Light / dark / system theme. Applies `data-theme` + `color-scheme` on <html>.
 * The inline script in index.html applies the stored theme before Angular boots
 * (no flash); this service keeps it in sync afterwards. Keep the two in step.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.(DARK_QUERY) ?? null;
  private readonly systemPrefersDark = signal(this.media?.matches ?? false);

  readonly mode = signal<ThemeMode>(this.readStoredMode());
  readonly resolved = computed<ResolvedTheme>(() => {
    const mode = this.mode();
    if (mode === 'system') return this.systemPrefersDark() ? 'dark' : 'light';
    return mode;
  });

  constructor() {
    this.media?.addEventListener('change', (e) => this.systemPrefersDark.set(e.matches));

    effect(() => {
      const root = this.document.documentElement;
      const theme = this.resolved();
      root.dataset['theme'] = theme;
      root.style.colorScheme = theme;
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    writePref(PREF_KEYS.theme, mode);
  }

  /** light → dark → system → light */
  cycle(): void {
    const next = MODES[(MODES.indexOf(this.mode()) + 1) % MODES.length];
    this.setMode(next);
  }

  private readStoredMode(): ThemeMode {
    const stored = readPref(PREF_KEYS.theme);
    return isThemeMode(stored) ? stored : 'system';
  }
}
