# Task List: Learning Flashcards V1

Plan: [plan.md](plan.md) · Spec: [SPEC.md](../SPEC.md)
Every task also has to meet this Definition of Done:

- `npm run verify` is green
- any new logic has tests
- nothing in the spec is contradicted, or the spec is updated first.

---

## Phase 1: Foundation

### T1: Scaffold the Angular 22 app, tooling, and CLAUDE.md

**Description:** Create the project with the Angular CLI (standalone, zoneless, SCSS, routing, Vitest), and add Tailwind v4, ESLint, Prettier and Playwright. Add `npm run verify`. Write `CLAUDE.md` with the commands, boundaries and content workflow from the spec.
**Acceptance criteria:**

- [x] `npm start` serves a placeholder page, and `npm test`, `npm run lint` and `npm run build` all pass
- [x] Tailwind utilities work in a component, and `npx playwright test` runs one smoke test
- [x] CLAUDE.md lists the commands and the Always/Ask/Never rules
      **Verification:** `npm run verify`; open http://localhost:4200
      **Dependencies:** None
      **Files:** `package.json`, `angular.json`, `src/styles.css`, `eslint.config.js`, `playwright.config.ts`, `CLAUDE.md`
      **Scope:** M

### T2: Set schema, TypeScript models, validator, and a sample set

**Description:** Write `schema/set.schema.json` and the matching TypeScript models. Write `scripts/check-sets.mjs`, which:

- validates the schema with Ajv
- checks that set and card IDs are unique and that each file name matches its set ID
- checks answer length
- flags near-duplicate prompts (token Jaccard ≥ 0.8 is a warning; an exact normalised match is an error)
- writes `public/sets/index.json`.

Add one small sample set (about 8 cards) for development.
**Acceptance criteria:**

- [x] `npm run sets:check` passes on the sample set and writes the manifest
- [x] Bad fixtures (duplicate ID, missing answer, duplicate prompt, wrong file name) each fail with a clear message
- [x] TypeScript models match the schema
      **Verification:** `npm run sets:check`; `node --test scripts/` (validator tests with fixtures)
      **Dependencies:** T1
      **Files:** `schema/set.schema.json`, `scripts/check-sets.mjs`, `scripts/check-sets.test.mjs`, `src/app/core/models/set.ts`, `public/sets/sample-solar-system.json`
      **Scope:** M

### T3: App shell: layout, collapsible sidebar, routing, set loading

**Description:**

- `SetStore` loads the manifest, and loads and caches individual sets.
- The top bar and the sidebar are grouped by category. The sidebar collapses fully, and it becomes a drawer below 768px using a CDK breakpoint.
- Routes from F1 with placeholder pages, plus a set overview page (title, description, card count, Study/Quiz buttons).
- The sidebar's collapsed state is remembered (a temporary `localStorage` key that T8 will migrate).
  **Acceptance criteria:**
- [x] The sidebar lists sets by category, and clicking one opens `/sets/:id`
- [x] The toggle collapses and expands the sidebar with a smooth transition, and the state survives a reload
- [x] On a narrow viewport the sidebar overlays the page and closes on navigation or Esc
      **Verification:** component tests for the sidebar and SetStore; manual check at 1280px and 375px
      **Dependencies:** T2
      **Files:** `core/set-store.ts`, `shell/top-bar.*`, `shell/sidebar.*`, `app.routes.ts`, `features/set-overview/*`
      **Scope:** M

### T4: Light/dark/system theme with no flash

**Description:** Add CSS custom-property tokens for both themes, hooked into Tailwind. Add a `ThemeService` (Light/Dark/System), a top-bar toggle, and an inline `index.html` script that applies the stored theme before Angular starts.
**Acceptance criteria:**

- [x] The toggle cycles through the modes, and System follows the OS live
- [x] There's no flash of the wrong theme on a hard reload
- [x] Text contrast is ≥ 4.5:1 in both themes
      **Verification:** unit test for ThemeService; manual hard-reload check; a contrast check in DevTools
      **Dependencies:** T3
      **Files:** `src/index.html`, `src/styles.css`, `core/theme.service.ts`, `shell/top-bar.*`
      **Scope:** S

