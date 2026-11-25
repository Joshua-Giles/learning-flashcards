/**
 * Tiny, failure-tolerant localStorage helpers for UI preferences (theme, sidebar).
 * Learning progress will live in the versioned StorageService (task T8), which will
 * migrate these keys into its document.
 */
export const PREF_KEYS = {
  theme: 'lf:theme',
  sidebarOpen: 'lf:sidebar-open',
} as const;

export function readPref(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, quota) — preference just won't persist.
  }
}
