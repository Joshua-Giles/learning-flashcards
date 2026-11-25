import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { continueSet, freshPicks, gatheringDust } from '../../core/logic/leaderboard';
import { approxSetMasteryPct } from '../../core/logic/mastery';
import { ProgressStore } from '../../core/progress-store';
import { SetStore } from '../../core/set-store';
import { ProgressRing } from '../../shared/progress-ring';
import { TodayCard } from './today-card';

@Component({
  selector: 'lf-dashboard',
  imports: [RouterLink, ProgressRing, TodayCard],
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">{{ greeting() }}</h1>

    @if (sets.status() === 'error') {
      <p class="mt-6 rounded-lg border border-line bg-surface p-4 text-sm">
        Couldn't load your sets. Check that <code>public/sets/index.json</code> exists (run
        <code>npm run sets:check</code>) and refresh.
      </p>
    }

    <div class="mt-6"><lf-today-card /></div>

    @if (resume(); as r) {
      <a
        [routerLink]="['/sets', r.set.id]"
        class="mt-4 flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/5 p-4 hover:bg-accent/10"
        data-testid="continue"
      >
        <span class="text-2xl" aria-hidden="true">{{ r.set.emoji }}</span>
        <span class="min-w-0 flex-1">
          <span class="block text-xs text-muted">Continue where you left off</span>
          <span class="block truncate font-medium">{{ r.set.title }}</span>
        </span>
        <span class="text-accent" aria-hidden="true">→</span>
      </a>
    }

    @if (dusty().length) {
      <section class="mt-8" aria-labelledby="dust-heading">
        <h2 id="dust-heading" class="text-lg font-semibold">🕸️ Gathering dust</h2>
        <p class="text-sm text-muted">
          Not studied in a week or more. A quick review keeps them fresh.
        </p>
        <ul class="mt-3 flex flex-col gap-2" data-testid="dusty-sets">
          @for (row of dusty(); track row.set.id) {
            <li>
              <a
                [routerLink]="['/sets', row.set.id, 'quiz']"
                class="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-surface-2"
              >
                <span aria-hidden="true">{{ row.set.emoji }}</span>
                <span class="min-w-0 flex-1 truncate">{{ row.set.title }}</span>
                <span class="text-sm text-muted">{{ row.daysAgo }} days ago</span>
              </a>
            </li>
          }
        </ul>
      </section>
    }

    @if (fresh().length) {
      <section class="mt-8" aria-labelledby="fresh-heading">
        <h2 id="fresh-heading" class="text-lg font-semibold">✨ Fresh picks</h2>
        <p class="text-sm text-muted">Sets you haven't tried yet.</p>
        <ul class="mt-3 grid gap-3 sm:grid-cols-2" data-testid="fresh-sets">
          @for (set of fresh(); track set.id) {
            <li>
              <a [routerLink]="['/sets', set.id]" class="set-card group">
                <span class="text-2xl" aria-hidden="true">{{ set.emoji }}</span>
                <span class="font-medium group-hover:text-accent">{{ set.title }}</span>
                <span class="line-clamp-2 text-sm text-muted">{{ set.description }}</span>
                <span class="mt-auto pt-2 text-xs text-muted">{{ set.cardCount }} cards</span>
              </a>
            </li>
          }
        </ul>
      </section>
    }

    <section class="mt-8" aria-labelledby="all-heading">
      <h2 id="all-heading" class="text-lg font-semibold">All sets</h2>
      <ul class="mt-3 grid gap-3 sm:grid-cols-2">
        @for (set of sets.sets(); track set.id) {
          <li>
            <a [routerLink]="['/sets', set.id]" class="set-card group">
              <span class="flex items-start justify-between">
                <span class="text-2xl" aria-hidden="true">{{ set.emoji }}</span>
                <lf-progress-ring
                  [value]="mastery()[set.id]"
                  [size]="32"
                  [label]="mastery()[set.id] + '% mastered'"
                >
                  <span class="text-[0.55rem]">{{ mastery()[set.id] }}</span>
                </lf-progress-ring>
              </span>
              <span class="font-medium group-hover:text-accent">{{ set.title }}</span>
              <span class="line-clamp-2 text-sm text-muted">{{ set.description }}</span>
              <span class="mt-auto pt-2 text-xs text-muted">{{ set.cardCount }} cards</span>
            </a>
          </li>
        }
      </ul>
    </section>
  `,
})
export class Dashboard {
  protected readonly sets = inject(SetStore);
  private readonly progress = inject(ProgressStore);

  protected readonly resume = computed(() => continueSet(this.sets.sets(), this.progress.sets()));
  protected readonly dusty = computed(() =>
    gatheringDust(this.sets.sets(), this.progress.sets(), this.progress.today()),
  );
  protected readonly fresh = computed(() => freshPicks(this.sets.sets(), this.progress.sets()));
  protected readonly mastery = computed(() => {
    const cards = this.progress.cards();
    return Object.fromEntries(
      this.sets.sets().map((s) => [s.id, approxSetMasteryPct(s.id, s.quizzableCount, cards)]),
    ) as Record<string, number>;
  });

  protected readonly greeting = computed(() => {
    const { todayMet, atRisk } = this.progress.streak();
    if (todayMet) return 'Nice work today! 🎉';
    if (atRisk) return 'Keep the streak alive 🔥';
    return 'Ready to learn something?';
  });
}
