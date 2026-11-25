import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideMenu, LucideMonitor, LucideMoon, LucideSearch, LucideSun } from '@lucide/angular';
import { LayoutService } from '../core/layout.service';
import { ProgressStore } from '../core/progress-store';
import { ProgressRing } from '../shared/progress-ring';
import { ThemeService } from '../core/theme.service';
import { SearchService } from '../features/search/search.service';

@Component({
  selector: 'lf-top-bar',
  imports: [
    RouterLink,
    ProgressRing,
    LucideMenu,
    LucideSearch,
    LucideSun,
    LucideMoon,
    LucideMonitor,
  ],
  host: {
    class:
      'sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur',
  },
  template: `
    <button
      type="button"
      class="icon-btn"
      (click)="layout.toggleSidebar()"
      [attr.aria-expanded]="layout.sidebarOpen()"
      aria-controls="lf-sidebar"
      [attr.aria-label]="layout.sidebarOpen() ? 'Hide sets' : 'Show sets'"
      data-testid="sidebar-toggle"
    >
      <svg lucideMenu [size]="20"></svg>
    </button>

    <a routerLink="/" class="flex items-center gap-2 rounded-md px-1 font-semibold tracking-tight">
      <span aria-hidden="true">🗂️</span>
      <span>Flashcards</span>
    </a>

    <div class="ml-auto flex items-center gap-1">
      <button
        type="button"
        class="icon-btn"
        (click)="search.open()"
        aria-label="Search (Ctrl+K)"
        title="Search (Ctrl+K or /)"
        aria-keyshortcuts="Control+K Meta+K /"
        data-testid="search-open"
      >
        <svg lucideSearch [size]="20"></svg>
      </button>
      <a
        routerLink="/stats"
        class="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface-2"
        [attr.aria-label]="statusLabel()"
        [title]="statusLabel()"
        data-testid="daily-status"
      >
        <lf-progress-ring [value]="progress.goalPct()" [size]="26">
          @if (progress.streak().todayMet) {
            ✓
          }
        </lf-progress-ring>
        <span class="tabular-nums" data-testid="today-points"
          >{{ progress.todayStats().points
          }}<span class="text-muted">/{{ progress.dailyGoal() }}</span></span
        >
        <span
          class="flex items-center gap-0.5 font-medium tabular-nums"
          [class.text-muted]="progress.streak().current === 0"
          [class.animate-pulse]="progress.streak().atRisk"
          data-testid="streak"
          [attr.data-at-risk]="progress.streak().atRisk"
          ><span aria-hidden="true" [class.grayscale]="!progress.streak().todayMet">🔥</span
          >{{ progress.streak().current }}</span
        >
      </a>
      <button
        type="button"
        class="icon-btn"
        (click)="theme.cycle()"
        [attr.aria-label]="themeLabel()"
        [title]="themeLabel()"
        data-testid="theme-toggle"
      >
        @switch (theme.mode()) {
          @case ('light') {
            <svg lucideSun [size]="20"></svg>
          }
          @case ('dark') {
            <svg lucideMoon [size]="20"></svg>
          }
          @default {
            <svg lucideMonitor [size]="20"></svg>
          }
        }
      </button>
    </div>
  `,
})
export class TopBar {
  protected readonly layout = inject(LayoutService);
  protected readonly theme = inject(ThemeService);

  protected readonly progress = inject(ProgressStore);
  protected readonly search = inject(SearchService);

  protected readonly statusLabel = computed(() => {
    const { points } = this.progress.todayStats();
    const goal = this.progress.dailyGoal();
    const { current, atRisk, todayMet } = this.progress.streak();
    const streak = current === 1 ? '1-day streak' : `${current}-day streak`;
    if (todayMet) return `Daily goal reached (${points} points). ${streak}! View stats`;
    if (atRisk)
      return `${points} of ${goal} points today. Reach your goal to keep your ${streak}. View stats`;
    return `${points} of ${goal} points today. ${streak}. View stats`;
  });

  protected readonly themeLabel = computed(() => {
    const names = { light: 'Light', dark: 'Dark', system: 'System' } as const;
    return `Theme: ${names[this.theme.mode()]} (click to change)`;
  });
}
