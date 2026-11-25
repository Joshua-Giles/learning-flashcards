import { BreakpointObserver } from '@angular/cdk/layout';
import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PREF_KEYS, readPref, writePref } from './local-prefs';

export const MOBILE_QUERY = '(max-width: 767.98px)';

/**
 * Sidebar state. On desktop the sidebar is pushed inline and its open/closed state
 * is remembered. On mobile it is an overlay drawer that always starts closed.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe(MOBILE_QUERY)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  private readonly desktopOpen = signal(readPref(PREF_KEYS.sidebarOpen) !== 'false');
  private readonly mobileOpen = signal(false);

  readonly sidebarOpen = computed(() => (this.isMobile() ? this.mobileOpen() : this.desktopOpen()));

  toggleSidebar(): void {
    this.setSidebarOpen(!this.sidebarOpen());
  }

  setSidebarOpen(open: boolean): void {
    if (this.isMobile()) {
      this.mobileOpen.set(open);
    } else {
      this.desktopOpen.set(open);
      writePref(PREF_KEYS.sidebarOpen, String(open));
    }
  }

  /** Called after navigation: closes the drawer on mobile, no-op on desktop. */
  closeIfMobile(): void {
    if (this.isMobile()) this.mobileOpen.set(false);
  }
}
