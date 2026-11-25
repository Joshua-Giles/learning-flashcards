import { Card } from '../models/set';

export type MatchResult = 'correct' | 'close' | 'wrong';

export interface AnswerMatch {
  result: MatchResult;
  /** Correct, but only because accents were ignored ("perche" for "perché"). */
  accentOnly: boolean;
  /** The answer or `accept` entry that matched (correct/close only). */
  matched?: string;
}

/** Articles (and "to", for English infinitives) dropped from the start of answers. */
const LEADING_WORD_ARTICLE = /^(?:the|a|an|to|il|lo|la|i|gli|le|un|uno|una) (?=\S)/;
/** Elided Italian articles: l'acqua, un'amica. */
const LEADING_ELIDED_ARTICLE = /^(?:l|un)'\s*(?=\S)/;

export interface NormalizeOptions {
  /** Strip diacritics (é → e). */
  foldAccents?: boolean;
}

/**
 * Canonical form used for comparison: lowercase, no surrounding/duplicate whitespace,
 * no punctuation, no single leading article. Accents are kept unless `foldAccents`.
 */
export function normalizeAnswer(text: string, { foldAccents = false }: NormalizeOptions = {}) {
  let s = text
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .trim();
  if (foldAccents) s = s.normalize('NFD').replace(/\p{M}/gu, '');
  s = s.normalize('NFC');
  s = s.replace(LEADING_ELIDED_ARTICLE, '');
  s = s
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s.replace(LEADING_WORD_ARTICLE, '');
}

/** Optimal-string-alignment Damerau–Levenshtein distance (adjacent transpositions count as 1). */
export function damerauLevenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array<number>(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** How many edits still count as "close" for an expected answer of this length. */
export function closeThreshold(expectedLength: number): number {
  if (expectedLength <= 3) return 0;
  if (expectedLength <= 8) return 1;
  return 2;
}

/**
 * Checks a typed answer against a card's `answer` and `accept` list.
 * correct → exact (normalised) match, or a match once accents are ignored (accentOnly);
 * close   → within a small typo distance (see closeThreshold);
 * wrong   → anything else, including empty input.
 */
export function matchAnswer(input: string, card: Pick<Card, 'answer' | 'accept'>): AnswerMatch {
  const typed = normalizeAnswer(input);
  if (!typed) return { result: 'wrong', accentOnly: false };
  const typedFolded = normalizeAnswer(input, { foldAccents: true });

  const candidates = [card.answer, ...(card.accept ?? [])];

  for (const candidate of candidates) {
    if (normalizeAnswer(candidate) === typed) {
      return { result: 'correct', accentOnly: false, matched: candidate };
    }
  }

  for (const candidate of candidates) {
    if (normalizeAnswer(candidate, { foldAccents: true }) === typedFolded) {
      return { result: 'correct', accentOnly: true, matched: candidate };
    }
  }

  let best: { candidate: string; distance: number } | undefined;
  for (const candidate of candidates) {
    const expected = normalizeAnswer(candidate, { foldAccents: true });
    const distance = damerauLevenshtein(typedFolded, expected);
    if (distance <= closeThreshold(expected.length) && (!best || distance < best.distance)) {
      best = { candidate, distance };
    }
  }
  if (best) return { result: 'close', accentOnly: false, matched: best.candidate };

  return { result: 'wrong', accentOnly: false };
}
