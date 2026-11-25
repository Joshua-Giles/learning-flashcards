import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSets, jaccard, normalizeText } from './check-sets.mjs';

function makeSet(id, cards, overrides = {}) {
  return {
    schemaVersion: 1,
    id,
    title: `Title ${id}`,
    description: 'A test set.',
    category: 'Testing',
    emoji: '🧪',
    tags: [],
    version: 1,
    updated: '2026-11-24',
    cards,
    ...overrides,
  };
}

function withSets(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'lf-sets-'));
  try {
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(
        join(dir, name),
        typeof content === 'string' ? content : JSON.stringify(content),
      );
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const card = (id, prompt, answer = 'Answer') => ({ id, prompt, answer });

test('normalizeText strips case, accents and punctuation', () => {
  assert.equal(normalizeText('  Perché, NO?!  '), 'perche no');
});

test('jaccard similarity of token sets', () => {
  assert.equal(jaccard('a b c', 'a b c'), 1);
  assert.equal(jaccard('a b', 'c d'), 0);
});

test('a valid set passes and produces a manifest entry', () => {
  withSets(
    {
      'alpha.json': makeSet('alpha', [
        card('c001', 'What is one?'),
        { ...card('c002', 'Explain gravity in detail', 'x'.repeat(120)), quizzable: false },
      ]),
      'index.json': '{"sets":[]}',
    },
    (dir) => {
      const { errors, warnings, manifest } = checkSets(dir);
      assert.deepEqual(errors, []);
      assert.deepEqual(warnings, []);
      assert.equal(manifest.sets.length, 1);
      assert.equal(manifest.sets[0].id, 'alpha');
      assert.equal(manifest.sets[0].cardCount, 2);
      assert.equal(manifest.sets[0].quizzableCount, 1);
    },
  );
});

test('schema violations are reported (missing answer)', () => {
  withSets({ 'alpha.json': makeSet('alpha', [{ id: 'c001', prompt: 'No answer?' }]) }, (dir) => {
    const { errors } = checkSets(dir);
    assert.ok(
      errors.some((e) => e.includes("must have required property 'answer'")),
      errors.join('\n'),
    );
  });
});

test('invalid JSON is reported', () => {
  withSets({ 'alpha.json': '{ nope' }, (dir) => {
    const { errors } = checkSets(dir);
    assert.ok(errors[0].includes('invalid JSON'));
  });
});

test('file name must match set id', () => {
  withSets({ 'wrong-name.json': makeSet('alpha', [card('c001', 'Q?')]) }, (dir) => {
    const { errors } = checkSets(dir);
    assert.ok(errors.some((e) => e.includes('must match the file name')));
  });
});

test('duplicate card ids within a set are errors', () => {
  withSets(
    { 'alpha.json': makeSet('alpha', [card('c001', 'First?'), card('c001', 'Second?')]) },
    (dir) => {
      const { errors } = checkSets(dir);
      assert.ok(errors.some((e) => e.includes('duplicate card id "c001"')));
    },
  );
});

test('long answers on quizzable cards are errors', () => {
  withSets({ 'alpha.json': makeSet('alpha', [card('c001', 'Q?', 'x'.repeat(81))]) }, (dir) => {
    const { errors } = checkSets(dir);
    assert.ok(errors.some((e) => e.includes('answer is 81 chars')));
  });
});

test('exact duplicate prompts across sets are errors (ignoring case/punctuation)', () => {
  withSets(
    {
      'alpha.json': makeSet('alpha', [card('c001', 'Who founded the band?')]),
      'beta.json': makeSet('beta', [card('c001', 'who founded the band')]),
    },
    (dir) => {
      const { errors } = checkSets(dir);
      assert.ok(errors.some((e) => e.includes('duplicate prompt: alpha/c001 and beta/c001')));
    },
  );
});

test('near-duplicate prompts are warnings, not errors', () => {
  withSets(
    {
      'alpha.json': makeSet('alpha', [
        card('c001', 'In what year did the band release their first album'),
        card('c002', 'In what year did the band release their debut album'),
      ]),
    },
    (dir) => {
      const { errors, warnings } = checkSets(dir);
      assert.deepEqual(errors, []);
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes('near-duplicate'));
    },
  );
});

test('manifest is sorted by category then title', () => {
  withSets(
    {
      'b.json': makeSet('b', [card('c1', 'B?')], { category: 'Music', title: 'Zed' }),
      'a.json': makeSet('a', [card('c1', 'A?')], { category: 'Music', title: 'Alpha' }),
      'c.json': makeSet('c', [card('c1', 'C?')], { category: 'Languages', title: 'Ciao' }),
    },
    (dir) => {
      const { manifest } = checkSets(dir);
      assert.deepEqual(
        manifest.sets.map((s) => s.id),
        ['c', 'a', 'b'],
      );
    },
  );
});
