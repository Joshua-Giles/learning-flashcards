import { A11yModule } from '@angular/cdk/a11y';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../core/layout.service';
import { SetStore } from '../core/set-store';

@Component({
  selector: 'lf-sidebar',
  imports: [RouterLink, RouterLinkActive, A11yModule],
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
  styles: `
    /* visibility flips at the end of a close and the start of an open, so the
       slide stays visible while a collapsed panel is fully hidden (incl. from AT). */
    .panel {
      transition:
        width 220ms ease,
        transform 220ms ease,
        opacity 180ms ease,
        visibility 220ms;
    }
    @media (prefers-reduced-motion: reduce) {
      .panel {
        transition: none;
      }
    }
  `,
  template: `
    @if (layout.isMobile() && layout.sidebarOpen()) {
      <div
        class="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        (click)="layout.setSidebarOpen(false)"
      ></div>
    }

    <aside
      id="lf-sidebar"
      class="panel overflow-hidden border-line bg-surface"
      [class]="
        layout.isMobile()
          ? 'fixed inset-y-0 left-0 z-50 w-72 border-r shadow-xl'
          : 'sticky top-14 h-[calc(100dvh-3.5rem)] shrink-0 ' +
            (layout.sidebarOpen() ? 'w-64 border-r' : 'w-0')
      "
      [class.-translate-x-full]="layout.isMobile() && !layout.sidebarOpen()"
      [class.opacity-0]="!layout.sidebarOpen()"
      [class.invisible]="!layout.sidebarOpen()"
      [inert]="!layout.sidebarOpen()"
      [cdkTrapFocus]="layout.isMobile() && layout.sidebarOpen()"
      [cdkTrapFocusAutoCapture]="true"
      data-testid="sidebar"
    >
      <nav aria-label="Card sets" class="flex h-full w-64 flex-col gap-6 overflow-y-auto p-3">
        <ul class="flex flex-col gap-0.5">
          <li>
            <a
              routerLink="/"
              class="nav-link"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
              (click)="layout.closeIfMobile()"
              >🏠 Home</a
            >
          </li>
          <li>
            <a
              routerLink="/stats"
              class="nav-link"
              routerLinkActive="active"
              (click)="layout.closeIfMobile()"
              >🏆 Stats</a
            >
          </li>
          <li>
            <a
              routerLink="/questions"
              class="nav-link"
              routerLinkActive="active"
              (click)="layout.closeIfMobile()"
              >📝 Questions</a
            >
          </li>
        </ul>

        @switch (sets.status()) {
          @case ('error') {
            <p class="px-2 text-sm text-muted">Couldn't load sets. Try refreshing.</p>
          }
          @case ('ready') {
            @for (category of sets.categories(); track category.name) {
              <section [attr.aria-labelledby]="'cat-' + $index">
                <h2
                  [id]="'cat-' + $index"
                  class="mb-1 px-2 text-xs font-semibold tracking-wider text-muted uppercase"
                >
                  {{ category.name }}
                </h2>
                <ul class="flex flex-col gap-0.5">
                  @for (set of category.sets; track set.id) {
                    <li>
                      <a
                        [routerLink]="['/sets', set.id]"
                        class="nav-link"
                        routerLinkActive="active"
                        (click)="layout.closeIfMobile()"
                        [attr.data-testid]="'set-link-' + set.id"
                      >
                        <span aria-hidden="true">{{ set.emoji }}</span>
                        <span class="min-w-0 flex-1 truncate">{{ set.title }}</span>
                        <span class="text-xs text-muted tabular-nums">{{ set.cardCount }}</span>
                      </a>
                    </li>
                  }
                </ul>
              </section>
            } @empty {
              <p class="px-2 text-sm text-muted">No sets yet.</p>
            }
          }
        }
      </nav>
    </aside>
  `,
})
export class Sidebar {
  protected readonly layout = inject(LayoutService);
  protected readonly sets = inject(SetStore);

  protected onEscape(): void {
    this.layout.closeIfMobile();
  }
}
