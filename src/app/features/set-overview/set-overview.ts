import { Component, effect, inject, input, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { SetStore } from '../../core/set-store';

@Component({
  selector: 'lf-set-overview',
  imports: [RouterLink],
  template: `
    @if (set.isLoading()) {
      <p class="text-muted" aria-live="polite">Loading…</p>
    } @else if (set.error()) {
      <h1 class="text-2xl font-semibold">Set not found</h1>
      <p class="mt-2 text-muted">
        There's no set called “{{ setId() }}”. <a routerLink="/" class="link">Back home</a>
      </p>
    } @else if (set.value(); as s) {
      <div class="text-4xl" aria-hidden="true">{{ s.emoji }}</div>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight">{{ s.title }}</h1>
      <p class="mt-2 text-muted">{{ s.description }}</p>

      <dl class="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        <div class="flex gap-1">
          <dt>Cards</dt>
          <dd class="font-medium text-fg tabular-nums">{{ s.cards.length }}</dd>
        </div>
        <div class="flex gap-1">
          <dt>Category</dt>
          <dd class="font-medium text-fg">{{ s.category }}</dd>
        </div>
      </dl>

      <div class="mt-8 flex flex-wrap gap-3">
        <a [routerLink]="['/sets', s.id, 'study']" class="btn btn-primary" data-testid="study-btn">
          Study (flip cards)
        </a>
        <a [routerLink]="['/sets', s.id, 'quiz']" class="btn btn-secondary">Quiz (type answers)</a>
      </div>
    }
  `,
})
export class SetOverview {
  private readonly store = inject(SetStore);
  private readonly title = inject(Title);

  /** Bound from the `:setId` route param. */
  readonly setId = input.required<string>();

  protected readonly set = resource({
    params: () => this.setId(),
    loader: ({ params }) => this.store.getSet(params),
  });

  constructor() {
    effect(() => {
      // value() throws while the resource is in an error state, so check first.
      const s = this.set.hasValue() ? this.set.value() : undefined;
      this.title.setTitle(s ? `${s.title} · Flashcards` : 'Flashcards');
    });
  }
}
