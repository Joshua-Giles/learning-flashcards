import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
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
import { LucideArrowLeft } from '@lucide/angular';
import { AwardFeedback } from '../../core/award-feedback';
import { shouldIgnoreShortcut } from '../../core/keyboard';
import { orderWeakestFirst } from '../../core/logic/mastery';
import { POINTS, comboBonus, quizAnswerPoints } from '../../core/logic/scoring';
import { Award, ProgressStore } from '../../core/progress-store';
import { Card } from '../../core/models/set';
import { SetStore } from '../../core/set-store';
import { MarkdownLite } from '../../shared/markdown-lite';
import { QUICK_QUIZ_SIZE, QuizSession } from './quiz-session';
import { QuizResultsPanel } from './quiz-results';

@Component({
  selector: 'lf-quiz-page',
  imports: [RouterLink, LucideArrowLeft, MarkdownLite, QuizResultsPanel],
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
          <p class="text-sm text-muted">Quiz</p>
        </div>
        @if (started() && !session.finished()) {
          @if (session.combo() >= 2) {
            <span class="text-sm font-medium tabular-nums" data-testid="combo"
              >🔥 {{ session.combo() }}</span
            >
          }
          <span class="text-sm text-muted tabular-nums" data-testid="quiz-position">
            {{ session.position() }} / {{ session.total() }}
          </span>
        }
      </header>

      @if (!started()) {
        <section class="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h2 class="text-xl font-semibold">Type the answers</h2>
          <p class="mt-2 text-muted">
            Same answers as the flip cards, but this time you type them. Case, accents, “the/il/la”
            and small typos are forgiven, and you can always say “I was right”.
          </p>
          @if (quizzableCount() === 0) {
            <p class="mt-6 text-muted">This set has no cards that can be quizzed by typing.</p>
          } @else {
            <div class="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                class="btn btn-primary"
                (click)="begin()"
                data-testid="start-all"
              >
                Start: all {{ quizzableCount() }} cards
              </button>
              @if (quizzableCount() > quickSize) {
                <button type="button" class="btn btn-secondary" (click)="begin(quickSize)">
                  Quick {{ quickSize }}
                </button>
              }
            </div>
          }
        </section>
      } @else if (session.finished()) {
        <lf-quiz-results
          [results]="session.results()"
          [setId]="setId()"
          [points]="quizPoints()"
          [personalBest]="personalBest()"
          (retryMissed)="begin(undefined, session.results().missedCards)"
          (again)="begin(lastLimit)"
        />
      } @else if (session.current(); as card) {
        <div
          class="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Questions answered"
          [attr.aria-valuenow]="session.answeredCount()"
          [attr.aria-valuemax]="session.total()"
          aria-valuemin="0"
        >
          <div
            class="h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
            [style.width.%]="(session.answeredCount() / session.total()) * 100"
          ></div>
        </div>

        @for (c of [card]; track c.id) {
          <div
            animate.enter="card-enter"
            class="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-8 text-center shadow-sm"
          >
            <span class="text-xs font-semibold tracking-wider text-muted uppercase">Question</span>
            <p class="text-xl leading-snug font-medium text-balance sm:text-2xl" id="quiz-prompt">
              {{ c.prompt }}
            </p>
            @if (session.hintShown()) {
              <p class="text-sm text-muted" data-testid="quiz-hint">💡 {{ c.hint }}</p>
            }
          </div>
        }

        <form class="mt-6 flex gap-2" (submit)="$event.preventDefault(); submit()">
          <label for="answer" class="sr-only">Your answer</label>
          <input
            #answerInput
            id="answer"
            name="answer"
            type="text"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            aria-describedby="quiz-prompt"
            class="min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-lg outline-none focus:border-accent focus-visible:outline-2 read-only:bg-surface-2"
            placeholder="Type your answer…"
            [value]="typed()"
            (input)="typed.set(answerInput.value)"
            [readOnly]="session.answered()"
            data-testid="answer-input"
          />
          @if (!session.answered()) {
            <button type="submit" class="btn btn-primary" data-testid="check">Check</button>
          }
        </form>

        @if (!session.answered() && card.hint && !session.hintShown()) {
          <button
            type="button"
            class="mt-3 text-sm text-muted underline-offset-2 hover:text-fg hover:underline"
            (click)="session.showHint(); focusInput()"
          >
            Need a hint? (−{{ hintPenalty }} points)
          </button>
        }

        @if (session.currentRecord(); as record) {
          <section
            class="pop-in mt-6 rounded-2xl border p-5"
            [class]="feedbackTone()"
            aria-live="polite"
            data-testid="feedback"
            [attr.data-outcome]="record.outcome"
            [attr.data-result]="record.match.result"
          >
            @switch (record.match.result) {
              @case ('correct') {
                <p class="font-semibold">✅ Correct!</p>
                @if (record.match.accentOnly) {
                  <p class="mt-1 text-sm">
                    Watch the accent: <strong>{{ card.answer }}</strong>
                  </p>
                }
              }
              @case ('close') {
                @if (record.outcome === 'close') {
                  <p class="font-semibold">👍 Accepted, close enough!</p>
                } @else {
                  <p class="font-semibold">🤏 So close!</p>
                }
                <p class="mt-1 text-sm">
                  You typed <strong>{{ record.typed }}</strong>. The answer is
                  <strong>{{ card.answer }}</strong>.
                </p>
              }
              @default {
                @if (record.outcome === 'override') {
                  <p class="font-semibold">👌 Counted as right</p>
                } @else {
                  <p class="font-semibold">❌ Not quite</p>
                }
                <p class="mt-1 text-sm">
                  The answer is <strong>{{ card.answer }}</strong>.
                  @if (record.typed.trim()) {
                    You typed <strong>{{ record.typed }}</strong>.
                  }
                </p>
              }
            }

            @if (pendingPoints() > 0) {
              <p class="mt-1 text-sm font-semibold text-accent" data-testid="pending-points">
                +{{ pendingPoints() }} points
              </p>
            }

            @if (card.details) {
              <p class="mt-3 text-sm leading-relaxed text-muted">
                <lf-md [text]="card.details" />
              </p>
            }

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                #nextBtn
                type="button"
                class="btn btn-primary"
                (click)="next()"
                data-testid="next"
              >
                {{ session.isLast() ? 'See results' : 'Next' }} <kbd>Enter</kbd>
              </button>
              @if (record.match.result === 'close' && record.outcome === 'wrong') {
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="session.acceptClose()"
                  data-testid="accept-close"
                >
                  Accept as correct <kbd>A</kbd>
                </button>
              }
              @if (record.outcome === 'wrong') {
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="session.override()"
                  data-testid="override"
                >
                  I was right <kbd>R</kbd>
                </button>
              }
            </div>
          </section>
        }
      }
    } @else {
      <p class="text-muted" aria-live="polite">Loading…</p>
    }
  `,
})
export class QuizPage {
  private readonly store = inject(SetStore);
  private readonly title = inject(Title);
  private readonly injector = inject(Injector);

  readonly setId = input.required<string>();

  protected readonly quickSize = QUICK_QUIZ_SIZE;
  protected readonly session = new QuizSession();
  protected readonly started = signal(false);
  protected readonly typed = signal('');
  protected lastLimit: number | undefined;
  private fullQuiz = false;
  private readonly progress = inject(ProgressStore);
  private readonly feedback = inject(AwardFeedback);
  protected readonly quizPoints = signal(0);
  protected readonly personalBest = signal(false);
  protected readonly hintPenalty = POINTS.hintPenalty;

  private readonly answerInput = viewChild<ElementRef<HTMLInputElement>>('answerInput');
  private readonly nextBtn = viewChild<ElementRef<HTMLButtonElement>>('nextBtn');

  protected readonly set = resource({
    params: () => this.setId(),
    loader: ({ params }) => this.store.getSet(params),
  });

  protected readonly quizzableIds = computed(() =>
    this.set.hasValue()
      ? this.set
          .value()
          .cards.filter((c) => c.quizzable !== false)
          .map((c) => c.id)
      : [],
  );
  protected readonly quizzableCount = computed(() => this.quizzableIds().length);

  /** Points this answer will earn once you move on (shown in the feedback panel). */
  protected readonly pendingPoints = computed(() => {
    const record = this.session.currentRecord();
    if (!record) return 0;
    const right = record.outcome !== 'wrong';
    return (
      quizAnswerPoints(record.outcome, record.hintUsed) +
      (right ? comboBonus(this.session.combo()) : 0)
    );
  });

  protected readonly feedbackTone = computed(() => {
    const outcome = this.session.currentRecord()?.outcome;
    return outcome === 'wrong' ? 'border-danger/40 bg-danger/5' : 'border-success/40 bg-success/5';
  });

  constructor() {
    effect(() => {
      if (!this.set.hasValue()) return;
      const title = this.set.value().title;
      untracked(() => {
        this.started.set(false);
        this.title.setTitle(`Quiz: ${title} · Flashcards`);
      });
    });
  }

  /**
   * Start a quiz. Cards are ordered weakest-first (lowest mastery, least recently seen).
   * Only a quiz over every quizzable card counts towards the set's best accuracy.
   */
  protected begin(limit?: number, cards?: Card[]): void {
    if (!this.set.hasValue()) return;
    const set = this.set.value();
    if (!cards) this.lastLimit = limit;
    this.fullQuiz = !cards && !limit;
    this.quizPoints.set(0);
    this.personalBest.set(false);
    const ordered = orderWeakestFirst(set.id, cards ?? set.cards, this.progress.cards());
    this.session.start(ordered, { limit, shuffle: false });
    this.typed.set('');
    this.started.set(true);
    this.focusInput();
  }

  protected submit(): void {
    if (this.session.answered()) {
      this.next();
      return;
    }
    this.session.submit(this.typed());
    afterNextRender(() => this.nextBtn()?.nativeElement.focus(), { injector: this.injector });
  }

  protected next(): void {
    const record = this.session.currentRecord();
    if (!record) return;
    // Record only when moving on, so "accept"/"I was right" are reflected.
    this.applyAward(
      this.progress.recordQuizAnswer({
        setId: this.setId(),
        cardId: record.cardId,
        outcome: record.outcome,
        hintUsed: record.hintUsed,
        combo: this.session.combo(),
        quizzableIds: this.quizzableIds(),
      }),
    );

    this.session.next();
    this.typed.set('');
    if (this.session.finished()) {
      const award = this.progress.recordQuizFinish(
        this.setId(),
        this.session.results().accuracy,
        this.fullQuiz,
      );
      this.personalBest.set(award.personalBest);
      this.applyAward(award);
    } else {
      this.focusInput();
    }
  }

  private applyAward(award: Award): void {
    this.quizPoints.update((p) => p + award.points);
    this.feedback.announce(award);
  }

  protected focusInput(): void {
    afterNextRender(() => this.answerInput()?.nativeElement.focus(), { injector: this.injector });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (shouldIgnoreShortcut(event) || !this.started() || !this.session.answered()) return;
    const key = event.key.toLowerCase();
    if (key === 'a') this.session.acceptClose();
    else if (key === 'r') this.session.override();
    else if (key === 'enter') this.next();
    else return;
    event.preventDefault();
  }
}
