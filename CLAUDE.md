# Learning Flashcards

Personal Angular 22 flashcard app. Single user, no backend. Card sets are JSON files in
`public/sets/`, and user state lives in `localStorage`.

- **Spec (source of truth):** `SPEC.md`
- **Plan / tasks:** `tasks/plan.md`, `tasks/todo.md` (tick tasks off as they land)

## Commands

```
npm start            # dev server → http://localhost:4200
npm test             # Vitest unit tests (single run); npm run test:watch for watch mode
npm run e2e          # Playwright incl. axe a11y checks (starts its own dev server on :4300)
npm run lint         # angular-eslint
npm run format       # prettier --write .
npm run sets:check   # validate public/sets/*.json + regenerate public/sets/index.json
npm run sets:test    # validator's own tests (node:test)
npm run verify       # lint + format check + sets tests + sets check + unit tests + build
```

## Code conventions

- Use standalone components with signals and `inject()`, and the `@if`/`@for` control flow. OnPush is the Angular 22 default, so don't set it explicitly.
- Name files in the 2025 style guide format (`set-store.ts`, `sidebar.ts`, with no `.component` suffix). The component selector prefix is `lf-`.
- Style with Tailwind utilities that use the theme tokens in `src/styles.css` (`bg-surface`, `text-muted`, `border-line`, `text-accent`…). Never use raw colours.
- Keep pure logic (matching, scoring, streaks) in `src/app/core/logic/` and test it test-first, without TestBed.
- Unit tests sit next to the source as `*.spec.ts`. E2E specs live in `e2e/`.
- Every animation needs a `prefers-reduced-motion` fallback, and every control has to work from the keyboard.

## Content workflow (generating sets)

**Read `docs/content-guide.md` before writing or changing any set**, including when the user pastes "Copy for Claude" questions from the app. The essentials:

- One set per file: `public/sets/<set-id>.json`. The file name must equal `id`. Add `"$schema": "../../schema/set.schema.json"`.
- **Card IDs are permanent.** Never rename, renumber or reuse a card ID, because progress is keyed on `setId/cardId`. Add new cards with new IDs, and bump the set's `version` and `updated`.
- Keep `answer` short and typeable (about 6 words or fewer, 80 characters at most). Put the fun context in `details`.
- **Music topics are band-first:** a new CD gets a big band set (about 35–45 cards) plus a small album companion set (about 10–15). Write a full album set only when explicitly asked. If the band already has a set, extend it. See SPEC F8.
- **Accuracy over flair:** if you're not confident a fact is right, leave it out.
- Always finish with `npm run sets:check` and fix every error and warning.

CI (`.github/workflows/ci.yml`) runs `npm run verify` and `npm run e2e` on every push and PR.

## Boundaries

- **Always:** run `npm run verify` before committing, keep card IDs stable, and run `sets:check` after touching content.
- **Ask first:** adding dependencies not listed in SPEC → Tech Stack; changing the stored-state schema (it needs a migration); changing scoring or mastery rules; any backend or network call beyond the local set files; deployment.
- **Never:** commit secrets, render set content as raw HTML, rename or reuse card IDs, delete or skip failing tests to get to green, or invent facts.
