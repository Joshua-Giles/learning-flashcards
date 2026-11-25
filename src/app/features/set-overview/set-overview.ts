import { Component, computed, effect, inject, input, resource } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { setMasteryPct, stillLearning } from '../../core/logic/mastery';
import { ProgressStore } from '../../core/progress-store';
import { SetStore } from '../../core/set-store';
import { ProgressRing } from '../../shared/progress-ring';

@Component({
  selector: 'lf-set-overview',
  imports: [RouterLink, ProgressRing],
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

      <section
        class="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl border border-line bg-surface p-5"
        aria-label="Your progress on this set"
        data-testid="set-progress"
      >
        <div class="flex items-center gap-3">
          <lf-progress-ring [value]="mastery()" [size]="52" [stroke]="5">
            <span class="text-xs">{{ mastery() }}%</span>
          </lf-progress-ring>
          <div>
            <p class="text-sm font-medium">
              @if (progress()?.masteredOn) {
                Mastered 🏆
              } @else {
                Mastered
              }
            </p>
            <p class="text-xs text-muted">cards at box 4+</p>
          </div>
        </div>
        <dl class="flex gap-6 text-sm">
          <div>
            <dt class="text-xs text-muted">Best quiz</dt>
            <dd class="font-semibold tabular-nums" data-testid="best-accuracy">
              {{ progress()?.bestAccuracy !== undefined ? progress()!.bestAccuracy + '%' : '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Points</dt>
            <dd class="font-semibold tabular-nums">{{ progress()?.totalPoints ?? 0 }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Last studied</dt>
            <dd class="font-semibold">{{ progress()?.lastStudied ?? 'Never' }}</dd>
          </div>
        </dl>
      </section>

      <div class="mt-8 flex flex-wrap gap-3">
        <a [routerLink]="['/sets', s.id, 'study']" class="btn btn-primary" data-testid="study-btn">
          Study (flip cards)
        </a>
        <a [routerLink]="['/sets', s.id, 'quiz']" class="btn btn-secondary">Quiz (type answers)</a>
        @if (learningCount() > 0) {
          <a
            [routerLink]="['/sets', s.id, 'study']"
            [queryParams]="{ only: 'learning' }"
            class="btn btn-secondary"
            data-testid="study-learning"
          >
            Study the {{ learningCount() }} I'm still learning
          </a>
        }
      </div>
    }
  `,
})
export class SetOverview {
  private readonly store = inject(SetStore);
  private readonly title = inject(Title);
  private readonly progressStore = inject(ProgressStore);

  /** Bound from the `:setId` route param. */
  readonly setId = input.required<string>();

  protected readonly set = resource({
    params: () => this.setId(),
    loader: ({ params }) => this.store.getSet(params),
  });

  protected readonly progress = computed(() => this.progressStore.sets()[this.setId()]);

  protected readonly mastery = computed(() => {
    if (!this.set.hasValue()) return 0;
    const s = this.set.value();
    const ids = s.cards.filter((c) => c.quizzable !== false).map((c) => c.id);
    return setMasteryPct(s.id, ids, this.progressStore.cards());
  });

  protected readonly learningCount = computed(() => {
    if (!this.set.hasValue()) return 0;
    const s = this.set.value();
    return stillLearning(s.id, s.cards, this.progressStore.cards()).length;
  });

  constructor() {
    effect(() => {
      // value() throws while the resource is in an error state, so check first.
      const s = this.set.hasValue() ? this.set.value() : undefined;
      this.title.setTitle(s ? `${s.title} · Flashcards` : 'Flashcards');
    });
  }
}
