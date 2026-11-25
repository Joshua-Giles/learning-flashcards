import { Question } from '../models/state';
import { formatForClaude, questionRef, questionsJson } from './question-export';

const q = (text: string, extra: Partial<Question> = {}): Question => ({
  id: text.slice(0, 4),
  text,
  createdAt: '2026-11-25T10:00:00.000Z',
  status: 'open',
  ...extra,
});

describe('question export', () => {
  it('builds refs for card, set and general questions', () => {
    expect(questionRef({ setId: 'modest-mouse-band', cardId: 'c014' })).toBe(
      '[modest-mouse-band / c014]',
    );
    expect(questionRef({ setId: 'italian-greetings' })).toBe('[italian-greetings]');
    expect(questionRef({})).toBe('[general]');
  });

  it('formats exactly as SPEC F7 describes', () => {
    const text = formatForClaude([
      q('Why did Johnny Marr join the band?', { setId: 'modest-mouse-band', cardId: 'c014' }),
      q("What's the difference between ciao and salve?", { setId: 'italian-greetings' }),
      q('Are there Italian words that came from Modest Mouse lyrics? 🙃'),
    ]);
    expect(text).toBe(
      'Please answer these questions and add them as new cards to the matching sets\n' +
        'in learning-flashcards (follow docs/content-guide.md, avoid duplicates):\n' +
        '\n' +
        '- [modest-mouse-band / c014] Why did Johnny Marr join the band?\n' +
        "- [italian-greetings] What's the difference between ciao and salve?\n" +
        '- [general] Are there Italian words that came from Modest Mouse lyrics? 🙃\n',
    );
  });

  it('folds multi-line questions onto one line', () => {
    expect(formatForClaude([q('Line one\n  line two')])).toContain(
      '- [general] Line one line two\n',
    );
  });

  it('produces a JSON export with refs', () => {
    const json = JSON.parse(
      questionsJson([q('Hello?', { setId: 's', cardId: 'c1' })], new Date('2026-11-25T12:00:00Z')),
    );
    expect(json).toMatchObject({
      app: 'learning-flashcards',
      kind: 'questions',
      exportedAt: '2026-11-25T12:00:00.000Z',
      questions: [{ ref: '[s / c1]', text: 'Hello?', setId: 's', cardId: 'c1' }],
    });
  });
});
