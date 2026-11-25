import { Question } from '../models/state';

export const CLAUDE_PROMPT_INTRO =
  'Please answer these questions and add them as new cards to the matching sets\n' +
  'in learning-flashcards (follow docs/content-guide.md, avoid duplicates):';

/** `[set / card]`, `[set]` or `[general]`. */
export function questionRef(q: Pick<Question, 'setId' | 'cardId'>): string {
  if (q.setId && q.cardId) return `[${q.setId} / ${q.cardId}]`;
  if (q.setId) return `[${q.setId}]`;
  return '[general]';
}

/** The paste-into-Claude-Code text from SPEC F7. Multi-line questions are folded onto one line. */
export function formatForClaude(questions: readonly Question[]): string {
  const lines = questions.map(
    (q) => `- ${questionRef(q)} ${q.text.trim().replace(/\s*\n\s*/g, ' ')}`,
  );
  return `${CLAUDE_PROMPT_INTRO}\n\n${lines.join('\n')}\n`;
}

export function questionsJson(questions: readonly Question[], now = new Date()): string {
  return JSON.stringify(
    {
      app: 'learning-flashcards',
      kind: 'questions',
      exportedAt: now.toISOString(),
      instructions: CLAUDE_PROMPT_INTRO.replace('\n', ' '),
      questions: questions.map(({ id, text, setId, cardId, createdAt }) => ({
        id,
        ref: questionRef({ setId, cardId }),
        text,
        setId,
        cardId,
        createdAt,
      })),
    },
    null,
    2,
  );
}
