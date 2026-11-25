import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CardSet, SetSummary } from './models/set';
import { SetStore } from './set-store';

function summary(id: string, category: string, title: string): SetSummary {
  return {
    id,
    title,
    category,
    description: '',
    emoji: '🧪',
    tags: [],
    version: 1,
    updated: '2026-11-24',
    cardCount: 1,
    quizzableCount: 1,
  };
}

describe('SetStore', () => {
  let store: SetStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(SetStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the manifest and groups sets by category alphabetically', async () => {
    const done = store.loadManifest();
    expect(store.status()).toBe('loading');
    http.expectOne('sets/index.json').flush({
      sets: [
        summary('mm', 'Music', 'Modest Mouse'),
        summary('it-b', 'Languages', 'Italian: Verbs'),
        summary('it-a', 'Languages', 'Italian: Greetings'),
      ],
    });
    await done;

    expect(store.status()).toBe('ready');
    expect(store.categories().map((c) => c.name)).toEqual(['Languages', 'Music']);
    expect(store.categories()[0].sets.map((s) => s.id)).toEqual(['it-a', 'it-b']);
    expect(store.summary('mm')?.title).toBe('Modest Mouse');
  });

  it('reports an error status instead of throwing when the manifest fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const done = store.loadManifest();
    http.expectOne('sets/index.json').flush('nope', { status: 404, statusText: 'Not Found' });
    await done;
    expect(store.status()).toBe('error');
    expect(store.sets()).toEqual([]);
  });

  it('caches sets so repeat calls share one request', async () => {
    const a = store.getSet('alpha');
    const b = store.getSet('alpha');
    http.expectOne('sets/alpha.json').flush({ id: 'alpha', cards: [] } as unknown as CardSet);
    expect(await a).toBe(await b);
    expect(store.getSet('alpha')).toBe(a);
  });

  it('does not cache failed set loads', async () => {
    const first = store.getSet('missing');
    http.expectOne('sets/missing.json').flush('nope', { status: 404, statusText: 'Not Found' });
    await expect(first).rejects.toBeTruthy();

    const retry = store.getSet('missing');
    http.expectOne('sets/missing.json').flush({ id: 'missing', cards: [] });
    await expect(retry).resolves.toMatchObject({ id: 'missing' });
  });
});
