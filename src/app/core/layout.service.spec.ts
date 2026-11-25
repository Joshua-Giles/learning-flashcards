import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { LayoutService } from './layout.service';
import { PREF_KEYS } from './local-prefs';

function setup(mobile: boolean) {
  const state = new BehaviorSubject<BreakpointState>({ matches: mobile, breakpoints: {} });
  TestBed.configureTestingModule({
    providers: [{ provide: BreakpointObserver, useValue: { observe: () => state } }],
  });
  return {
    layout: TestBed.inject(LayoutService),
    setMobile: (m: boolean) => state.next({ matches: m, breakpoints: {} }),
  };
}

describe('LayoutService', () => {
  beforeEach(() => localStorage.clear());

  it('starts open on desktop by default', () => {
    expect(setup(false).layout.sidebarOpen()).toBe(true);
  });

  it('remembers the desktop sidebar state', () => {
    const { layout } = setup(false);
    layout.toggleSidebar();
    expect(layout.sidebarOpen()).toBe(false);
    expect(localStorage.getItem(PREF_KEYS.sidebarOpen)).toBe('false');
  });

  it('restores a collapsed desktop sidebar from storage', () => {
    localStorage.setItem(PREF_KEYS.sidebarOpen, 'false');
    expect(setup(false).layout.sidebarOpen()).toBe(false);
  });

  it('always starts closed on mobile and does not persist mobile toggles', () => {
    const { layout } = setup(true);
    expect(layout.sidebarOpen()).toBe(false);
    layout.toggleSidebar();
    expect(layout.sidebarOpen()).toBe(true);
    expect(localStorage.getItem(PREF_KEYS.sidebarOpen)).toBeNull();
  });

  it('closeIfMobile closes the drawer on mobile only', () => {
    const { layout, setMobile } = setup(true);
    layout.setSidebarOpen(true);
    layout.closeIfMobile();
    expect(layout.sidebarOpen()).toBe(false);

    setMobile(false);
    expect(layout.sidebarOpen()).toBe(true); // desktop state untouched
    layout.closeIfMobile();
    expect(layout.sidebarOpen()).toBe(true);
  });
});
