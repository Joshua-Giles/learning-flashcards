import { shouldIgnoreShortcut } from './keyboard';

function keydown(key: string, target: HTMLElement, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...init });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

const el = (tag: string) => document.createElement(tag);

describe('shouldIgnoreShortcut', () => {
  it('handles shortcuts on the page body', () => {
    expect(shouldIgnoreShortcut(keydown(' ', document.body))).toBe(false);
    expect(shouldIgnoreShortcut(keydown('2', document.body))).toBe(false);
  });

  it('ignores keys while typing in fields', () => {
    for (const tag of ['input', 'textarea', 'select']) {
      expect(shouldIgnoreShortcut(keydown('h', el(tag)))).toBe(true);
    }
  });

  it('ignores modifier combos', () => {
    expect(shouldIgnoreShortcut(keydown('s', document.body, { ctrlKey: true }))).toBe(true);
    expect(shouldIgnoreShortcut(keydown('k', document.body, { metaKey: true }))).toBe(true);
  });

  it('leaves Space/Enter to a focused button', () => {
    expect(shouldIgnoreShortcut(keydown(' ', el('button')))).toBe(true);
    expect(shouldIgnoreShortcut(keydown('Enter', el('button')))).toBe(true);
    expect(shouldIgnoreShortcut(keydown('1', el('button')))).toBe(false);
  });

  it('only leaves Enter to a focused link — Space still flips (regression)', () => {
    expect(shouldIgnoreShortcut(keydown('Enter', el('a')))).toBe(true);
    expect(shouldIgnoreShortcut(keydown(' ', el('a')))).toBe(false);
  });
});