### ✅ Checkpoint A: Foundation

- [x] `npm run verify` is green
- [x] The app shows the sample set in the sidebar, and the theme and sidebar state persist
- [ ] **Review with you before Phase 2**

---

## Phase 2: Core learning loop

### T5: Flip card component and study mode

**Description:**

- `lf-flip-card`: a 3D flip of about 450ms, with a crossfade under reduced motion.
- Study page: progress bar, prev/next, "Still learning" / "Knew it" once flipped, hint and shuffle. (The "still learning only" filter moved to T9, since it needs saved progress. For now, "Restart with missed" covers it within a session.)
- Keyboard shortcuts (Space, 1, 2, ←, →, H, S).
- End-of-session summary with "Quiz me now" and "Restart with missed".
- `details` goes through a whitelist Markdown-lite renderer (bold, italics, links only).
  **Acceptance criteria:**
- [x] Every control works by mouse and by keyboard, and grading only works after flipping
- [x] The summary shows the counts and the missed cards, and its actions work
- [x] The Markdown-lite renderer escapes HTML (tested with `<script>`)
      **Verification:** component tests for flip-card and markdown-lite; a manual feel check of the animation
      **Dependencies:** T3
      **Files:** `features/study/flip-card.*`, `features/study/study-page.*`, `features/study/session-summary.*`, `shared/markdown-lite.*`, `core/shortcuts.service.ts`
      **Scope:** M

### T6: Answer matcher (pure, test-first)

**Description:** Write `matchAnswer(input, card) → { result: 'correct'|'close'|'wrong', accentOnly: boolean, matched?: string }`. It handles normalisation (case, whitespace, punctuation, accent folding, English and Italian leading articles), the `accept` list, and Damerau-Levenshtein thresholds from SPEC F4.
**Acceptance criteria:**

- [x] `perche`→correct with accentOnly, `Buongorno`→close, `il gatto` vs `gatto`→correct, `l'acqua` vs `acqua`→correct, empty input→wrong
- [x] Short answers (≤ 3 characters) never return close
- [ ] Coverage of the matcher is ≥ 95% (not measured yet: needs `@vitest/coverage-v8`, a new dev dependency)
      **Verification:** `npm test -- answer-matcher`
      **Dependencies:** T1
      **Files:** `core/logic/answer-matcher.ts`, `core/logic/answer-matcher.spec.ts`, `core/logic/text-normalize.ts`
      **Scope:** S

### T7: Quiz mode

**Description:**

- Quiz page: auto-focused input, Enter to submit, feedback panel (correct answer, `details`, accent note), and "Accept as correct" for close and "I was right" for wrong.
- A hint button that applies a penalty.
- Lengths: all cards or a quick 10.
- Quizzable cards only.
- Weakest-first ordering, with a stub until T9 adds mastery.
- Results screen with accuracy, best combo and missed cards.
  **Acceptance criteria:**
- [x] The whole quiz can be done with the keyboard only (type, Enter, Enter)
- [x] Close and override outcomes are recorded separately in the session result
- [x] Non-quizzable cards are skipped
      **Verification:** component test for the quiz flow; Playwright: a typo is offered as close and accepted
      **Dependencies:** T5 (shared shortcuts and markdown), T6
      **Files:** `features/quiz/quiz-page.*`, `features/quiz/quiz-feedback.*`, `features/quiz/quiz-results.*`, `e2e/quiz.spec.ts`
      **Scope:** M

### ✅ Checkpoint B: Core loop

- [x] Study → summary → "Quiz me now" → results works end to end on the sample set
- [ ] **Review with you: animation feel, how forgiving the matcher is, keyboard flow**

---

## Phase 3: Progress & competition

### T8: StorageService with versioning, migrations, export/import

