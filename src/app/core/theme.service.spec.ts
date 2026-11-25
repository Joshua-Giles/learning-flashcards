import { TestBed } from '@angular/core/testing';
import { PREF_KEYS } from './local-prefs';
import { ThemeService } from './theme.service';

type Listener = (e: { matches: boolean }) => void;

/** Installs a controllable matchMedia for (prefers-color-scheme: dark). */
function mockSystemTheme(prefersDark: boolean) {
  const listeners: Listener[] = [];
  const mql = {
    matches: prefersDark,
    addEventListener: (_: string, l: Listener) => listeners.push(l),
    removeEventListener: () => undefined,
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  );
  return {
    change(dark: boolean) {
      mql.matches = dark;
      listeners.forEach((l) => l({ matches: dark }));
    },
  };
}

function createService(): ThemeService {
  const service = TestBed.inject(ThemeService);
  TestBed.tick(); // flush the effect that writes data-theme
  return service;
}

const html = () => document.documentElement;

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    delete html().dataset['theme'];
  });

  afterEach(() => vi.unstubAllGlobals());

  it('defaults to system and follows the OS preference', () => {
    mockSystemTheme(true);
    const theme = createService();
    expect(theme.mode()).toBe('system');
    expect(theme.resolved()).toBe('dark');
    expect(html().dataset['theme']).toBe('dark');
  });

  it('reacts live to OS theme changes while in system mode', () => {
    const os = mockSystemTheme(false);
    const theme = createService();
    expect(html().dataset['theme']).toBe('light');

    os.change(true);
    TestBed.tick();
    expect(theme.resolved()).toBe('dark');
    expect(html().dataset['theme']).toBe('dark');
  });

  it('cycles light → dark → system and persists the choice', () => {
    mockSystemTheme(false);
    localStorage.setItem(PREF_KEYS.theme, 'light');
    const theme = createService();
    expect(theme.mode()).toBe('light');

    theme.cycle();
    TestBed.tick();
    expect(theme.mode()).toBe('dark');
    expect(html().dataset['theme']).toBe('dark');
    expect(html().style.colorScheme).toBe('dark');
    expect(localStorage.getItem(PREF_KEYS.theme)).toBe('dark');

    theme.cycle();
    expect(theme.mode()).toBe('system');
    theme.cycle();
    expect(theme.mode()).toBe('light');
  });

  it('ignores garbage in storage', () => {
    mockSystemTheme(false);
    localStorage.setItem(PREF_KEYS.theme, 'purple');
    expect(createService().mode()).toBe('system');
  });
});
