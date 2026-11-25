/**
 * Tiny, failure-tolerant localStorage helpers for UI preferences (theme, sidebar,
 * collapsed sections). Learning progress lives in the versioned StorageService; these
 * stay separate on purpose (see SPEC F5).
 */
export const PREF_KEYS = {
  theme: 'lf:theme',
  sidebarOpen: 'lf:sidebar-open',
  sidebarCollapsed: 'lf:sidebar-collapsed',
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
