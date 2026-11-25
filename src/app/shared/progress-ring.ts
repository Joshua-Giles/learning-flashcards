import { Component, computed, input } from '@angular/core';

/** Circular progress (0–100). Decorative by default; pass `label` to expose it to AT. */
@Component({
  selector: 'lf-progress-ring',
  host: {
    class: 'relative inline-grid shrink-0 place-items-center',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': 'label() ? null : "true"',
  },
  template: `
    <svg [attr.viewBox]="'0 0 ' + size() + ' ' + size()" class="absolute inset-0 -rotate-90">
      <circle
        [attr.cx]="size() / 2"
        [attr.cy]="size() / 2"
        [attr.r]="radius()"
        fill="none"
        stroke="var(--lf-line)"
        [attr.stroke-width]="stroke()"
      />
      <circle
        [attr.cx]="size() / 2"
        [attr.cy]="size() / 2"
        [attr.r]="radius()"
        fill="none"
        [attr.stroke]="done() ? 'var(--lf-success)' : 'var(--lf-accent)'"
        [attr.stroke-width]="stroke()"
        stroke-linecap="round"
        [attr.stroke-dasharray]="circumference()"
        [attr.stroke-dashoffset]="offset()"
        class="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
      />
    </svg>
    <span class="relative text-[0.65rem] leading-none font-semibold tabular-nums">
      <ng-content />
    </span>
  `,
})
export class ProgressRing {
  readonly value = input(0);
  readonly size = input(28);
  readonly stroke = input(3);
  readonly label = input<string>();

  protected readonly radius = computed(() => (this.size() - this.stroke()) / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly clamped = computed(() => Math.max(0, Math.min(100, this.value())));
  protected readonly offset = computed(() => this.circumference() * (1 - this.clamped() / 100));
  protected readonly done = computed(() => this.clamped() >= 100);
}
