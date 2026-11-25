import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SetStore } from '../../core/set-store';

/** Placeholder dashboard: becomes the Today / leaderboard view in T11. */
@Component({
  selector: 'lf-dashboard',
  imports: [RouterLink],
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Ready to learn something?</h1>
    <p class="mt-1 text-muted">Pick a set to start flipping.</p>

    @if (sets.status() === 'error') {
      <p class="mt-6 rounded-lg border border-line bg-surface p-4 text-sm">
        Couldn't load your sets. Check that <code>public/sets/index.json</code> exists (run
        <code>npm run sets:check</code>) and refresh.
      </p>
    }

    <ul class="mt-6 grid gap-3 sm:grid-cols-2">
      @for (set of sets.sets(); track set.id) {
        <li>
          <a
            [routerLink]="['/sets', set.id]"
            class="group flex h-full flex-col gap-1 rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span class="text-2xl" aria-hidden="true">{{ set.emoji }}</span>
            <span class="font-medium group-hover:text-accent">{{ set.title }}</span>
            <span class="line-clamp-2 text-sm text-muted">{{ set.description }}</span>
            <span class="mt-auto pt-2 text-xs text-muted">{{ set.cardCount }} cards</span>
          </a>
        </li>
      }
    </ul>
  `,
})
export class Dashboard {
  protected readonly sets = inject(SetStore);
}
