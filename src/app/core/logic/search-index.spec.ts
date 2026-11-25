import { CardSet, SetSummary } from '../models/set';
import { SearchIndex } from './search-index';

const italian: CardSet = {
  schemaVersion: 1,
  id: 'italian-greetings',
  title: 'Italian: Greetings & Basics',
  description: 'Ciao! Your first phrases.',
  category: 'Languages',
  emoji: '👋',
  tags: ['italian', 'beginner'],
  version: 1,
  updated: '2026-11-25',
  cards: [
    { id: 'c001', prompt: 'How do you say "good morning"?', answer: 'Buongiorno' },
    {
      id: 'c002',
      prompt: 'How do you ask "why?"',
      answer: 'Perché',
      details: 'Also means "because".',
    },
  ],
};

const music: CardSet = {
  ...italian,
  id: 'modest-mouse-band',
  title: 'Modest Mouse: The Band',
  description: 'Indie rock from Issaquah, Washington.',
  category: 'Music',
  emoji: '🐭',
  tags: ['music', 'indie rock'],
  cards: [
    { id: 'c001', prompt: 'Which hit song opens with a hopeful chorus?', answer: 'Float On' },
  ],
};

const summary = (s: CardSet): SetSummary => ({
  id: s.id,
  title: s.title,
  description: s.description,
  category: s.category,
  emoji: s.emoji,
  tags: s.tags,
  version: s.version,
  updated: s.updated,
  cardCount: s.cards.length,
  quizzableCount: s.cards.length,
});

const index = new SearchIndex([italian, music].map(summary), [italian, music]);

describe('SearchIndex', () => {
  it('finds a card by a misspelled answer', () => {
    const { cards } = index.search('buongorno');
    expect(cards[0]).toMatchObject({ setId: 'italian-greetings', cardId: 'c001' });
  });

  it('ignores accents', () => {
    expect(index.search('perche').cards[0]?.answer).toBe('Perché');
  });

  it('finds sets by title, tag or category', () => {
    expect(index.search('modest').sets[0]?.set.id).toBe('modest-mouse-band');
    expect(index.search('indie rock').sets[0]?.set.id).toBe('modest-mouse-band');
    expect(index.search('languages').sets[0]?.set.id).toBe('italian-greetings');
  });

  it('searches card details too', () => {
    expect(index.search('because').cards.map((c) => c.cardId)).toContain('c002');
  });

  it('returns nothing for very short queries', () => {
    expect(index.search(' a ')).toEqual({ sets: [], cards: [] });
  });

  it('is fast enough for interactive use', () => {
    const many: CardSet = {
      ...italian,
      id: 'big',
      cards: Array.from({ length: 400 }, (_, i) => ({
        id: `c${i}`,
        prompt: `Question number ${i} about something fairly long and wordy`,
        answer: `answer ${i}`,
        details: 'Some extra details that make the text longer to search through.',
      })),
    };
    const big = new SearchIndex([summary(many)], [many]);
    const start = performance.now();
    big.search('somthing wordy');
    expect(performance.now() - start).toBeLessThan(100);
  });
});
