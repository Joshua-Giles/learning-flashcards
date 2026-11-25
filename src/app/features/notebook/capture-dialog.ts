import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, signal } from '@angular/core';
import { NotebookStore } from '../../core/notebook-store';
import { ToastService } from '../../core/toast.service';
import { CaptureContext } from './capture.service';

@Component({
  selector: 'lf-capture-dialog',
  host: {
    class:
      'block w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-5 text-fg shadow-2xl',
  },
  template: `
    <h2 class="text-lg font-semibold" id="capture-title">📝 Note a question</h2>
    @if (context.cardPrompt) {
      <p class="mt-1 text-sm text-muted">
        About: <span class="text-fg">{{ context.cardPrompt }}</span>
        @if (context.setTitle) {
          <span> · {{ context.setTitle }}</span>
        }
      </p>
    } @else if (context.setTitle) {
      <p class="mt-1 text-sm text-muted">About: {{ context.setTitle }}</p>
    }

    <form class="mt-4" (submit)="$event.preventDefault(); save()">
      <label for="question-text" class="sr-only">Your question</label>
      <textarea
        id="question-text"
        rows="3"
        class="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-accent"
        placeholder="What are you curious about? Claude will turn it into new cards."
        [value]="text()"
        (input)="text.set($any($event.target).value)"
        (keydown.enter)="onEnter($any($event))"
        data-testid="capture-text"
      ></textarea>
      <div class="mt-3 flex items-center justify-between gap-3">
        <p class="text-xs text-muted"><kbd>Enter</kbd> save · <kbd>Shift+Enter</kbd> new line</p>
        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" (click)="ref.close()">Cancel</button>
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!text().trim()"
            data-testid="capture-save"
          >
            Save
          </button>
        </div>
      </div>
    </form>
  `,
})
export class CaptureDialog {
  protected readonly ref = inject(DialogRef);
  protected readonly context = inject<CaptureContext>(DIALOG_DATA);
  private readonly notebook = inject(NotebookStore);
  private readonly toasts = inject(ToastService);

  protected readonly text = signal('');

  protected onEnter(event: KeyboardEvent): void {
    if (event.shiftKey || event.isComposing) return;
    event.preventDefault();
    this.save();
  }

  protected save(): void {
    const saved = this.notebook.add(this.text(), this.context);
    if (!saved) return;
    this.ref.close();
    this.toasts.show('Question saved to your notebook', '📝');
  }
}
