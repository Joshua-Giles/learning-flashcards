import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  emoji?: string;
}

const TOAST_MS = 3500;

/** Small, polite notifications ("+25 first completion", "Daily goal reached!"). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(text: string, emoji?: string): void {
    const toast: Toast = { id: this.nextId++, text, emoji };
    this.toasts.update((t) => [...t.slice(-2), toast]);
    setTimeout(() => this.dismiss(toast.id), TOAST_MS);
  }

  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
