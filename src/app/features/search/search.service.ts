import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { Injectable, inject } from '@angular/core';
import { SearchIndex } from '../../core/logic/search-index';
import { SetStore } from '../../core/set-store';

/** Builds the search index lazily (first open) and opens the search dialog. */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly store = inject(SetStore);
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private index?: Promise<SearchIndex>;
  private isOpen = false;

  /** Loads every set once and indexes it. Retries on the next call if loading failed. */
  ensureIndex(): Promise<SearchIndex> {
    if (!this.index) {
      const summaries = this.store.sets();
      this.index = Promise.all(summaries.map((s) => this.store.getSet(s.id))).then(
        (sets) => new SearchIndex(summaries, sets),
      );
      this.index.catch(() => (this.index = undefined));
    }
    return this.index;
  }

  async open(): Promise<void> {
    if (this.isOpen) return;
    this.isOpen = true;
    const { SearchDialog } = await import('./search-dialog');
    const ref = this.dialog.open(SearchDialog, {
      ariaLabel: 'Search sets and cards',
      backdropClass: 'cdk-overlay-dark-backdrop',
      panelClass: 'lf-search-panel',
      positionStrategy: this.overlay.position().global().centerHorizontally().top('10vh'),
      autoFocus: 'first-tabbable',
      restoreFocus: true,
    });
    ref.closed.subscribe(() => (this.isOpen = false));
  }
}
