import { DOCUMENT, Injectable, inject } from '@angular/core';

/** Confetti for big moments (set mastered, new personal best). Respects reduced motion. */
@Injectable({ providedIn: 'root' })
export class CelebrationService {
  private readonly document = inject(DOCUMENT);

  async burst(): Promise<void> {
    const win = this.document.defaultView;
    if (!win || win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    try {
      const { default: confetti } = await import('canvas-confetti');
      await confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.65 },
        disableForReducedMotion: true,
      });
    } catch {
      // Purely decorative — never let it break the app.
    }
  }
}
