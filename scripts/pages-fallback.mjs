#!/usr/bin/env node
// GitHub Pages has no SPA rewrite rules: refreshing /learning-flashcards/sets/x would 404.
// Pages serves 404.html for unknown paths, so make it a copy of index.html and let the
// Angular router take over (the <base href> keeps asset and set URLs correct).
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(
  resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  'dist',
  'learning-flashcards',
  'browser',
);
const index = join(out, 'index.html');
if (!existsSync(index)) {
  console.error(`No build found at ${index}. Run the build first.`);
  process.exit(1);
}
copyFileSync(index, join(out, '404.html'));
console.log('✔  wrote 404.html (SPA fallback for GitHub Pages)');
