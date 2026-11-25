import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideMenu, LucideMonitor, LucideMoon, LucideSun } from '@lucide/angular';
import { LayoutService } from '../core/layout.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'lf-top-bar',
  imports: [RouterLink, LucideMenu, LucideSun, LucideMoon, LucideMonitor],
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

  protected readonly themeLabel = computed(() => {
    const names = { light: 'Light', dark: 'Dark', system: 'System' } as const;
    return `Theme: ${names[this.theme.mode()]} (click to change)`;
  });
}
