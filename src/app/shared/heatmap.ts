import { Component, ElementRef, computed, inject, input, signal } from '@angular/core';
import { HeatCell, buildHeatmap } from '../core/logic/heatmap';
import { LayoutService } from '../core/layout.service';
import { addDays, parseLocalDay } from '../core/logic/local-day';
import { DayStats, LocalDay } from '../core/models/state';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LEVEL_CLASS = [
  'bg-surface-2',
  'bg-accent/25',
  'bg-accent/50',
  'bg-accent/80',
  'bg-accent',
] as const;

/**
 * GitHub-style activity grid. One tab stop; arrow keys move between days
 * (←/→ = a week, ↑/↓ = a day). The focused day's details show underneath.
 */
@Component({
  selector: 'lf-heatmap',
  template: `
    <div class="overflow-x-auto pb-1">
      <div
        role="grid"
        [attr.aria-label]="'Daily points, last ' + shownWeeks() + ' weeks'"
        class="inline-flex flex-col"
        [class]="compact() ? 'gap-1' : 'gap-[3px]'"
        data-testid="heatmap"
      >
        @for (row of grid(); track $index; let r = $index) {
          <div role="row" class="flex items-center" [class]="compact() ? 'gap-1' : 'gap-[3px]'">
            <span class="w-7 text-[0.6rem] text-muted" aria-hidden="true">{{
              r % 2 === 1 ? weekdays[r] : ''
            }}</span>
            @for (cell of row; track cell.day; let c = $index) {
              <span
                role="gridcell"
                class="rounded-[3px] outline-offset-1"
                [class]="cellClass(cell)"
                [class.ring-1]="cell.day === focusDay()"
                [class.ring-accent]="cell.day === focusDay()"
                [attr.tabindex]="cell.day === focusDay() ? 0 : -1"
                [attr.data-day]="cell.day"
                [attr.aria-label]="describe(cell)"
                [attr.aria-hidden]="cell.future ? 'true' : null"
                [title]="describe(cell)"
                (focus)="active.set(cell.day)"
                (click)="active.set(cell.day)"
                (keydown)="onKeydown($event)"
              ></span>
            }
          </div>
        }
      </div>
    </div>
    <p class="mt-2 text-xs text-muted" aria-hidden="true" data-testid="heatmap-detail">
      {{ activeCell() ? describe(activeCell()!) : '' }}
    </p>
    <div class="mt-1 flex items-center gap-1 text-[0.6rem] text-muted" aria-hidden="true">
      Less
      @for (cls of levelClass; track cls) {
        <span class="size-2.5 rounded-[2px]" [class]="cls"></span>
      }
      More
    </div>
  `,
})
export class Heatmap {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly days = input.required<Readonly<Record<LocalDay, DayStats>>>();
  readonly today = input.required<LocalDay>();
  readonly goal = input.required<number>();
  readonly weeks = input(26);

  /**
   * On phones, show fewer, bigger days: 13 weeks of 20px cells on a 24px pitch keeps
   * every day tappable (WCAG 2.5.8 target size, spacing exception) without scrolling.
   */
  protected readonly compact = inject(LayoutService).isMobile;
  protected readonly shownWeeks = computed(() =>
    this.compact() ? Math.min(13, this.weeks()) : this.weeks(),
  );

  protected readonly weekdays = WEEKDAYS;
  protected readonly levelClass = LEVEL_CLASS;
  protected readonly grid = computed(() =>
    buildHeatmap(this.days(), this.today(), this.goal(), this.shownWeeks()),
  );

  /** Day picked by the user (null until they move); focusDay falls back to today. */
  protected readonly active = signal<LocalDay | null>(null);
  protected readonly focusDay = computed(() => this.active() ?? this.today());
  private readonly cells = computed(() => {
    const map = new Map<LocalDay, HeatCell>();
    for (const row of this.grid()) for (const cell of row) map.set(cell.day, cell);
    return map;
  });
  protected readonly activeCell = computed(() => this.cells().get(this.focusDay()));

  protected cellClass(cell: HeatCell): string {
    const size = this.compact() ? 'size-5' : 'size-3';
    return `${size} ${cell.future ? 'invisible' : this.levelClass[cell.level]}`;
  }

  protected describe(cell: HeatCell): string {
    const date = parseLocalDay(cell.day).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (cell.points === 0) return `${date}: no activity`;
    return `${date}: ${cell.points} points${cell.goalMet ? ' · goal met 🔥' : ''}`;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const step = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const cell = this.cells().get(addDays(this.focusDay(), step));
    if (!cell || cell.future) return;
    this.active.set(cell.day);
    this.host.nativeElement.querySelector<HTMLElement>(`[data-day="${cell.day}"]`)?.focus();
  }
}
