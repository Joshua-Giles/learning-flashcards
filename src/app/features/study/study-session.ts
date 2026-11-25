import { computed, signal } from '@angular/core';
import { Card } from '../../core/models/set';
import { Rng, shuffle } from '../../core/logic/shuffle';

export type StudyGrade = 'knew' | 'learning';

export interface StudySummary {
  total: number;
  knew: number;
  learning: number;
  skipped: number;
  learningCards: Card[];
}

/**
 * State for one pass through a deck in study (flip) mode. Plain signals, no DI,
 * so it is unit-testable without TestBed. Persistence/scoring arrive in T9.
 */
export class StudySession {
  readonly deck = signal<Card[]>([]);
  readonly index = signal(0);
  readonly flipped = signal(false);
  readonly hintShown = signal(false);
  readonly grades = signal<Readonly<Record<string, StudyGrade>>>({});
  readonly finished = signal(false);

  readonly current = computed<Card | undefined>(() => this.deck()[this.index()]);
  readonly total = computed(() => this.deck().length);
  readonly position = computed(() => Math.min(this.index() + 1, this.total()));
  readonly gradedCount = computed(() => Object.keys(this.grades()).length);
  readonly isFirst = computed(() => this.index() === 0);
  readonly isLast = computed(() => this.index() >= this.total() - 1);
  readonly currentGrade = computed(() => {
    const card = this.current();
    return card ? this.grades()[card.id] : undefined;
  });

  readonly summary = computed<StudySummary>(() => {
    const grades = this.grades();
    const deck = this.deck();
    const learningCards = deck.filter((c) => grades[c.id] === 'learning');
    const knew = deck.filter((c) => grades[c.id] === 'knew').length;
    return {
      total: deck.length,
      knew,
      learning: learningCards.length,
      skipped: deck.length - knew - learningCards.length,
      learningCards,
    };
  });

  /** Begin (or restart) a session with these cards. */
  start(cards: readonly Card[], options: { shuffle?: boolean; rng?: Rng; startAt?: string } = {}) {
    const deck = options.shuffle ? shuffle(cards, options.rng) : [...cards];
    const startIndex = options.startAt ? deck.findIndex((c) => c.id === options.startAt) : 0;
    this.deck.set(deck);
    this.index.set(Math.max(0, startIndex));
    this.grades.set({});
    this.finished.set(false);
    this.resetCardState();
  }

  flip(): void {
    if (this.current()) this.flipped.update((f) => !f);
  }

  showHint(): void {
    if (this.current()?.hint && !this.flipped()) this.hintShown.set(true);
  }

  /** Grade the current card (only once it has been flipped) and move on. */
  grade(grade: StudyGrade): void {
    const card = this.current();
    if (!card || !this.flipped()) return;
    this.grades.update((g) => ({ ...g, [card.id]: grade }));
    if (this.isLast()) {
      this.finished.set(true);
    } else {
      this.goTo(this.index() + 1);
    }
  }

  next(): void {
    if (this.isLast()) {
      if (this.total() > 0) this.finished.set(true);
      return;
    }
    this.goTo(this.index() + 1);
  }

  prev(): void {
    if (!this.isFirst()) this.goTo(this.index() - 1);
  }

  private goTo(index: number): void {
    this.index.set(index);
    this.resetCardState();
  }

  private resetCardState(): void {
    this.flipped.set(false);
    this.hintShown.set(false);
  }
}
