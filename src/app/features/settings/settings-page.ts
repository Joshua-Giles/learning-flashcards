import { Component, inject, signal } from '@angular/core';
import { Clock } from '../../core/clock';
import { StateError } from '../../core/logic/state-schema';
import { ProgressStore } from '../../core/progress-store';
import { StorageService } from '../../core/storage.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'lf-settings-page',
  template: `
    <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>

    <section class="mt-8" aria-labelledby="goal-heading">
      <h2 id="goal-heading" class="text-lg font-semibold">Daily goal</h2>
      <p class="mt-1 text-sm text-muted">
        Points needed each day to keep your streak going. A correct quiz answer is worth 10.
      </p>
      <form
        class="mt-3 flex items-center gap-2"
        (submit)="$event.preventDefault(); saveGoal(goal.value)"
      >
        <label for="goal" class="sr-only">Daily goal in points</label>
        <input
          #goal
          id="goal"
          type="number"
          min="5"
          max="10000"
          step="5"
          [value]="progress.dailyGoal()"
          class="w-28 rounded-lg border border-line bg-surface px-3 py-2 tabular-nums"
          data-testid="goal-input"
        />
        <span class="text-sm text-muted">points</span>
        <button type="submit" class="btn btn-secondary">Save</button>
      </form>
    </section>

    <section class="mt-10" aria-labelledby="backup-heading">
      <h2 id="backup-heading" class="text-lg font-semibold">Backup</h2>
      <p class="mt-1 text-sm text-muted">
        Progress lives only in this browser. Export it now and then so clearing site data doesn't
        wipe your streak.
      </p>
      <div class="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          class="btn btn-secondary"
          (click)="exportProgress()"
          data-testid="export"
        >
          Export progress
        </button>
        <label class="btn btn-secondary cursor-pointer focus-within:outline-2">
          Import progress…
          <input
            type="file"
            accept="application/json,.json"
            class="sr-only"
            (change)="importProgress($event)"
            data-testid="import"
          />
        </label>
      </div>
      @if (importError(); as error) {
        <p role="alert" class="mt-3 text-sm text-danger">{{ error }}</p>
      }
    </section>

    <section class="mt-10" aria-labelledby="reset-heading">
      <h2 id="reset-heading" class="text-lg font-semibold">Reset</h2>
      <p class="mt-1 text-sm text-muted">
        Deletes all points, streaks and mastery. Card sets aren't affected.
      </p>
      @if (!confirmingReset()) {
        <button type="button" class="btn btn-secondary mt-3" (click)="confirmingReset.set(true)">
          Reset all progress…
        </button>
      } @else {
        <div
          class="mt-3 rounded-xl border border-danger/40 bg-danger/5 p-4"
          role="alertdialog"
          aria-labelledby="reset-confirm"
        >
          <p id="reset-confirm" class="text-sm font-medium">
            Really reset everything? This can't be undone (unless you've exported a backup).
          </p>
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              class="btn bg-danger text-white"
              (click)="reset()"
              data-testid="confirm-reset"
            >
              Yes, reset
            </button>
            <button type="button" class="btn btn-secondary" (click)="confirmingReset.set(false)">
              Cancel
            </button>
          </div>
        </div>
      }
    </section>
  `,
})
export class SettingsPage {
  protected readonly progress = inject(ProgressStore);
  private readonly storage = inject(StorageService);
  private readonly toasts = inject(ToastService);
  private readonly clock = inject(Clock);

  protected readonly importError = signal<string | null>(null);
  protected readonly confirmingReset = signal(false);

  protected saveGoal(value: string): void {
    const goal = Number(value);
    if (!Number.isFinite(goal) || goal < 1) return;
    this.progress.setDailyGoal(goal);
    this.toasts.show(`Daily goal set to ${this.progress.dailyGoal()} points`, '🎯');
  }

  protected exportProgress(): void {
    const blob = new Blob([this.storage.exportText(this.clock.now())], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcards-progress-${this.clock.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected async importProgress(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.importError.set(null);
    try {
      this.storage.importText(await file.text());
      this.progress.refreshToday();
      this.toasts.show('Progress imported', '📥');
    } catch (err) {
      this.importError.set(err instanceof StateError ? err.message : 'Import failed.');
    }
  }

  protected reset(): void {
    this.storage.reset();
    this.confirmingReset.set(false);
    this.toasts.show('All progress reset', '🧹');
  }
}
