# 🗂️ Learning Flashcards

[![CI](https://github.com/Joshua-Giles/learning-flashcards/actions/workflows/ci.yml/badge.svg)](https://github.com/Joshua-Giles/learning-flashcards/actions/workflows/ci.yml)

A personal flashcard app for learning anything: bands, movies, languages. You flip through cards first, then quiz yourself by typing the answers, and you earn points and keep a daily streak going.

Built with Angular 22, Tailwind CSS v4 and Angular CDK. Card sets are plain JSON files in [`public/sets/`](public/sets), and everything else stays in your browser.

**Live app:** https://joshua-giles.github.io/learning-flashcards/ (deployed automatically from `main` after CI passes). Progress is stored per browser; use **Settings → Export/Import** to move it between devices.

## Getting started

```bash
npm install
npm start          # http://localhost:4200
```

Requires Node 22.22.3+ (or 24.15+). Useful commands:

```bash
npm run verify     # lint, format check, set validation, unit tests, production build
npm run e2e        # Playwright end-to-end + axe accessibility checks
```

CI runs both on every push and pull request.

## Adding a set

Ask Claude Code for one (for example "make a set about the band Pixies"), or write `public/sets/<id>.json` by hand following [`schema/set.schema.json`](schema/set.schema.json). Then run:

```bash
npm run sets:check
```

This validates every set, flags duplicate questions and rebuilds the set index.

## Docs

- [SPEC.md](SPEC.md): what we're building and why
- [tasks/plan.md](tasks/plan.md): implementation plan
- [CLAUDE.md](CLAUDE.md): rules for working on this repo with Claude Code
