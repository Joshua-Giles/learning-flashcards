import Fuse, { IFuseOptions } from 'fuse.js';
import { CardSet, SetSummary } from '../models/set';

export interface SetHit {
  kind: 'set';
  set: SetSummary;
}

export interface CardHit {
  kind: 'card';
  setId: string;
  setTitle: string;
  setEmoji: string;
  cardId: string;
  prompt: string;
  answer: string;
}

export interface SearchResults {
  sets: SetHit[];
  cards: CardHit[];
}

const COMMON: IFuseOptions<unknown> = {
  threshold: 0.35,
  ignoreLocation: true,
  ignoreDiacritics: true,
  minMatchCharLength: 2,
};

export const SEARCH_LIMITS = { sets: 5, cards: 8 } as const;

/** Fuzzy index over set metadata and card text, built once all sets are loaded. */
export class SearchIndex {
  private readonly setFuse: Fuse<SetSummary>;
  private readonly cardFuse: Fuse<CardHit & { details: string; tags: string }>;

  constructor(summaries: readonly SetSummary[], sets: readonly CardSet[]) {
    this.setFuse = new Fuse([...summaries], {
      ...COMMON,
      keys: [
        { name: 'title', weight: 3 },
        { name: 'tags', weight: 2 },
        { name: 'category', weight: 1 },
        { name: 'description', weight: 1 },
      ],
    });

    const docs = sets.flatMap((set) =>
      set.cards.map((card) => ({
        kind: 'card' as const,
        setId: set.id,
        setTitle: set.title,
        setEmoji: set.emoji,
        cardId: card.id,
        prompt: card.prompt,
        answer: card.answer,
        details: card.details ?? '',
        tags: (card.tags ?? []).join(' '),
      })),
    );
    this.cardFuse = new Fuse(docs, {
      ...COMMON,
      keys: [
        { name: 'prompt', weight: 3 },
        { name: 'answer', weight: 3 },
        { name: 'tags', weight: 1 },
        { name: 'details', weight: 1 },
      ],
    });
  }

  search(query: string): SearchResults {
    const q = query.trim();
    if (q.length < 2) return { sets: [], cards: [] };
    return {
      sets: this.setFuse
        .search(q, { limit: SEARCH_LIMITS.sets })
        .map((r) => ({ kind: 'set', set: r.item })),
      cards: this.cardFuse.search(q, { limit: SEARCH_LIMITS.cards }).map((r) => ({
        kind: 'card',
        setId: r.item.setId,
        setTitle: r.item.setTitle,
        setEmoji: r.item.setEmoji,
        cardId: r.item.cardId,
        prompt: r.item.prompt,
        answer: r.item.answer,
      })),
    };
  }
}
