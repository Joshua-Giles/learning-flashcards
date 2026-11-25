# 🗂️ Learning Flashcards

A personal flashcard app for learning anything: bands, movies, languages. You flip through cards first, then quiz yourself by typing the answers, and you earn points and keep a daily streak going.

Built with Angular 22, Tailwind CSS v4 and Angular CDK. Card sets are plain JSON files in [`public/sets/`](public/sets), and everything else stays in your browser.

## Getting started

```bash
npm install
npm start          # http://localhost:4200
```

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
