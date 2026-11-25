# Implementation Plan: Learning Flashcards V1

Source spec: [SPEC.md](../SPEC.md)
Status: **draft, awaiting review** (it follows the spec's Open Questions)

## Overview

A static Angular 22 single-page app. Card sets are JSON files in `public/sets/`, and all user state (progress, points, streak, notes, settings) lives in one versioned `localStorage` document. The work is built as vertical slices: each phase ends with something I can actually use. The high-risk parts come first. Those are the content pipeline (everything depends on the schema) and the flip and quiz interactions (the core experience).

## Architecture Decisions

- **No backend, no NgRx.** Signals in a few root services (`SetStore`, `ProgressStore`, `SettingsStore`, `NotebookStore`) are enough for a single-user app. Persistence goes through one `StorageService`, which owns the schema version and migrations.
- **Pure logic lives apart from Angular.** `core/logic/` holds the answer matcher, scoring, Leitner mastery and streak math as pure, clock-injected functions. They're written test-first, so the competitive rules can be trusted and changed safely.
- **The content pipeline is the contract.** The JSON Schema plus `scripts/check-sets.mjs` is the boundary between Claude-generated content and the app. The validator also generates `index.json`, so adding a set means "drop in a file and run `sets:check`".
- **Stable card IDs.** Progress is stored under `setId/cardId`. The validator, CLAUDE.md and the content guide all enforce "never rename or reuse".
- **Layered theming.** The theme is built from CSS custom properties, and Tailwind reads those tokens. An inline script in `index.html` sets `data-theme` before Angular starts, so there's no flash.
- **Animations are CSS-first.** The flip is a CSS 3D transform. Enter/leave transitions use Angular's native `animate.enter`/`animate.leave` rather than the deprecated `@angular/animations`. Reduced motion is honoured everywhere.
- **Sets load lazily.** The manifest loads at startup. A set's JSON loads when it's opened, and all sets load the first time search opens (starter content is about 200KB at most).
- **Local dates everywhere.** Streaks and the "once per day" mastery rule use a `LocalDay` string (`YYYY-MM-DD` in local time) produced by an injectable clock.

## Dependency Graph

```
schema + validator + sample set  (content)
        │
        ├── models + SetStore ── app shell (layout, sidebar, theme, routes)
        │                              │
        │            ┌─────────────────┼──────────────────┐
        │         study mode       quiz mode ◄── answer matcher (pure)
        │            │                 │
        │            └──────┬──────────┘
        │             StorageService ── scoring/mastery/streak (pure)
        │                    │
        │              dashboard / leaderboard
        │
        ├── search overlay (independent of progress)
        └── notebook (independent of progress)
content guide ── starter sets (can start any time after the schema is final)
```

## Task List

The detailed tasks, with acceptance criteria, verification and files, are in [todo.md](todo.md).

### Phase 1: Foundation

- [x] T1: Scaffold the Angular 22 app, tooling, and CLAUDE.md
- [x] T2: Set schema, TypeScript models, validator, and a sample set
- [x] T3: App shell: layout, collapsible sidebar, routing, set loading
- [x] T4: Light/dark/system theme with no flash

**Checkpoint A:** the app runs, the sidebar lists the sample set, the theme toggles and persists, and `npm run verify` is green. _Review with you._

### Phase 2: Core learning loop

- [ ] T5: Flip card component and study mode
- [ ] T6: Answer matcher (pure, test-first)
- [ ] T7: Quiz mode

**Checkpoint B:** I can study and then quiz the sample set end to end (nothing persists yet). _Review the feel of the animations and the matcher's forgiveness with you._

### Phase 3: Progress & competition

- [ ] T8: StorageService with versioning, migrations, export/import
- [ ] T9: Scoring and per-card mastery, wired into study and quiz
- [ ] T10: Daily goal, streak, and top-bar indicators
- [ ] T11: Dashboard and leaderboard (best, mastered, gathering dust, heatmap)

**Checkpoint C:** a full day's loop works and survives reloads, and the e2e tests for scoring and streaks pass. _Review the point values with you._

### Phase 4: Search, notebook, content

- [ ] T12: Search overlay (Ctrl/⌘+K)
- [ ] T13: Questions notebook and "Copy for Claude"
- [ ] T14: Content guide and the duplicate check, tuned on real sets
- [ ] T15: Starter sets: Modest Mouse (band + album)
- [ ] T16: Starter sets: Italian (5 sets)

**Checkpoint D:** every V1 feature is in place, with 7 sets passing `sets:check`. _Review the content tone and accuracy with you._

### Phase 5: Polish & ship

- [ ] T17: Accessibility, reduced-motion and mobile pass
- [ ] T18: CI (GitHub Actions) and, optionally, GitHub Pages deploy

**Checkpoint E:** every success criterion in SPEC.md is met.

## Parallelisation

- **T14–T16 (content)** can start as soon as T2 has fixed the schema. They touch only `public/sets/` and `docs/`, so they could run in a separate session alongside Phase 2–3.
- **T12 (search)** and **T13 (notebook)** are independent of each other and of T8–T11, apart from the `?` key hook.
- Everything in Phase 3 runs in order (shared state schema).

## Risks and Mitigations

| Risk                                                                               | Impact                                | Mitigation                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Generated trivia contains factual errors (band history, dates)                     | High: I'd learn wrong facts           | The content guide's "accuracy over flair" rule; leave out or flag facts I'm unsure of; you review at Checkpoint D; a `details` style that avoids precise numbers unless they're well known |
| `localStorage` gets cleared (browser cleanup, private window) and progress is lost | Med                                   | Export/import backups; a "last backup" reminder in settings after 14 days; a storage-unavailable banner                                                                                    |
| The answer matcher is too strict or too lenient                                    | Med: quizzes feel unfair or pointless | A pure, heavily tested matcher; the "I was right" override; tune thresholds at Checkpoint B                                                                                                |
| Changes to the state schema break existing progress                                | Med                                   | A versioned document plus migration functions, with tests for each migration; changes are "Ask first"                                                                                      |
| Streak bugs around midnight or DST                                                 | Med: very demotivating                | Clock injection; `LocalDay` strings, never UTC timestamps, for day maths; dedicated tests                                                                                                  |
| Duplicate or near-duplicate cards across sets                                      | Low                                   | Validator similarity check; the content guide tells Claude to read existing sets first                                                                                                     |
| Angular 22 APIs move quickly (for example animation APIs)                          | Low                                   | Check against the current angular.dev docs while implementing (`source-driven-development`)                                                                                                |
| Scope creep (MC mode, audio, SRS…)                                                 | Med                                   | Parked under "Out of Scope" in the spec; new ideas go there mid-build                                                                                                                      |

## Open Questions

See SPEC.md → Open Questions. The blocking questions are resolved: Angular 22, and the album is _We Were Dead Before the Ship Even Sank_. The remaining questions have sensible defaults and don't block anything.
