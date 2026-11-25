import { Component, computed, inject } from '@angular/core';
import { ProgressStore } from '../../core/progress-store';
import { ProgressRing } from '../../shared/progress-ring';

/** Today's points vs goal, current streak and best streak. */
@Component({
  selector: 'lf-today-card',
  imports: [ProgressRing],
  template: `
    <section
      class="flex flex-wrap items-center gap-6 rounded-2xl border border-line bg-surface p-5"
      aria-labelledby="today-heading"
      data-testid="today-card"
    >
      <lf-progress-ring [value]="progress.goalPct()" [size]="72" [stroke]="7">
        <span class="text-sm">{{ progress.goalPct() }}%</span>
      </lf-progress-ring>
      <div class="min-w-0 flex-1">
        <h2 id="today-heading" class="text-sm font-medium text-muted">Today</h2>
        <p class="text-2xl font-semibold whitespace-nowrap tabular-nums">
          {{ progress.todayStats().points }}
          <span class="text-base font-normal text-muted">/ {{ progress.dailyGoal() }} points</span>
        </p>
        <p class="mt-0.5 text-sm text-muted">{{ message() }}</p>
      </div>
      <dl class="flex w-full justify-around gap-6 sm:w-auto">
        <div class="text-center">
          <dt class="text-xs text-muted">Streak</dt>
          <dd class="text-2xl font-semibold tabular-nums" data-testid="today-streak">
            🔥 {{ progress.streak().current }}
          </dd>
        </div>
        <div class="text-center">
          <dt class="text-xs text-muted">Best</dt>
          <dd class="text-2xl font-semibold tabular-nums">{{ progress.streak().longest }}</dd>
        </div>
      </dl>
    </section>
  `,
})
export class TodayCard {
  protected readonly progress = inject(ProgressStore);

  protected readonly message = computed(() => {
    const { todayMet, atRisk, current } = this.progress.streak();
    const left = this.progress.dailyGoal() - this.progress.todayStats().points;
    if (todayMet) return 'Goal reached. See you tomorrow! 🎉';
    if (atRisk) return `${left} more points to keep your ${current}-day streak alive.`;
    if (this.progress.todayStats().points > 0) return `${left} more points to hit today's goal.`;
    return 'A quick quiz is about 10 points per right answer.';
  });
}
