import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideChevronRight } from '@lucide/angular';
import { filter, map } from 'rxjs';
import { SetCategory, SetSummary } from '../core/models/set';
import { SidebarSections, categoryKey, groupKey } from '../core/sidebar-sections';
import { LayoutService } from '../core/layout.service';
import { approxSetMasteryPct } from '../core/logic/mastery';
import { ProgressStore } from '../core/progress-store';
import { ProgressRing } from '../shared/progress-ring';
import { SetStore } from '../core/set-store';

@Component({
  selector: 'lf-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    A11yModule,
    ProgressRing,
    NgTemplateOutlet,
    LucideChevronRight,
  ],
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
      [cdkTrapFocusAutoCapture]="layout.isMobile() && layout.sidebarOpen()"
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
          <li>
            <a
              routerLink="/settings"
              class="nav-link"
              routerLinkActive="active"
              (click)="layout.closeIfMobile()"
              >⚙️ Settings</a
            >
          </li>
        </ul>

        @switch (sets.status()) {
          @case ('error') {
            <p class="px-2 text-sm text-muted">Couldn't load sets. Try refreshing.</p>
          }
          @case ('ready') {
            @if (sets.categories().length) {
              <div class="flex items-center justify-between px-2">
                <span class="text-xs font-semibold tracking-wider text-muted uppercase">Sets</span>
                <button
                  type="button"
                  class="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-surface-2 hover:text-fg pointer-coarse:min-h-11"
                  (click)="sections.anyCollapsed() ? sections.expandAll() : collapseAll()"
                  data-testid="collapse-all"
                >
                  {{ sections.anyCollapsed() ? 'Expand all' : 'Collapse all' }}
                </button>
              </div>
            }
            @for (category of sets.categories(); track category.name; let ci = $index) {
              <section [attr.aria-labelledby]="'cat-' + ci" class="-mt-3">
                <h2 [id]="'cat-' + ci">
                  <button
                    type="button"
                    class="section-toggle text-xs font-semibold tracking-wider text-muted uppercase"
                    [attr.aria-expanded]="!sections.isCollapsed(catKey(category.name))"
                    [attr.aria-controls]="'cat-list-' + ci"
                    (click)="sections.toggle(catKey(category.name))"
                    [attr.data-testid]="'category-' + category.name"
                  >
                    <svg
                      lucideChevronRight
                      [size]="14"
                      class="shrink-0 transition-transform motion-reduce:transition-none"
                      [class.rotate-90]="!sections.isCollapsed(catKey(category.name))"
                    ></svg>
                    <span class="flex-1 text-left">{{ category.name }}</span>
                    @if (sections.isCollapsed(catKey(category.name)) && holdsActive(category)) {
                      <span class="size-1.5 rounded-full bg-accent" aria-hidden="true"></span>
                    }
                  </button>
                </h2>
                <div
                  [id]="'cat-list-' + ci"
                  [hidden]="sections.isCollapsed(catKey(category.name))"
                  class="mt-1 flex flex-col gap-1"
                >
                  @for (group of category.groups; track group.name; let gi = $index) {
                    <div>
                      <button
                        type="button"
                        class="section-toggle text-sm font-medium"
                        [attr.aria-expanded]="
                          !sections.isCollapsed(grpKey(category.name, group.name))
                        "
                        [attr.aria-controls]="'grp-' + ci + '-' + gi"
                        (click)="sections.toggle(grpKey(category.name, group.name))"
                        [attr.data-testid]="'group-' + group.name"
                      >
                        <svg
                          lucideChevronRight
                          [size]="14"
                          class="shrink-0 text-muted transition-transform motion-reduce:transition-none"
                          [class.rotate-90]="
                            !sections.isCollapsed(grpKey(category.name, group.name))
                          "
                        ></svg>
                        <span aria-hidden="true">{{ group.sets[0].emoji }}</span>
                        <span class="min-w-0 flex-1 truncate text-left">{{ group.name }}</span>
                        @if (
                          sections.isCollapsed(grpKey(category.name, group.name)) &&
                          holdsActiveSet(group.sets)
                        ) {
                          <span class="size-1.5 rounded-full bg-accent" aria-hidden="true"></span>
                        }
                        <span class="text-xs text-muted tabular-nums">{{ group.sets.length }}</span>
                      </button>
                      <ul
                        [id]="'grp-' + ci + '-' + gi"
                        [hidden]="sections.isCollapsed(grpKey(category.name, group.name))"
                        class="ml-4 flex flex-col gap-0.5 border-l border-line pl-1"
                      >
                        @for (set of group.sets; track set.id) {
                          <li>
                            <ng-container
                              *ngTemplateOutlet="
                                setLink;
                                context: { $implicit: set, group: group.name }
                              "
                            />
                          </li>
                        }
                      </ul>
                    </div>
                  }
                  @if (category.sets.length) {
                    <ul class="flex flex-col gap-0.5">
                      @for (set of category.sets; track set.id) {
                        <li>
                          <ng-container *ngTemplateOutlet="setLink; context: { $implicit: set }" />
                        </li>
                      }
                    </ul>
                  }
                </div>
              </section>
            } @empty {
              <p class="px-2 text-sm text-muted">No sets yet.</p>
            }
          }
        }

        <ng-template #setLink let-set let-group="group">
          <a
            [routerLink]="['/sets', set.id]"
            class="nav-link"
            routerLinkActive="active"
            (click)="layout.closeIfMobile()"
            [attr.data-testid]="'set-link-' + set.id"
          >
            @if (!group) {
              <span aria-hidden="true">{{ set.emoji }}</span>
            }
            <span class="min-w-0 flex-1 truncate">{{ shortTitle(set.title, group) }}</span>
            <lf-progress-ring
              [value]="mastery()[set.id] ?? 0"
              [size]="20"
              [stroke]="2.5"
              [label]="(mastery()[set.id] ?? 0) + '% mastered'"
            />
          </a>
        </ng-template>
      </nav>
    </aside>
  `,
})
export class Sidebar {
  protected readonly layout = inject(LayoutService);
  protected readonly sets = inject(SetStore);
  private readonly progress = inject(ProgressStore);

  /** Mastery % per set id, for the sidebar rings. */
  protected readonly mastery = computed(() => {
    const cards = this.progress.cards();
    return Object.fromEntries(
      this.sets.sets().map((s) => [s.id, approxSetMasteryPct(s.id, s.quizzableCount, cards)]),
    ) as Record<string, number>;
  });

  protected readonly sections = inject(SidebarSections);
  protected readonly catKey = categoryKey;
  protected readonly grpKey = groupKey;

  /** Set id in the current URL (/sets/:id/...), so collapsed sections can show a dot. */
  private readonly activeSetId = toSignal(
    inject(Router).events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => /^\/sets\/([^/?#]+)/.exec(e.urlAfterRedirects)?.[1]),
    ),
  );

  protected holdsActiveSet(sets: readonly SetSummary[]): boolean {
    const id = this.activeSetId();
    return !!id && sets.some((s) => s.id === id);
  }

  protected holdsActive(category: SetCategory): boolean {
    return this.holdsActiveSet([...category.sets, ...category.groups.flatMap((g) => g.sets)]);
  }

  /** "Nick Drake: Pink Moon" under the "Nick Drake" group reads as just "Pink Moon". */
  protected shortTitle(title: string, group?: string): string {
    const prefix = group ? group + ': ' : '';
    return prefix && title.startsWith(prefix) ? title.slice(prefix.length) : title;
  }

  protected collapseAll(): void {
    this.sections.collapseAll(
      this.sets
        .categories()
        .flatMap((c) => [categoryKey(c.name), ...c.groups.map((g) => groupKey(c.name, g.name))]),
    );
  }

  protected onEscape(): void {
    this.layout.closeIfMobile();
  }
}
