import { Injectable, computed, inject } from '@angular/core';
import { Clock } from './clock';
import { Question, QuestionStatus } from './models/state';
import { StorageService } from './storage.service';

export interface QuestionContext {
  setId?: string;
  cardId?: string;
}

/** The questions notebook, persisted inside the `lf:state` document (v2+). */
@Injectable({ providedIn: 'root' })
export class NotebookStore {
  private readonly storage = inject(StorageService);
  private readonly clock = inject(Clock);

  /** Newest first. */
  readonly questions = computed(() =>
    [...this.storage.state().questions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly open = computed(() => this.questions().filter((q) => q.status === 'open'));

  add(text: string, context: QuestionContext = {}): Question | undefined {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    const question: Question = {
      id: `q-${this.clock.now().getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed,
      ...(context.setId ? { setId: context.setId } : {}),
      ...(context.setId && context.cardId ? { cardId: context.cardId } : {}),
      createdAt: this.clock.now().toISOString(),
      status: 'open',
    };
    this.storage.update((s) => ({ ...s, questions: [...s.questions, question] }));
    return question;
  }

  edit(id: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.patch([id], { text: trimmed });
  }

  setStatus(ids: readonly string[], status: QuestionStatus): void {
    this.patch(ids, { status });
  }

  remove(id: string): void {
    this.storage.update((s) => ({ ...s, questions: s.questions.filter((q) => q.id !== id) }));
  }

  private patch(ids: readonly string[], change: Partial<Question>): void {
    const set = new Set(ids);
    this.storage.update((s) => ({
      ...s,
      questions: s.questions.map((q) => (set.has(q.id) ? { ...q, ...change } : q)),
    }));
  }
}
