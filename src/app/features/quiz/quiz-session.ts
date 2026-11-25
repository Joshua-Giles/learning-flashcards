import { computed, signal } from '@angular/core';
import { AnswerMatch, matchAnswer } from '../../core/logic/answer-matcher';
import { Rng, shuffle } from '../../core/logic/shuffle';
import { Card } from '../../core/models/set';

/**
 * Final outcome for a card:
 * correct  → matched (incl. accent-only);
 * close    → typo the user accepted;
 * override → user said "I was right";
 * wrong    → anything else (incl. a close answer not accepted).
 */
export type QuizOutcome = 'correct' | 'close' | 'override' | 'wrong';

export interface QuizRecord {
  cardId: string;
  typed: string;
  match: AnswerMatch;
  outcome: QuizOutcome;
  hintUsed: boolean;
}

export interface QuizResults {
  total: number;
  correct: number;
  close: number;
  override: number;
  wrong: number;
  hintsUsed: number;
  /** Percentage of cards with a non-wrong outcome, rounded. */
  accuracy: number;
  bestCombo: number;
  missedCards: Card[];
}

export const QUICK_QUIZ_SIZE = 10;

export const isRight = (outcome: QuizOutcome) => outcome !== 'wrong';

/**
 * State for one typed-answer quiz. Plain signals, no DI (unit-testable without
 * TestBed). Weakest-first ordering and points arrive with progress tracking (T9).
 */
export class QuizSession {
  readonly deck = signal<Card[]>([]);
  readonly index = signal(0);
  readonly hintShown = signal(false);
  readonly records = signal<Readonly<Record<string, QuizRecord>>>({});
  readonly finished = signal(false);

  readonly current = computed<Card | undefined>(() => this.deck()[this.index()]);
  readonly total = computed(() => this.deck().length);
  readonly position = computed(() => Math.min(this.index() + 1, this.total()));
  readonly isLast = computed(() => this.index() >= this.total() - 1);
  readonly answeredCount = computed(() => Object.keys(this.records()).length);
  readonly currentRecord = computed<QuizRecord | undefined>(() => {
    const card = this.current();
    return card ? this.records()[card.id] : undefined;
  });
  readonly answered = computed(() => this.currentRecord() !== undefined);

  /** Streak stats over answered cards, in deck order (recomputed so overrides count). */
  private readonly streaks = computed(() => {
    const records = this.records();
    let run = 0;
    let best = 0;
    for (const card of this.deck()) {
      const record = records[card.id];
      if (!record) continue;
      run = isRight(record.outcome) ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return { run, best };
  });
  readonly combo = computed(() => this.streaks().run);
  readonly bestCombo = computed(() => this.streaks().best);

  readonly results = computed<QuizResults>(() => {
    const records = this.records();
    const counts = { correct: 0, close: 0, override: 0, wrong: 0 };
    let hintsUsed = 0;
    const missedCards: Card[] = [];
    for (const card of this.deck()) {
      const record = records[card.id];
      if (!record) continue;
      counts[record.outcome]++;
      if (record.hintUsed) hintsUsed++;
      if (record.outcome === 'wrong') missedCards.push(card);
    }
    const total = this.deck().length;
    const right = counts.correct + counts.close + counts.override;
    return {
      total,
      ...counts,
      hintsUsed,
      accuracy: total ? Math.round((right / total) * 100) : 0,
      bestCombo: this.bestCombo(),
      missedCards,
    };
  });

  start(
    cards: readonly Card[],
    options: { shuffle?: boolean; limit?: number; rng?: Rng } = {},
  ): void {
    const quizzable = cards.filter((c) => c.quizzable !== false);
    const ordered = options.shuffle === false ? quizzable : shuffle(quizzable, options.rng);
    this.deck.set(options.limit ? ordered.slice(0, options.limit) : ordered);
    this.index.set(0);
    this.records.set({});
    this.finished.set(false);
    this.hintShown.set(false);
  }

  showHint(): void {
    if (this.current()?.hint && !this.answered()) this.hintShown.set(true);
  }

  submit(typed: string): void {
    const card = this.current();
    if (!card || this.answered()) return;
    const match = matchAnswer(typed, card);
    this.setRecord({
      cardId: card.id,
      typed,
      match,
      outcome: match.result === 'correct' ? 'correct' : 'wrong',
      hintUsed: this.hintShown(),
    });
  }

  /** Accept a close (typo) answer as right. */
  acceptClose(): void {
    const record = this.currentRecord();
    if (record?.match.result === 'close' && record.outcome === 'wrong') {
      this.setRecord({ ...record, outcome: 'close' });
    }
  }

  /** "I was right": the user overrides a wrong verdict. */
  override(): void {
    const record = this.currentRecord();
    if (record?.outcome === 'wrong') this.setRecord({ ...record, outcome: 'override' });
  }

  next(): void {
    if (!this.answered()) return;
    if (this.isLast()) {
      this.finished.set(true);
      return;
    }
    this.index.update((i) => i + 1);
    this.hintShown.set(false);
  }

  private setRecord(record: QuizRecord): void {
    this.records.update((r) => ({ ...r, [record.cardId]: record }));
  }
}
