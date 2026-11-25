import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StudySummary } from './study-session';

@Component({
  selector: 'lf-study-summary',
  imports: [RouterLink],
  template: `
    <section
      class="rounded-2xl border border-line bg-surface p-6 sm:p-8"
      aria-labelledby="summary-heading"
      data-testid="study-summary"
    >
      <h2 id="summary-heading" class="text-2xl font-semibold tracking-tight">
        {{ headline() }}
      </h2>

      <dl class="mt-6 grid grid-cols-3 gap-3 text-center">
        <div class="rounded-xl bg-surface-2 p-3">
          <dt class="text-xs text-muted">Knew it</dt>
          <dd class="text-2xl font-semibold text-success tabular-nums" data-testid="summary-knew">
            {{ summary().knew }}
          </dd>
        </div>
        <div class="rounded-xl bg-surface-2 p-3">
          <dt class="text-xs text-muted">Still learning</dt>
          <dd class="text-2xl font-semibold tabular-nums" data-testid="summary-learning">
            {{ summary().learning }}
          </dd>
        </div>
        <div class="rounded-xl bg-surface-2 p-3">
          <dt class="text-xs text-muted">Skipped</dt>
          <dd class="text-2xl font-semibold text-muted tabular-nums">{{ summary().skipped }}</dd>
        </div>
      </dl>

      @if (summary().learningCards.length) {
        <h3 class="mt-6 text-sm font-semibold">Worth another look</h3>
        <ul class="mt-2 divide-y divide-line text-sm">
          @for (card of summary().learningCards; track card.id) {
            <li class="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
              <span>{{ card.prompt }}</span>
              <span class="font-medium text-accent">{{ card.answer }}</span>
            </li>
          }
        </ul>
      }

      <div class="mt-8 flex flex-wrap gap-3">
        <a [routerLink]="['/sets', setId(), 'quiz']" class="btn btn-primary" data-testid="quiz-now">
          Quiz me now
        </a>
        @if (summary().learning > 0) {
          <button type="button" class="btn btn-secondary" (click)="restartMissed.emit()">
            Study the {{ summary().learning }} I'm still learning
          </button>
        }
        <button type="button" class="btn btn-secondary" (click)="restartAll.emit()">
          Study all again
        </button>
      </div>
    </section>
  `,
})
export class StudySummaryPanel {
  readonly summary = input.required<StudySummary>();
  readonly setId = input.required<string>();
  readonly restartMissed = output<void>();
  readonly restartAll = output<void>();

  protected headline(): string {
    const { knew, total } = this.summary();
    if (total > 0 && knew === total) return 'Flawless! 🎉';
    if (knew >= total / 2) return 'Nice work! 👏';
    return 'Good start — keep going! 💪';
  }
}
