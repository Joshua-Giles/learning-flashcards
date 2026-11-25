import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'lf-toaster',
  host: {
    class:
      'pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4',
  },
  template: `
    <div aria-live="polite" class="contents">
      @for (toast of toasts.toasts(); track toast.id) {
        <button
          type="button"
          animate.enter="pop-in"
          class="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-lg"
          (click)="toasts.dismiss(toast.id)"
          data-testid="toast"
        >
          @if (toast.emoji) {
            <span aria-hidden="true">{{ toast.emoji }}</span>
          }
          {{ toast.text }}
        </button>
      }
    </div>
  `,
})
export class Toaster {
  protected readonly toasts = inject(ToastService);
}
