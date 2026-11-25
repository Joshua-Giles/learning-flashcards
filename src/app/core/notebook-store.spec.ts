import { TestBed } from '@angular/core/testing';
import { Clock } from './clock';
import { NotebookStore } from './notebook-store';

class TickingClock extends Clock {
  private t = new Date('2026-11-25T10:00:00Z').getTime();
  override now() {
    this.t += 1000;
    return new Date(this.t);
  }
}

function setup() {
  TestBed.configureTestingModule({ providers: [{ provide: Clock, useClass: TickingClock }] });
  return TestBed.inject(NotebookStore);
}

describe('NotebookStore', () => {
  beforeEach(() => localStorage.clear());

  it('adds trimmed questions with context, newest first', () => {
    const nb = setup();
    nb.add('  First?  ', { setId: 's', cardId: 'c1' });
    nb.add('Second?');
    expect(nb.questions().map((q) => q.text)).toEqual(['Second?', 'First?']);
    expect(nb.questions()[1]).toMatchObject({ setId: 's', cardId: 'c1', status: 'open' });
  });

  it('ignores blank questions and drops a card id without a set', () => {
    const nb = setup();
    expect(nb.add('   ')).toBeUndefined();
    expect(nb.add('Q?', { cardId: 'c1' })).not.toHaveProperty('cardId');
  });

  it('edits, changes status and removes', () => {
    const nb = setup();
    const a = nb.add('A?')!;
    const b = nb.add('B?')!;
    nb.edit(a.id, 'A, edited?');
    nb.setStatus([a.id, b.id], 'sent');
    expect(nb.open()).toEqual([]);
    expect(nb.questions().find((q) => q.id === a.id)).toMatchObject({
      text: 'A, edited?',
      status: 'sent',
    });
    nb.remove(b.id);
    expect(nb.questions().map((q) => q.id)).toEqual([a.id]);
  });

  it('persists across reloads', () => {
    setup().add('Remember me?');
    TestBed.resetTestingModule();
    expect(setup().questions()[0]?.text).toBe('Remember me?');
  });
});
