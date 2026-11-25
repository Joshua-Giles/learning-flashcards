import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { bestSets, masteredSets } from '../../core/logic/leaderboard';
import { ProgressStore } from '../../core/progress-store';
import { SetStore } from '../../core/set-store';
import { Heatmap } from '../../shared/heatmap';
import { TodayCard } from '../dashboard/today-card';

@Component({
  selector: 'lf-stats-page',
  imports: [RouterLink, Heatmap, TodayCard],
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Stats & leaderboard</h1>

    <div class="mt-6"><lf-today-card /></div>

    <section class="mt-8" aria-labelledby="activity-heading">
      <h2 id="activity-heading" class="mb-3 text-lg font-semibold">Activity</h2>
      <lf-heatmap
        [days]="progress.days()"
        [today]="progress.today()"
        [goal]="progress.dailyGoal()"
      />
    </section>

    <section class="mt-10" aria-labelledby="best-heading">
      <h2 id="best-heading" class="text-lg font-semibold">🏅 Best sets</h2>
      <p class="text-sm text-muted">Best accuracy on a full-set quiz.</p>
      @if (best().length) {
        <ol
          class="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface"
          data-testid="best-sets"
        >
          @for (row of best(); track row.set.id; let i = $index) {
            <li>
              <a
                [routerLink]="['/sets', row.set.id]"
                class="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
              >
                <span class="w-6 text-center font-semibold text-muted tabular-nums">{{
                  medal(i)
                }}</span>
                <span aria-hidden="true">{{ row.set.emoji }}</span>
                <span class="min-w-0 flex-1 truncate">{{ row.set.title }}</span>
                <span class="text-sm text-muted tabular-nums"
                  >{{ row.progress.totalPoints }} pts</span
                >
                <span class="w-12 text-right font-semibold tabular-nums"
                  >{{ row.progress.bestAccuracy }}%</span
                >
              </a>
            </li>
          }
        </ol>
      } @else {
        <p class="mt-3 text-sm text-muted">Finish a full quiz on any set to get on the board.</p>
      }
    </section>

    <section class="mt-10" aria-labelledby="mastered-heading">
      <h2 id="mastered-heading" class="text-lg font-semibold">🏆 Mastered</h2>
      <p class="text-sm text-muted">90%+ of a set's cards recalled on several different days.</p>
      @if (mastered().length) {
        <ul class="mt-3 grid gap-3 sm:grid-cols-2" data-testid="mastered-sets">
          @for (row of mastered(); track row.set.id) {
            <li>
              <a
                [routerLink]="['/sets', row.set.id]"
                class="flex items-center gap-3 rounded-xl border border-success/40 bg-success/5 p-3 hover:bg-success/10"
              >
                <span class="text-2xl" aria-hidden="true">{{ row.set.emoji }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-medium">{{ row.set.title }}</span>
                  <span class="text-xs text-muted">since {{ row.progress.masteredOn }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
      } @else {
        <p class="mt-3 text-sm text-muted">
          Nothing mastered yet. Quiz yourself on a few different days.
        </p>
      }
    </section>
  `,
})
export class StatsPage {
  protected readonly progress = inject(ProgressStore);
  private readonly setStore = inject(SetStore);

  protected readonly best = computed(() => bestSets(this.setStore.sets(), this.progress.sets()));
  protected readonly mastered = computed(() =>
    masteredSets(this.setStore.sets(), this.progress.sets()),
  );

  protected medal(index: number): string {
    return ['🥇', '🥈', '🥉'][index] ?? String(index + 1);
  }
}
