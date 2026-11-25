import { Component, input, output } from '@angular/core';
import { Card } from '../../core/models/set';
import { MarkdownLite } from '../../shared/markdown-lite';

/**
 * A two-sided card that flips on the Y axis. Purely presentational: the parent owns
 * `flipped` and reacts to `flip`. Keyboard flipping is handled by the page (Space)
 * plus an explicit "Show answer" button, so the card itself isn't a focus stop.
 * Render one instance per card (e.g. `@for (c of [card]; track c.id)`) so moving to
 * the next card never animates the old card's answer into view.
 */
@Component({
  selector: 'lf-flip-card',
  imports: [MarkdownLite],
  host: {
    class: 'block cursor-pointer select-none',
    '[class.flipped]': 'flipped()',
    '(click)': 'onClick($event)',
  },
  styles: `
    :host {
      perspective: 1600px;
    }
    .card {
      display: grid;
      transform-style: preserve-3d;
      transition: transform 450ms cubic-bezier(0.2, 0.7, 0.2, 1);
    }
    :host(.flipped) .card {
      transform: rotateY(180deg);
    }
    .face {
      grid-area: 1 / 1;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .back {
      transform: rotateY(180deg);
    }

    /* Reduced motion: crossfade instead of rotating. */
    @media (prefers-reduced-motion: reduce) {
      .card,
      :host(.flipped) .card {
        transform: none;
        transition: none;
      }
      .face {
        transition: opacity 200ms ease;
      }
      .back {
        transform: none;
        opacity: 0;
      }
      :host(.flipped) .back {
        opacity: 1;
      }
      :host(.flipped) .front {
        opacity: 0;
      }
    }
  `,
  template: `
    <div class="card">
      <div
        class="face front flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-surface p-8 text-center shadow-sm"
        [attr.aria-hidden]="flipped()"
        data-testid="card-front"
      >
        <span class="text-xs font-semibold tracking-wider text-muted uppercase">Question</span>
        <p class="text-xl leading-snug font-medium text-balance sm:text-2xl">{{ card().prompt }}</p>
        @if (showHint() && card().hint) {
          <p class="text-sm text-muted" data-testid="card-hint">💡 {{ card().hint }}</p>
        }
      </div>

      <div
        class="face back flex min-h-72 flex-col items-center justify-center gap-4 rounded-2xl border border-accent/40 bg-surface p-8 text-center shadow-sm"
        [attr.aria-hidden]="!flipped()"
        [inert]="!flipped()"
        data-testid="card-back"
      >
        <span class="text-xs font-semibold tracking-wider text-muted uppercase">Answer</span>
        <p class="text-2xl font-semibold text-balance text-accent sm:text-3xl">
          {{ card().answer }}
        </p>
        @if (card().details; as details) {
          <p class="max-w-prose text-sm leading-relaxed text-muted sm:text-base">
            <lf-md [text]="details" />
          </p>
        }
      </div>
    </div>
  `,
})
export class FlipCard {
  readonly card = input.required<Card>();
  readonly flipped = input(false);
  readonly showHint = input(false);
  readonly flip = output<void>();

  protected onClick(event: MouseEvent): void {
    // Let links in the details open without flipping the card back.
    if ((event.target as HTMLElement | null)?.closest('a')) return;
    this.flip.emit();
  }
}
