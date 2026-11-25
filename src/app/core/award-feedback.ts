import { Injectable, inject } from '@angular/core';
import { CelebrationService } from './celebration.service';
import { Award, ProgressStore } from './progress-store';
import { POINTS } from './logic/scoring';
import { ToastService } from './toast.service';

/** Turns an Award into toasts and confetti. Point-by-point feedback stays inline in pages. */
@Injectable({ providedIn: 'root' })
export class AwardFeedback {
  private readonly toasts = inject(ToastService);
  private readonly celebrate = inject(CelebrationService);
  private readonly progress = inject(ProgressStore);

  announce(award: Award): void {
    if (award.setMastered) {
      this.toasts.show(`Set mastered! +${POINTS.setMastered}`, '🏆');
      void this.celebrate.burst();
    }
    if (award.personalBest) {
      this.toasts.show('New personal best!', '🎉');
      void this.celebrate.burst();
    }
    if (award.firstCompletion) {
      this.toasts.show(`First time through this set! +${POINTS.firstCompletion}`, '✨');
    }
    if (award.goalJustMet) {
      const days = this.progress.streak().current;
      this.toasts.show(
        days > 1 ? `Daily goal reached. ${days}-day streak!` : 'Daily goal reached!',
        '🔥',
      );
    }
  }
}
