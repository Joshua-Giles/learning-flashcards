#!/usr/bin/env node
// Validates every card set in public/sets/ and regenerates public/sets/index.json.
//
//   node scripts/check-sets.mjs            → check + write manifest (exit 1 on errors)
//   node scripts/check-sets.mjs --no-write → check only
//
// Errors: schema violations, duplicate set/card ids, file name ≠ set id, answers
// too long to type for quizzable cards, exact duplicate prompts (after normalising).
// Warnings: near-duplicate prompts (token Jaccard similarity ≥ NEAR_DUPLICATE_THRESHOLD).

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_SETS_DIR = join(ROOT, 'public', 'sets');
const SCHEMA_PATH = join(ROOT, 'schema', 'set.schema.json');
const MANIFEST_FILE = 'index.json';

export const MAX_QUIZ_ANSWER_LENGTH = 80;
export const NEAR_DUPLICATE_THRESHOLD = 0.8;

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function jaccard(a, b) {
  const ta = new Set(normalizeText(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (ta.size === 0 && tb.size === 0) return 1;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

function createValidator() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const ajv = new Ajv({ allErrors: true });
  return ajv.compile(schema);
}

/**
 * @param {string} setsDir
 * @returns {{ errors: string[], warnings: string[], manifest: { sets: object[] } }}
 */
export function checkSets(setsDir = DEFAULT_SETS_DIR) {
  const validate = createValidator();
  const errors = [];
  const warnings = [];
  const sets = [];

  const files = readdirSync(setsDir)
    .filter((f) => f.endsWith('.json') && f !== MANIFEST_FILE)
    .sort();

  for (const file of files) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(setsDir, file), 'utf8'));
    } catch (e) {
      errors.push(`${file}: invalid JSON (${e.message})`);
      continue;
    }

    if (!validate(data)) {
      for (const err of validate.errors ?? []) {
        errors.push(`${file}: ${err.instancePath || '(root)'} ${err.message}`);
      }
      continue;
    }

    const expectedId = basename(file, '.json');
    if (data.id !== expectedId) {
      errors.push(`${file}: set id "${data.id}" must match the file name "${expectedId}"`);
    }

    const cardIds = new Set();
    for (const card of data.cards) {
      if (cardIds.has(card.id)) errors.push(`${file}: duplicate card id "${card.id}"`);
      cardIds.add(card.id);

      if (card.quizzable !== false && card.answer.length > MAX_QUIZ_ANSWER_LENGTH) {
        errors.push(
          `${file}: card "${card.id}" answer is ${card.answer.length} chars ` +
            `(max ${MAX_QUIZ_ANSWER_LENGTH} for quizzable cards — shorten it, move context to "details", or set "quizzable": false)`,
        );
      }
    }
    sets.push({ file, data });
  }

  const setIds = new Map();
  for (const { file, data } of sets) {
    if (setIds.has(data.id)) {
      errors.push(`${file}: duplicate set id "${data.id}" (also in ${setIds.get(data.id)})`);
    }
    setIds.set(data.id, file);
  }

  // Duplicate prompt detection, within and across sets.
  const allCards = sets.flatMap(({ data }) =>
    data.cards.map((card) => ({
      ref: `${data.id}/${card.id}`,
      prompt: card.prompt,
      norm: normalizeText(card.prompt),
    })),
  );
  for (let i = 0; i < allCards.length; i++) {
    for (let j = i + 1; j < allCards.length; j++) {
      const a = allCards[i];
      const b = allCards[j];
      if (a.norm === b.norm) {
        errors.push(`duplicate prompt: ${a.ref} and ${b.ref} — "${a.prompt}"`);
        continue;
      }
      const sim = jaccard(a.prompt, b.prompt);
      if (sim >= NEAR_DUPLICATE_THRESHOLD) {
        warnings.push(
          `near-duplicate prompts (${sim.toFixed(2)}): ${a.ref} "${a.prompt}" ↔ ${b.ref} "${b.prompt}"`,
        );
      }
    }
  }

  const manifest = {
    sets: sets
      .map(({ data }) => ({
        id: data.id,
        title: data.title,
        description: data.description,
        category: data.category,
        emoji: data.emoji,
        tags: data.tags,
        version: data.version,
        updated: data.updated,
        cardCount: data.cards.length,
        quizzableCount: data.cards.filter((c) => c.quizzable !== false).length,
      }))
      .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)),
  };

  return { errors, warnings, manifest };
}

function main() {
  const write = !process.argv.includes('--no-write');
  const { errors, warnings, manifest } = checkSets(DEFAULT_SETS_DIR);

  for (const w of warnings) console.warn(`⚠  ${w}`);
  for (const e of errors) console.error(`✖  ${e}`);

  if (errors.length > 0) {
    console.error(
      `\n${errors.length} error(s), ${warnings.length} warning(s). Manifest not written.`,
    );
    process.exit(1);
  }

  if (write) {
    writeFileSync(
      join(DEFAULT_SETS_DIR, MANIFEST_FILE),
      JSON.stringify(manifest, null, 2) + '\n',
      'utf8',
    );
  }
  const cards = manifest.sets.reduce((n, s) => n + s.cardCount, 0);
  console.log(
    `✔  ${manifest.sets.length} set(s), ${cards} card(s) OK` +
      (warnings.length ? `, ${warnings.length} warning(s)` : '') +
      (write ? ` — wrote ${MANIFEST_FILE}` : ''),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
