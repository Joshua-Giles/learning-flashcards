import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SetStore } from './core/set-store';

describe('App shell', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renders the top bar and the sets grouped by category in the sidebar', async () => {
    const store = TestBed.inject(SetStore);
    const loaded = store.loadManifest();
    TestBed.inject(HttpTestingController)
      .expectOne('sets/index.json')
      .flush({
        sets: [
          {
            id: 'sample-solar-system',
            title: 'Sample: Our Solar System',
            description: '',
            category: 'Science',
            emoji: '🪐',
            tags: [],
            version: 1,
            updated: '2026-11-24',
            cardCount: 8,
            quizzableCount: 8,
          },
        ],
      });
    await loaded;

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[data-testid="sidebar-toggle"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="theme-toggle"]')).toBeTruthy();
    expect(el.querySelector('#lf-sidebar h2')?.textContent).toContain('Science');
    expect(el.querySelector('[data-testid="set-link-sample-solar-system"]')?.textContent).toContain(
      'Our Solar System',
    );
  });

  it('collapses the sidebar (and makes it inert) when the toggle is clicked', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const toggle = el.querySelector<HTMLButtonElement>('[data-testid="sidebar-toggle"]')!;
    const sidebar = el.querySelector<HTMLElement>('#lf-sidebar')!;

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    await fixture.whenStable();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(sidebar.inert).toBe(true);
    expect(sidebar.classList).toContain('w-0');
  });
});