**Description:** One `lf:state` document (`{ version, settings, progress, daily, notebook }`) with typed read/write and a migration pipeline (and a test for it). (Theme and sidebar preferences deliberately stay in their own keys; see SPEC F5.) Settings page: Export (downloads JSON), Import (schema-validated before it replaces anything), and Reset (with confirmation). Shows a banner when storage is unavailable.
**Acceptance criteria:**

- [x] State survives a reload, and export then import round-trips to an identical state
- [x] Bad or old-version imports are rejected or migrated with a clear message
- [x] When `localStorage` throws, the app keeps working in memory and shows the banner
      **Verification:** unit tests (round-trip, migration, bad input, storage throws)
      **Dependencies:** T3
      **Files:** `core/storage.service.ts`, `core/models/state.ts`, `core/logic/migrations.ts`, `features/settings/*`
      **Scope:** M

### T9: Scoring and per-card mastery, wired into study and quiz

**Description:** Pure functions:

- `scoreEvent()` for the point values in the SPEC F5 table
- `applyMastery(box, outcome, lastPromotedDay, today)`, where quiz promotes once per day, study caps at box 2, and wrong drops to box 1
- `setMasteryPct()`.

`ProgressStore` records card outcomes and session results (best accuracy, first completion, mastered date). The quiz switches to real weakest-first ordering. Confetti fires when a set is mastered or a personal best is set.
**Acceptance criteria:**

- [x] Every row of the points table is covered by a test, including combos and the hint penalty
- [x] Two correct answers on the same day promote a card only once; correct answers on separate days do promote it
- [x] A set shows as mastered at ≥ 90% of its quizzable cards at box ≥ 4, and the bonus is awarded only once
      **Verification:** `npm test -- scoring mastery`; a manual run of a quiz
      **Dependencies:** T7, T8
      **Files:** `core/logic/scoring.ts`, `core/logic/mastery.ts`, `core/progress-store.ts`, plus small hooks in the study and quiz pages (including the "still learning only" study filter moved from T5)
      **Scope:** M

### T10: Daily goal, streak, and top-bar indicators

**Description:** Add a `Clock` service and `LocalDay` helpers. Points go into a per-day ledger. A streak counts consecutive local days on which the goal was met. The daily goal setting defaults to 50. The top bar shows today's points ring and 🔥 streak, plus a "keep it alive" state when today's goal isn't met yet.
**Acceptance criteria:**

- [x] The streak goes up when the goal is met on consecutive days and resets after a missed day
- [x] Midnight and DST transitions are tested with an injected clock
- [x] The top bar updates live as points are earned
      **Verification:** `npm test -- streak`; Playwright with a mocked clock: 2 days → streak of 2, a gap → 0
      **Dependencies:** T9
      **Files:** `core/clock.ts`, `core/logic/streak.ts`, `core/logic/local-day.ts`, `shell/top-bar.*`, `e2e/streak.spec.ts`
      **Scope:** M

### T11: Dashboard and leaderboard

**Description:**

- Dashboard (`/`): a Today card (points, goal ring, streak, best streak), a "continue where you left off" link, and the gathering-dust and fresh-picks lists.
- `/stats`: best sets ranked, mastered sets with dates, and a 26-week activity heatmap.
- Sidebar progress rings use the set mastery %.
  **Acceptance criteria:**
- [x] Seeded state produces the expected ordering in each list (unit-tested selectors)
- [x] A set not studied for ≥ 7 days appears under "gathering dust", stalest first
- [x] The heatmap is keyboard-focusable, and each day has a tooltip/aria label with its points
      **Verification:** unit tests for the selectors; Playwright with seeded localStorage
      **Dependencies:** T10
      **Files:** `core/logic/leaderboard.ts`, `features/dashboard/*`, `features/stats/*`, `shared/heatmap.*`, `shared/progress-ring.*`
      **Scope:** M

### ✅ Checkpoint C: Progress

- [x] A full day's loop (study → quiz → points → streak) persists across reloads
- [x] The scoring, streak and dashboard e2e tests pass
- [ ] **Review with you: point values, daily goal, what the dashboard emphasises**

