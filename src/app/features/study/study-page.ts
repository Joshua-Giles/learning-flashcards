import {
  Component,
  ElementRef,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideChevronLeft,
  LucideChevronRight,
  LucideShuffle,
} from '@lucide/angular';
import { AwardFeedback } from '../../core/award-feedback';
import { shouldIgnoreShortcut } from '../../core/keyboard';
import { stillLearning } from '../../core/logic/mastery';
import { Award, ProgressStore } from '../../core/progress-store';
import { SetStore } from '../../core/set-store';
import { FlipCard } from './flip-card';
import { StudyGrade, StudySession } from './study-session';
import { StudySummaryPanel } from './study-summary';

@Component({
  selector: 'lf-study-page',
  imports: [
    RouterLink,
    FlipCard,
    StudySummaryPanel,
    LucideArrowLeft,
    LucideChevronLeft,
    LucideChevronRight,
    LucideShuffle,
  ],
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    @if (set.error()) {
      <h1 class="text-2xl font-semibold">Set not found</h1>
      <a routerLink="/" class="link mt-2 inline-block">Back home</a>
    } @else if (set.hasValue()) {
      <header class="mb-6 flex items-center gap-3">
        <a
          [routerLink]="['/sets', setId()]"
          class="icon-btn"
          [attr.aria-label]="'Back to ' + set.value().title"
        >
          <svg lucideArrowLeft [size]="20"></svg>
        </a>
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-lg font-semibold">{{ set.value().title }}</h1>
          <p class="text-sm text-muted">
            Study{{ only() === 'learning' ? ' · still learning' : '' }}
          </p>
        </div>
        @if (!session.finished()) {
          <span class="text-sm text-muted tabular-nums" data-testid="study-position">
            {{ session.position() }} / {{ session.total() }}
          </span>
        }
      </header>

      @if (session.finished()) {
        <lf-study-summary
          [summary]="session.summary()"
          [setId]="setId()"
          [points]="sessionPoints()"
          (restartMissed)="begin(session.summary().learningCards)"
          (restartAll)="begin(set.value().cards)"
        />
      } @else if (session.current(); as card) {
        <!-- Focus target after button clicks, so Space/1/2 keep driving the session. -->
        <div #stage tabindex="-1" class="outline-none">
          <div
            class="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label="Cards studied"
            [attr.aria-valuenow]="session.gradedCount()"
            [attr.aria-valuemax]="session.total()"
            aria-valuemin="0"
          >
            <div
              class="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
              [style.width.%]="(session.gradedCount() / session.total()) * 100"
            ></div>
          </div>

          @for (c of [card]; track c.id) {
            <lf-flip-card
              animate.enter="card-enter"
              [card]="c"
              [flipped]="session.flipped()"
              [showHint]="session.hintShown()"
              (flip)="session.flip()"
            />
          }

          <p class="sr-only" aria-live="polite">
            {{ session.flipped() ? 'Answer: ' + card.answer : '' }}
          </p>

          <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
            @if (session.flipped()) {
              <button
                type="button"
                class="btn btn-secondary min-w-40"
                (click)="act(gradeLearning)"
                data-testid="grade-learning"
              >
                Still learning <kbd>1</kbd>
              </button>
              <button
                type="button"
                class="btn btn-primary min-w-40"
                (click)="act(gradeKnew)"
                data-testid="grade-knew"
              >
                Knew it <kbd>2</kbd>
              </button>
            } @else {
              <button
                type="button"
                class="btn btn-primary min-w-40"
                (click)="act(() => session.flip())"
                data-testid="show-answer"
              >
                Show answer <kbd>Space</kbd>
              </button>
              @if (card.hint && !session.hintShown()) {
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="act(() => session.showHint())"
                >
                  Hint <kbd>H</kbd>
                </button>
              }
            }
          </div>

          <div class="mt-8 flex items-center justify-between text-muted">
            <button
              type="button"
              class="icon-btn"
              (click)="act(() => session.prev())"
              [disabled]="session.isFirst()"
              aria-label="Previous card"
            >
              <svg lucideChevronLeft [size]="20"></svg>
            </button>
            <button
              type="button"
              class="btn px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-fg"
              (click)="act(reshuffle)"
            >
              <svg lucideShuffle [size]="16"></svg> Shuffle &amp; restart <kbd>S</kbd>
            </button>
            <button
              type="button"
              class="icon-btn"
              (click)="act(() => session.next())"
              [attr.aria-label]="session.isLast() ? 'Finish' : 'Next card'"
            >
              <svg lucideChevronRight [size]="20"></svg>
            </button>
          </div>

          <p class="mt-6 hidden text-center text-xs text-muted sm:block">
            <kbd>Space</kbd> flip · <kbd>1</kbd> still learning · <kbd>2</kbd> knew it ·
            <kbd>←</kbd>/<kbd>→</kbd> move · <kbd>H</kbd> hint · <kbd>S</kbd> shuffle
          </p>
        </div>
      }
    } @else {
      <p class="text-muted" aria-live="polite">Loading…</p>
    }
  `,
})
export class StudyPage {
  private readonly store = inject(SetStore);
  private readonly title = inject(Title);

  /** Route param. */
  readonly setId = input.required<string>();
  /** Optional `?card=<id>` query param to start at a specific card (used by search). */
  readonly card = input<string>();

  private readonly progress = inject(ProgressStore);
  private readonly feedback = inject(AwardFeedback);

  /** Optional `?only=learning` query param: just the cards still being learned. */
  readonly only = input<string>();

  protected readonly session = new StudySession();
  protected readonly sessionPoints = signal(0);
  private passRecorded = false;
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  protected readonly set = resource({
    params: () => this.setId(),
    loader: ({ params }) => this.store.getSet(params),
  });

  constructor() {
    effect(() => {
      if (!this.set.hasValue()) return;
      const set = this.set.value();
      const startAt = this.card();
      const only = this.only();
      untracked(() => {
        const cards =
          only === 'learning' ? stillLearning(set.id, set.cards, this.progress.cards()) : set.cards;
        this.begin(cards.length ? cards : set.cards, { startAt });
        this.title.setTitle(`Study: ${set.title} · Flashcards`);
      });
    });

    // Record the pass once when the session reaches its summary.
    effect(() => {
      if (!this.session.finished() || this.passRecorded) return;
      this.passRecorded = true;
      untracked(() => {
        const s = this.session.summary();
        const full =
          this.set.hasValue() && s.total === this.set.value().cards.length && s.skipped === 0;
        this.applyAward(this.progress.recordStudyPass(this.setId(), full));
      });
    });
  }

  /** Start a new session (resets per-session points). */
  protected begin(
    cards: Parameters<StudySession['start']>[0],
    options: { shuffle?: boolean; startAt?: string } = {},
  ): void {
    this.passRecorded = false;
    this.sessionPoints.set(0);
    this.session.start(cards, options);
  }

  protected readonly gradeLearning = () => this.grade('learning');
  protected readonly gradeKnew = () => this.grade('knew');

  private grade(grade: StudyGrade): void {
    const card = this.session.current();
    if (!card || !this.session.flipped()) return;
    this.session.grade(grade);
    this.applyAward(this.progress.recordStudyGrade(this.setId(), card.id, grade === 'knew'));
  }

  private applyAward(award: Award): void {
    this.sessionPoints.update((p) => p + award.points);
    this.feedback.announce(award);
  }

  /**
   * Run a button action, then park focus on the stage. The clicked button is often
   * removed by the action; without this a quick Space could hit the stale button
   * instead of flipping the next card.
   */
  protected act(action: () => void): void {
    action();
    this.stage()?.nativeElement.focus({ preventScroll: true });
  }

  /** Shuffle the whole set and start over. Arrow property so it can be passed to act(). */
  protected readonly reshuffle = (): void => {
    if (this.set.hasValue()) this.begin(this.set.value().cards, { shuffle: true });
  };

  protected onKeydown(event: KeyboardEvent): void {
    if (shouldIgnoreShortcut(event) || !this.set.hasValue() || this.session.finished()) return;
    const s = this.session;

    switch (event.key) {
      case ' ':
      case 'Enter':
        s.flip();
        break;
      case '1':
        this.grade('learning');
        break;
      case '2':
        this.grade('knew');
        break;
      case 'ArrowRight':
        s.next();
        break;
      case 'ArrowLeft':
        s.prev();
        break;
      case 'h':
      case 'H':
        s.showHint();
        break;
      case 's':
      case 'S':
        this.reshuffle();
        break;
      default:
        return;
    }
    event.preventDefault();
  }
}
