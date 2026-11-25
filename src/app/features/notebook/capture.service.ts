import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { Injectable, inject } from '@angular/core';

export interface CaptureContext {
  setId?: string;
  cardId?: string;
  setTitle?: string;
  cardPrompt?: string;
}

/** Opens the quick "note a question" dialog from anywhere (study/quiz `?`, buttons). */
@Injectable({ providedIn: 'root' })
export class CaptureService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private isOpen = false;

  async open(context: CaptureContext = {}): Promise<void> {
    if (this.isOpen) return;
    this.isOpen = true;
    const { CaptureDialog } = await import('./capture-dialog');
    const ref = this.dialog.open(CaptureDialog, {
      data: context,
      ariaLabel: 'Note a question',
      backdropClass: 'cdk-overlay-dark-backdrop',
      positionStrategy: this.overlay.position().global().centerHorizontally().top('15vh'),
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
    ref.closed.subscribe(() => (this.isOpen = false));
  }
}