---

## Phase 4: Search, notebook, content

### T12: Search overlay

**Description:** A command palette built on a CDK overlay. It opens from the top-bar icon, `Ctrl/⌘+K` or `/`. A Fuse.js index covers set metadata and card text, built lazily the first time search opens. Results are grouped (Sets / Cards) and navigable with the keyboard. Choosing a card deep-links to study mode at that card (`?card=c014`).
**Acceptance criteria:**

- [x] The overlay takes up no layout space while closed; the focus trap works, and Esc returns focus to where it was
- [x] "buongorno" finds the Buongiorno card, and results appear in < 100ms with all sets loaded
- [x] Enter on a card result opens study mode on that card
      **Verification:** component test for keyboard navigation; manual timing in DevTools
      **Dependencies:** T5
      **Files:** `features/search/search-overlay.*`, `core/search-index.ts`, `shell/top-bar.*`
      **Scope:** M

### T13: Questions notebook and "Copy for Claude"

**Description:** A `NotebookStore` (stored in the `lf:state` document). A quick-capture dialog opens from the `?` key or a button on study and quiz cards, with the set and card filled in automatically. The `/questions` page lists questions with status and set filters, editing, deleting and resolving. "Copy for Claude" copies the prompt format from SPEC F7, with a fallback when the clipboard API isn't available. "Download .json" saves the same data. Exporting marks questions `sent`.
**Acceptance criteria:**

- [x] A question can be captured in ≤ 3 keystrokes plus its text from any card, and it shows the set and card it came from
- [x] The copied text matches the spec format exactly (snapshot test)
- [x] Questions persist and can be filtered by status
      **Verification:** unit test for the export formatter; Playwright: capture → copy → read the clipboard
      **Dependencies:** T8 (storage), T5/T7 (card hooks)
      **Files:** `core/notebook-store.ts`, `core/logic/question-export.ts`, `features/notebook/*`, `shared/capture-dialog.*`
      **Scope:** M

### T14: Content guide and the duplicate check

**Description:** Write `docs/content-guide.md` with:

- tone (informative and fun, one delightful detail per card)
- answer-length rules, and what goes in `details`
- card ID rules
- set size
- the "accuracy over flair" rule
- the **topic-scope rules** from SPEC F8: band-first for CDs, a small album companion set by default, a full album set only when asked, extend an existing band set rather than duplicate it, and movie sets
- a step-by-step workflow for generating a set and for folding in exported questions
- 3 good and 3 bad example cards.

Tune the validator's similarity threshold on the sample set.
**Acceptance criteria:**

- [x] A fresh Claude session, given only CLAUDE.md and the guide, could produce a valid set
- [x] The guide explains exactly how to use the "Copy for Claude" output
      **Verification:** a doc review with you at Checkpoint D
      **Dependencies:** T2
      **Files:** `docs/content-guide.md`, `CLAUDE.md`, `scripts/check-sets.mjs`
      **Scope:** S

### T15: Starter sets: Modest Mouse

**Description:** The band set is the main one. Write `modest-mouse-band` (about 40 cards: formation in Issaquah, members and line-up changes, key eras and labels, sound and influences, the discography arc, notable songs, fun stories). Include a few cards on where _We Were Dead_ fits in the band's story. Then write the small companion set `modest-mouse-we-were-dead` (about 12 cards: highlights, key tracks, Johnny Marr's involvement, how it was made, one or two good stories), with no duplicates of the band set. Leave out facts I'm not confident about.
**Acceptance criteria:**

- [x] Both sets pass `sets:check` with zero errors and zero duplicate warnings
- [x] All answers are short, and every card has `details`
      **Verification:** `npm run sets:check`; you read them through for accuracy and tone
      **Dependencies:** T14
      **Files:** `public/sets/modest-mouse-band.json`, `public/sets/modest-mouse-we-were-dead.json`
      **Scope:** S

### T16: Starter sets: Italian

**Description:** Write five sets:

