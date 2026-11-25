import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Clock } from '../../core/clock';
import { copyText } from '../../core/clipboard';
import { formatForClaude, questionsJson } from '../../core/logic/question-export';
import { Question, QuestionStatus } from '../../core/models/state';
import { NotebookStore } from '../../core/notebook-store';
import { SetStore } from '../../core/set-store';
import { ToastService } from '../../core/toast.service';

type Filter = QuestionStatus | 'all';

@Component({
  selector: 'lf-questions-page',
  imports: [RouterLink],
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Questions notebook</h1>
    <p class="mt-1 text-muted">
      Jot down anything you're curious about. Then press <strong>Copy for Claude</strong>, paste it
      into Claude Code, and the answers come back as new cards.
    </p>

    <form class="mt-6" (submit)="$event.preventDefault(); add()">
      <label for="new-question" class="text-sm font-medium">New question</label>
      <div class="mt-1 flex flex-col gap-2 sm:flex-row">
        <textarea
          id="new-question"
          rows="2"
          class="min-w-0 flex-1 resize-y rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-accent"
          placeholder="e.g. Why is the album called We Were Dead Before the Ship Even Sank?"
          [value]="draft()"
          (input)="draft.set($any($event.target).value)"
          data-testid="new-question"
        ></textarea>
        <div class="flex gap-2 sm:flex-col">
          <label for="new-question-set" class="sr-only">Related set</label>
          <select
            id="new-question-set"
            class="rounded-lg border border-line bg-surface px-2 py-2 text-sm"
            (change)="draftSet.set($any($event.target).value)"
          >
            <option value="">General</option>
            @for (s of sets.sets(); track s.id) {
              <option [value]="s.id" [selected]="draftSet() === s.id">{{ s.title }}</option>
            }
          </select>
          <button type="submit" class="btn btn-primary" [disabled]="!draft().trim()">Add</button>
        </div>
      </div>
    </form>

    <div class="mt-8 flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Filter by status"
        class="flex rounded-lg border border-line p-0.5"
      >
        @for (f of filters; track f.value) {
          <button
            type="button"
            class="rounded-md px-3 py-1 text-sm"
            [class.bg-surface-2]="filter() === f.value"
            [class.font-medium]="filter() === f.value"
            [attr.aria-pressed]="filter() === f.value"
            (click)="filter.set(f.value)"
          >
            {{ f.label }} <span class="text-muted tabular-nums">{{ count(f.value) }}</span>
          </button>
        }
      </div>
      <div class="ml-auto flex gap-2">
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="!notebook.open().length"
          (click)="copyForClaude()"
          data-testid="copy-for-claude"
        >
          Copy for Claude ({{ notebook.open().length }})
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          [disabled]="!notebook.open().length"
          (click)="download()"
        >
          Download .json
        </button>
      </div>
    </div>

    @if (manualCopy(); as text) {
      <div class="mt-4 rounded-xl border border-line bg-surface p-4" role="alert">
        <p class="text-sm">Your browser blocked copying. Select this text and copy it yourself:</p>
        <textarea
          readonly
          rows="6"
          class="mt-2 w-full rounded-lg border border-line bg-bg p-2 font-mono text-xs"
          aria-label="Questions for Claude"
          [value]="text"
        ></textarea>
      </div>
    }

    <ul class="mt-4 flex flex-col gap-2" data-testid="question-list">
      @for (q of visible(); track q.id) {
        <li class="rounded-xl border border-line bg-surface p-4" data-testid="question">
          @if (editing() === q.id) {
            <label [for]="'edit-' + q.id" class="sr-only">Edit question</label>
            <textarea
              [id]="'edit-' + q.id"
              rows="2"
              class="w-full rounded-lg border border-line bg-bg px-3 py-2"
              [value]="q.text"
              #editBox
            ></textarea>
            <div class="mt-2 flex gap-2">
              <button
                type="button"
                class="btn btn-primary py-1.5"
                (click)="saveEdit(q, editBox.value)"
              >
                Save
              </button>
              <button type="button" class="btn btn-secondary py-1.5" (click)="editing.set(null)">
                Cancel
              </button>
            </div>
          } @else {
            <p class="whitespace-pre-wrap" [class.line-through]="q.status === 'resolved'">
              {{ q.text }}
            </p>
          }
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span class="rounded-full px-2 py-0.5" [class]="badge[q.status]">{{ q.status }}</span>
            @if (q.setId) {
              <a
                class="link"
                [routerLink]="q.cardId ? ['/sets', q.setId, 'study'] : ['/sets', q.setId]"
                [queryParams]="q.cardId ? { card: q.cardId } : {}"
                >{{ setTitle(q.setId) }}{{ q.cardId ? ' · card ' + q.cardId : '' }}</a
              >
            } @else {
              <span>General</span>
            }
            <time [attr.datetime]="q.createdAt">{{ q.createdAt.slice(0, 10) }}</time>
            <span class="ml-auto flex gap-1">
              @if (editing() !== q.id) {
                <button
                  type="button"
                  class="rounded px-2 py-1 hover:bg-surface-2"
                  (click)="editing.set(q.id)"
                >
                  Edit
                </button>
              }
              @if (q.status === 'resolved') {
                <button
                  type="button"
                  class="rounded px-2 py-1 hover:bg-surface-2"
                  (click)="notebook.setStatus([q.id], 'open')"
                >
                  Reopen
                </button>
              } @else {
                <button
                  type="button"
                  class="rounded px-2 py-1 hover:bg-surface-2"
                  (click)="notebook.setStatus([q.id], 'resolved')"
                >
                  Resolve
                </button>
              }
              @if (confirmDelete() === q.id) {
                <button
                  type="button"
                  class="rounded px-2 py-1 text-danger hover:bg-danger/10"
                  (click)="notebook.remove(q.id)"
                >
                  Really delete?
                </button>
              } @else {
                <button
                  type="button"
                  class="rounded px-2 py-1 hover:bg-surface-2"
                  (click)="confirmDelete.set(q.id)"
                >
                  Delete
                </button>
              }
            </span>
          </div>
        </li>
      } @empty {
        <li class="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          @if (filter() === 'all' || filter() === 'open') {
            No questions yet. While studying, press <kbd>?</kbd> to note one about the current card.
          } @else {
            Nothing here.
          }
        </li>
      }
    </ul>
  `,
})
export class QuestionsPage {
  protected readonly notebook = inject(NotebookStore);
  protected readonly sets = inject(SetStore);
  private readonly toasts = inject(ToastService);
  private readonly clock = inject(Clock);

  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'sent', label: 'Sent' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'all', label: 'All' },
  ];
  protected readonly badge: Record<QuestionStatus, string> = {
    open: 'bg-accent/10 text-accent',
    sent: 'bg-surface-2',
    resolved: 'bg-success/10 text-success',
  };

  protected readonly filter = signal<Filter>('open');
  protected readonly draft = signal('');
  protected readonly draftSet = signal('');
  protected readonly editing = signal<string | null>(null);
  protected readonly confirmDelete = signal<string | null>(null);
  protected readonly manualCopy = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const f = this.filter();
    return this.notebook.questions().filter((q) => f === 'all' || q.status === f);
  });

  protected count(filter: Filter): number {
    const all = this.notebook.questions();
    return filter === 'all' ? all.length : all.filter((q) => q.status === filter).length;
  }

  protected setTitle(id: string): string {
    return this.sets.summary(id)?.title ?? id;
  }

  protected add(): void {
    if (this.notebook.add(this.draft(), { setId: this.draftSet() || undefined })) {
      this.draft.set('');
    }
  }

  protected saveEdit(q: Question, text: string): void {
    this.notebook.edit(q.id, text);
    this.editing.set(null);
  }

  protected async copyForClaude(): Promise<void> {
    const open = this.notebook.open();
    const text = formatForClaude(open);
    this.manualCopy.set(null);
    if (await copyText(text)) {
      this.notebook.setStatus(
        open.map((q) => q.id),
        'sent',
      );
      this.toasts.show(`Copied ${open.length} question(s). Paste them into Claude Code`, '📋');
    } else {
      this.manualCopy.set(text);
    }
  }

  protected download(): void {
    const open = this.notebook.open();
    const blob = new Blob([questionsJson(open, this.clock.now())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-questions-${this.clock.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.notebook.setStatus(
      open.map((q) => q.id),
      'sent',
    );
  }
}
