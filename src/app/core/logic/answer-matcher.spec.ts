import { Card } from '../models/set';
import { damerauLevenshtein, matchAnswer, normalizeAnswer } from './answer-matcher';

const card = (answer: string, accept?: string[]): Card => ({
  id: 'c1',
  prompt: 'Q?',
  answer,
  accept,
});

describe('normalizeAnswer', () => {
  it('lowercases, trims, collapses whitespace and strips punctuation', () => {
    expect(normalizeAnswer('  Hello,   World!  ')).toBe('hello world');
  });

  it('keeps accents unless folding is requested', () => {
    expect(normalizeAnswer('Perché')).toBe('perché');
    expect(normalizeAnswer('Perché', { foldAccents: true })).toBe('perche');
  });

  it('drops a leading English or Italian article', () => {
    expect(normalizeAnswer('The Moon')).toBe('moon');
    expect(normalizeAnswer('il gatto')).toBe('gatto');
    expect(normalizeAnswer('gli amici')).toBe('amici');
    expect(normalizeAnswer("l'acqua")).toBe('acqua');
    expect(normalizeAnswer('l’acqua')).toBe('acqua'); // curly apostrophe
    expect(normalizeAnswer("un'amica")).toBe('amica');
    expect(normalizeAnswer('to be')).toBe('be');
  });

  it('does not drop an article when it is the whole answer', () => {
    expect(normalizeAnswer('A')).toBe('a');
    expect(normalizeAnswer('il')).toBe('il');
  });

  it('only drops one article, and only at the start', () => {
    expect(normalizeAnswer('the a team')).toBe('a team');
    expect(normalizeAnswer('Bella la vita')).toBe('bella la vita');
  });
});

describe('damerauLevenshtein', () => {
  it.each([
    ['', '', 0],
    ['abc', 'abc', 0],
    ['abc', 'abd', 1], // substitution
    ['abc', 'ab', 1], // deletion
    ['ab', 'abc', 1], // insertion
    ['abcd', 'abdc', 1], // transposition
    ['kitten', 'sitting', 3],
  ])('%s → %s = %i', (a, b, d) => {
    expect(damerauLevenshtein(a, b)).toBe(d);
  });
});

describe('matchAnswer', () => {
  it('accepts an exact answer regardless of case and punctuation', () => {
    expect(matchAnswer('buongiorno!', card('Buongiorno'))).toEqual({
      result: 'correct',
      accentOnly: false,
      matched: 'Buongiorno',
    });
  });

  it('accepts a missing accent but flags it', () => {
    expect(matchAnswer('perche', card('Perché'))).toEqual({
      result: 'correct',
      accentOnly: true,
      matched: 'Perché',
    });
  });

  it('does not flag accents when they were typed correctly', () => {
    expect(matchAnswer('perché', card('Perché')).accentOnly).toBe(false);
  });

  it('accepts alternatives from the accept list', () => {
    expect(matchAnswer('buon giorno', card('Buongiorno', ['buon giorno']))).toMatchObject({
      result: 'correct',
      matched: 'buon giorno',
    });
  });

  it('ignores leading articles on either side', () => {
    expect(matchAnswer('il gatto', card('gatto')).result).toBe('correct');
    expect(matchAnswer('gatto', card('Il gatto')).result).toBe('correct');
    expect(matchAnswer("l'acqua", card('acqua')).result).toBe('correct');
  });

  it('offers a one-letter typo as close for 4–8 character answers', () => {
    expect(matchAnswer('Buongorno', card('Buongiorno')).result).toBe('close'); // 10 chars, 1 edit
    expect(matchAnswer('Mras', card('Mars')).result).toBe('close'); // transposition
    expect(matchAnswer('Satrun', card('Saturn')).result).toBe('close');
  });

  it('allows up to two edits for answers longer than 8 characters', () => {
    expect(matchAnswer('arrivederchi', card('Arrivederci')).result).toBe('close'); // 1 edit
    expect(matchAnswer('arividerci', card('Arrivederci')).result).toBe('close'); // 2 edits
    expect(matchAnswer('arividerchi', card('Arrivederci')).result).toBe('wrong'); // 3 edits
  });

  it('never returns close for short answers (≤ 3 chars)', () => {
    expect(matchAnswer('tre', card('tré')).result).toBe('correct'); // accent only, still correct
    expect(matchAnswer('due', card('tre')).result).toBe('wrong');
    expect(matchAnswer('si', card('no')).result).toBe('wrong');
  });

  it('two edits on a short-ish answer is wrong', () => {
    expect(matchAnswer('Vneu', card('Venus')).result).toBe('wrong');
  });

  it('treats empty or punctuation-only input as wrong', () => {
    expect(matchAnswer('', card('Mars')).result).toBe('wrong');
    expect(matchAnswer('   ?! ', card('Mars')).result).toBe('wrong');
  });

  it('a completely different answer is wrong', () => {
    expect(matchAnswer('Jupiter', card('Mars'))).toEqual({ result: 'wrong', accentOnly: false });
  });

  it('prefers a correct match over a close match from another candidate', () => {
    expect(matchAnswer('ciao', card('Salve', ['ciao'])).result).toBe('correct');
  });

  it('accent-only on a close answer still reports close', () => {
    // "perch" is 1 deletion away from folded "perche"
    expect(matchAnswer('perch', card('Perché')).result).toBe('close');
  });
});