- `italian-greetings`
- `italian-numbers-time`
- `italian-cafe-food`
- `italian-essential-verbs`
- `italian-travel`

They're travel- and conversation-focused. Use `accept` for common variants and keep accents correct.
**Acceptance criteria:**

- [x] All 5 sets pass `sets:check`, with no duplicates between sets
- [x] Prompts make it clear which direction to answer in (for example "How do you say… in Italian?")
      **Verification:** `npm run sets:check`; quiz yourself on one set as a smoke test
      **Dependencies:** T14
      **Files:** `public/sets/italian-*.json`
      **Scope:** S

### ✅ Checkpoint D: Feature complete

- [x] All V1 features work together, with 7 starter sets loaded
- [ ] **Review with you: content accuracy and tone, and the notebook → Claude loop tried once for real**

---

## Phase 5: Polish & ship

### T17: Accessibility, reduced-motion and mobile pass

**Description:** Run axe on every route and fix any violations. Check focus order and visible focus, `aria-live` for quiz feedback, reduced motion everywhere, and touch targets of ≥ 44px. Check layouts at 375px.
**Acceptance criteria:**

- [x] No axe violations on any route, in either theme (`e2e/a11y.spec.ts`, WCAG 2.2 AA tags)
- [x] Every flow is usable at 375px and with the keyboard only
- [x] With reduced motion on, nothing flips, slides or bursts confetti
      **Verification:** Playwright + `@axe-core/playwright` (needs your OK as a new dev dependency); manual mobile check
      **Dependencies:** T11, T12, T13
      **Files:** various small fixes, `e2e/a11y.spec.ts`
      **Scope:** M

### T18: CI and (optional) GitHub Pages deploy

**Description:** A GitHub Actions workflow that runs `npm ci`, `npm run verify` and the Playwright e2e tests on every push and PR. If you choose Pages (Open Question 3), add a deploy job (`base-href`, a `404.html` copy so client-side routes work).
**Acceptance criteria:**

- [ ] CI is green on main, and a failing test or a broken set file fails CI (workflow added. A broken set fails `npm run verify` locally. Not yet confirmed on GitHub)
- [ ] (Optional) the app is live on Pages and deep links work on refresh
      **Verification:** a test PR with a deliberately broken set fails, and fixing it passes
      **Dependencies:** T17 (needs your OK, since deployment is "Ask first")
      **Files:** `.github/workflows/ci.yml`, (optional) `.github/workflows/deploy.yml`
      **Scope:** S

### ✅ Checkpoint E: V1 done

- [x] Every success criterion in SPEC.md has been checked (see notes below)
- [x] SPEC.md is updated to match what was built

**Success criteria review (2026-11-25):**

1. ⚠️ **Partly met.** From the dashboard it's 2 clicks to the first card (set → Study), and the flip is a 3rd action (Space/click). Search reaches a card with Ctrl+K, typing and Enter.
2. ⚠️ **Not measured.** The flip uses only a CSS transform (GPU-composited, no layout shift by design), but there is no frame-rate measurement yet.
3. ✅ Matcher cases covered by unit tests (perché/perche, Buongorno → close, il gatto).
4. ✅ Persistence and export/import round-trip (unit and e2e).
5. ✅ Streak across days and reset after a gap (unit and e2e with a mocked clock).
6. ✅ Dashboard and leaderboard lists from seeded state (e2e).
7. ✅ "Copy for Claude" format (unit snapshot and e2e clipboard read).
8. ✅ Typo search under 100ms with 400 cards (unit), and "buongorno" finds the card (e2e).
9. ✅ axe WCAG 2.2 AA clean in both themes, and no theme flash (e2e).
10. ✅ `npm run verify` is green, and all 7 starter sets (plus the sample set) pass `sets:check`.

**Accessibility notes:** automated checks (axe) and keyboard-only flows are covered by tests. A screen-reader pass (NVDA or VoiceOver) has **not** been done yet. The heatmap shows 13 weeks on phones so day cells meet the 24px target spacing.
