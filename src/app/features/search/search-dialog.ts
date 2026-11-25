import { DialogRef } from '@angular/cdk/dialog';
import { Component, computed, effect, inject, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideSearch } from '@lucide/angular';
import { CardHit, SetHit } from '../../core/logic/search-index';
import { SearchService } from './search.service';

type Hit = SetHit | CardHit;

/** Command-palette style search over sets and cards (combobox + listbox pattern). */
@Component({
  selector: 'lf-search-dialog',
  imports: [LucideSearch],
  host: {
    class:
      'block w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface text-fg shadow-2xl',
  },
  template: `
    <div class="flex items-center gap-3 border-b border-line px-4">
      <svg lucideSearch [size]="18" class="shrink-0 text-muted"></svg>
      <input
        type="text"
        role="combobox"
        aria-label="Search sets and cards"
        aria-autocomplete="list"
        aria-controls="search-results"
        [attr.aria-expanded]="hits().length > 0"
        [attr.aria-activedescendant]="hits().length ? 'search-opt-' + active() : null"
        placeholder="Search sets and cards…"
        autocomplete="off"
        spellcheck="false"
        class="h-14 min-w-0 flex-1 bg-transparent text-base outline-none"
        [value]="query()"
        (input)="onInput($any($event.target).value)"
        (keydown)="onKeydown($event)"
        data-testid="search-input"
      />
      <kbd>Esc</kbd>
    </div>

    <div class="max-h-[60vh] overflow-y-auto p-2" aria-live="polite">
      @if (index.isLoading()) {
        <p class="px-3 py-6 text-center text-sm text-muted">Loading sets…</p>
      } @else if (index.error()) {
        <p class="px-3 py-6 text-center text-sm text-muted">Couldn't load sets for search.</p>
      } @else if (query().trim().length < 2) {
        <p class="px-3 py-6 text-center text-sm text-muted">
          Type to search titles, questions and answers. Typos are fine.
        </p>
      } @else if (hits().length === 0) {
        <p class="px-3 py-6 text-center text-sm text-muted">No matches for “{{ query() }}”.</p>
      }

      <ul id="search-results" role="listbox" aria-label="Search results" [hidden]="!hits().length">
        @for (hit of hits(); track $index; let i = $index) {
          @if (i === 0 && hit.kind === 'set') {
            <li
              role="presentation"
              class="px-3 pt-2 pb-1 text-xs font-semibold text-muted uppercase"
            >
              Sets
            </li>
          }
          @if (hit.kind === 'card' && (i === 0 || hits()[i - 1].kind === 'set')) {
            <li
              role="presentation"
              class="px-3 pt-3 pb-1 text-xs font-semibold text-muted uppercase"
            >
              Cards
            </li>
          }
          <li
            role="option"
            [id]="'search-opt-' + i"
            [attr.aria-selected]="i === active()"
            class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2"
            [class.bg-surface-2]="i === active()"
            (mouseenter)="active.set(i)"
            (mousedown)="$event.preventDefault()"
            (click)="choose(hit)"
            (keydown.enter)="choose(hit)"
            tabindex="-1"
            data-testid="search-result"
          >
            @if (hit.kind === 'set') {
              <span aria-hidden="true">{{ hit.set.emoji }}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ hit.set.title }}</span>
                <span class="block truncate text-xs text-muted">{{ hit.set.description }}</span>
              </span>
            } @else {
              <span aria-hidden="true">{{ hit.setEmoji }}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate">{{ hit.prompt }}</span>
                <span class="block truncate text-xs text-muted">
                  <span class="text-accent">{{ hit.answer }}</span> · {{ hit.setTitle }}
                </span>
              </span>
            }
          </li>
        }
      </ul>
    </div>

    <p class="hidden border-t border-line px-4 py-2 text-xs text-muted sm:block">
      <kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close
    </p>
  `,
})
export class SearchDialog {
  private readonly ref = inject(DialogRef);
  private readonly router = inject(Router);
  private readonly search = inject(SearchService);

  protected readonly query = signal('');
  protected readonly active = signal(0);
  protected readonly index = resource({ loader: () => this.search.ensureIndex() });

  protected readonly hits = computed<Hit[]>(() => {
    if (!this.index.hasValue()) return [];
    const { sets, cards } = this.index.value().search(this.query());
    return [...sets, ...cards];
  });

  constructor() {
    // Keep the highlighted option in view when moving with the keyboard.
    effect(() => {
      const i = this.active();
      queueMicrotask(() =>
        document.getElementById(`search-opt-${i}`)?.scrollIntoView({ block: 'nearest' }),
      );
    });
  }

  protected onInput(value: string): void {
    this.query.set(value);
    this.active.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.hits().length;
    if (event.key === 'ArrowDown' && count) {
      this.active.update((i) => (i + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      this.active.update((i) => (i - 1 + count) % count);
    } else if (event.key === 'Enter' && count) {
      this.choose(this.hits()[this.active()]);
    } else {
      return;
    }
    event.preventDefault();
  }

  protected choose(hit: Hit): void {
    this.ref.close();
    if (hit.kind === 'set') {
      void this.router.navigate(['/sets', hit.set.id]);
    } else {
      void this.router.navigate(['/sets', hit.setId, 'study'], {
        queryParams: { card: hit.cardId },
      });
    }
  }
}
