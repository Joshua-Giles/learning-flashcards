import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuizResults } from './quiz-session';

@Component({
  selector: 'lf-quiz-results',
  imports: [RouterLink],
  template: `
    <section
      class="pop-in rounded-2xl border border-line bg-surface p-6 sm:p-8"
      aria-labelledby="results-heading"
      data-testid="quiz-results"
    >
      <p class="text-sm text-muted">Quiz complete</p>
      <h2 id="results-heading" class="mt-1 text-2xl font-semibold tracking-tight">
        {{ headline() }}
      </h2>

      <p class="mt-6 text-6xl font-semibold tracking-tight tabular-nums" data-testid="accuracy">
        {{ results().accuracy }}<span class="text-3xl text-muted">%</span>
      </p>
      <p class="text-sm text-muted">accuracy</p>
      <p class="mt-3 flex flex-wrap gap-2 text-sm">
        <span
          class="rounded-full bg-accent/10 px-3 py-1 font-semibold text-accent"
          data-testid="quiz-points"
          >+{{ points() }} points</span
        >
        @if (personalBest()) {
          <span
            class="rounded-full bg-success/10 px-3 py-1 font-semibold text-success"
            data-testid="personal-best"
            >🎉 New personal best</span
          >
        }
      </p>

      <dl class="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        <div class="rounded-xl bg-surface-2 p-3">
          <dt class="text-xs text-muted">Correct</dt>
          <dd class="text-xl font-semibold text-success tabular-nums">{{ results().correct }}</dd>
        </div>
        <div class="rounded-xl bg-surface-2 p-3">
          <dt class="text-xs text-muted">Close (accepted)</dt>
          <dd class="text-xl font-semibold tabular-nums">{{ results().close }}</dd>
        </div>
        <div class="rounded-xl bg-surface-2 p-3">
          <dt class="text-xs text-muted">"I was right"</dt>
          <dd class="text-xl font-semibold tabular-nums">{{ results().override }}</dd>
        </div>
        <div class="rounded-xl bg-surface-2 p-3">
          <dt class="text-xs text-muted">Best combo</dt>
          <dd class="text-xl font-semibold tabular-nums">🔥 {{ results().bestCombo }}</dd>
        </div>
      </dl>

      @if (results().missedCards.length) {
        <h3 class="mt-6 text-sm font-semibold">Missed ({{ results().missedCards.length }})</h3>
        <ul class="mt-2 divide-y divide-line text-sm" data-testid="missed-list">
          @for (card of results().missedCards; track card.id) {
            <li class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
              <span>{{ card.prompt }}</span>
              <span class="font-medium text-accent">{{ card.answer }}</span>
            </li>
          }
        </ul>
      }

      <div class="mt-8 flex flex-wrap gap-3">
        @if (results().missedCards.length) {
          <button
            type="button"
            class="btn btn-primary"
            (click)="retryMissed.emit()"
            data-testid="retry-missed"
          >
            Retry the {{ results().missedCards.length }} I missed
          </button>
        }
        <button
          type="button"
          class="btn"
          [class.btn-primary]="!results().missedCards.length"
          [class.btn-secondary]="results().missedCards.length"
          (click)="again.emit()"
        >
          Quiz again
        </button>
        <a [routerLink]="['/sets', setId(), 'study']" class="btn btn-secondary">Study cards</a>
      </div>
    </section>
  `,
})
export class QuizResultsPanel {
  readonly results = input.required<QuizResults>();
  readonly setId = input.required<string>();
  readonly points = input(0);
  readonly personalBest = input(false);
  readonly retryMissed = output<void>();
  readonly again = output<void>();

  protected readonly headline = computed(() => {
    const { accuracy } = this.results();
    if (accuracy === 100) return 'Perfect score! 🏆';
    if (accuracy >= 80) return 'Excellent! 🎉';
    if (accuracy >= 50) return 'Solid effort! 👏';
    return 'Every miss is a lesson. Go again! 💪';
  });
}
