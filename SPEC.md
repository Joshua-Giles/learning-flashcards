# Spec: Learning Flashcards — V1

Status: **draft, awaiting review**
Last updated: 2026-11-24

## Objective

A personal web app for learning topics through sets of cards that Claude writes. Examples: the history of Modest Mouse and the album I just bought, or starter Italian. It is built for one user, focused on studying, and a little competitive with myself.

**The usual way I study a set:**

1. Pick a set from the collapsible sidebar, or find one with search.
2. **Study:** flip through cards Quizlet-style. Answer in my head, flip, then mark myself "Knew it" or "Still learning".
3. **Quiz:** see the same cards again, but type the answer this time. The app checks it, and is forgiving about case, accents and small typos.
4. Earn points, keep a daily streak going, and watch sets move towards "mastered".
5. When something makes me curious, write the question in the **Questions notebook**. Later I export it, paste it into Claude Code, and Claude adds new cards that answer it.

**What success looks like:** I open the app, I'm studying within two clicks, and I want to come back tomorrow to keep my streak going.

### User stories

| #   | As a learner I want to…                                                                                  | So that…                                      |
| --- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| U1  | browse sets in a sidebar I can collapse                                                                  | I see the options only when I want to         |
| U2  | search sets and cards from a search box that stays out of the way                                        | I can jump to a topic quickly                 |
| U3  | flip cards with a smooth animation and use keyboard shortcuts                                            | studying feels fast and pleasant              |
| U4  | type answers in a quiz mode that uses the same answers as the flip cards                                 | I practise active recall                      |
| U5  | get a forgiving check on typed answers (case, accents, articles, small typos) and be able to override it | I'm not marked wrong for "perche" vs "perché" |
| U6  | earn points, combos and a daily streak                                                                   | I stay motivated across several days          |
| U7  | see a personal leaderboard of my best sets, mastered sets and sets I haven't touched in a while          | I know what to review next                    |
| U8  | write down questions while I study and export them for Claude                                            | my sets grow based on what I'm curious about  |
| U9  | switch between a clean light theme and a clean dark theme                                                | it's comfortable at any time of day           |

## Assumptions (correct any of these)

1. **The framework is modern Angular 22 (currently v22.3), not AngularJS 1.x.** ✅ _Confirmed 2026-11-24._
2. **There's no backend.** It is a static single-page app. Card sets are JSON files in the repo. Progress, score and notes live in the browser's `localStorage`, with JSON export and import as a backup.
3. **There's one user on one device**, so there are no accounts or logins. The "leaderboard" means my own sets ranked against each other.
4. **Content arrives through Claude Code.** I give a prompt, Claude writes or extends set JSON files in the repo, a validator checks them, and I commit. The app never calls an AI API itself.
5. It targets modern evergreen browsers (desktop first, but usable on a phone).
6. Typed quiz answers are **the same `answer`** that's on the flip card. To keep answers typeable, the content guide requires short answers, and any extra context goes in a separate `details` field.

## Tech Stack

| Concern            | Choice                                                                                                | Why                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Framework          | **Angular 22** (standalone components, signals, zoneless, `@if`/`@for` control flow)                  | Current Angular. Signals keep state simple without needing NgRx.                   |
| Language           | TypeScript (strict)                                                                                   |                                                                                    |
| Styling            | **Tailwind CSS v4**, plus CSS custom properties for theme tokens                                      | Clean, minimal UI without fighting a component library's look                      |
| UI primitives      | **Angular CDK** (overlay, a11y/focus trap, `BreakpointObserver`)                                      | Accessible search overlay and drawer behaviour without imposing Material's styling |
| Animation          | CSS 3D transforms for the card flip, Angular's native `animate.enter`/`animate.leave` for transitions | GPU-friendly. `@angular/animations` is deprecated in recent Angular.               |
| Icons              | `lucide-angular`                                                                                      | Light, consistent icon set                                                         |
| Search             | `fuse.js`                                                                                             | Small fuzzy search library that works without a server                             |
| Celebration        | `canvas-confetti`                                                                                     | Small and fun, used for "set mastered" and new personal bests                      |
| Unit tests         | **Vitest** (the Angular CLI default)                                                                  |                                                                                    |
| E2E tests          | **Playwright**                                                                                        | Covers the core flows in a real browser                                            |
| Content validation | Node script with **Ajv** (JSON Schema)                                                                | Catches broken or duplicate cards before they reach the app                        |
| Lint/format        | `angular-eslint` + Prettier                                                                           |                                                                                    |

Every dependency beyond the Angular defaults is listed here on purpose. Adding anything else counts as "Ask first".

## Commands

```
Install:        npm install
Dev server:     npm start                 # ng serve → http://localhost:4200
Build:          npm run build             # ng build (production)
Unit tests:     npm test                  # ng test (Vitest), --watch=false in CI
E2E tests:      npm run e2e               # playwright test
Lint:           npm run lint              # ng lint
Format:         npm run format            # prettier --write .
Validate sets:  npm run sets:check        # schema + ID + duplicate checks, regenerates public/sets/index.json
All gates:      npm run verify            # lint + test + sets:check + build
```

## Capability Map

The app has a few independently testable capabilities. Build them in dependency order.

| Module id  | Responsibility                                                     | Depends on                                        |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `content`  | Set/card JSON schema, validator, manifest, loading sets            | —                                                 |
| `shell`    | Layout, sidebar, routing, theme, keyboard shortcuts                | content                                           |
| `study`    | Flip-card mode                                                     | content, shell                                    |
| `quiz`     | Typed-answer mode and the answer matcher                           | content, shell                                    |
| `search`   | Search overlay over sets and cards                                 | content, shell                                    |
| `progress` | Storage, scoring, per-card mastery, streaks, dashboard/leaderboard | content (`study` and `quiz` report results to it) |
| `notebook` | Capturing questions and exporting them for Claude                  | content, shell                                    |

Build order: content → shell → study → quiz → search → progress → notebook. (`search` and `notebook` don't depend on each other, so they can go in either order.)

## Functional Requirements

### F1. Layout & theme (`shell`)

- **Top bar (slim):** a sidebar toggle, the app name, a search icon, today's points and a 🔥 streak counter, and a theme toggle.
- **Sidebar:** sets grouped by category (for example _Music_, _Languages_). Each row has an emoji or icon, a title and a small progress ring showing how much of the set is mastered. It collapses to nothing (not to an icon rail), and the collapsed or open state is remembered. Below 768px it becomes an overlay drawer.
- **Main area:** one centred column of content, nothing more.
- **Theme:** Light, Dark or System. It's stored in preferences and applied through a `data-theme` attribute on `<html>`, using CSS variable tokens. The theme is applied before Angular starts, so there's no flash.
- **Routes:**
  - `/` dashboard
  - `/sets/:setId` set overview
  - `/sets/:setId/study`
  - `/sets/:setId/quiz`
  - `/questions` notebook
  - `/stats` leaderboard
  - unknown routes go to the dashboard.

### F2. Content (`content`)

- Each set is one file, `public/sets/<set-id>.json`. `public/sets/index.json` is a manifest that `npm run sets:check` generates. It holds the ID, title, category, emoji, card count and version for every set.
- Card schema (JSON Schema at `schema/set.schema.json`):

```json
{
  "schemaVersion": 1,
  "id": "italian-greetings",
  "title": "Italian: Greetings & Basics",
  "description": "Ciao! The 30 phrases you'll use in your first hour in Italy.",
  "category": "Languages",
  "emoji": "👋",
  "tags": ["italian", "beginner"],
  "version": 1,
  "updated": "2026-11-24",
  "cards": [
    {
      "id": "c001",
      "prompt": "How do you say \"good morning\"?",
      "answer": "Buongiorno",
      "accept": ["buon giorno"],
      "details": "Good until early afternoon — then switch to *buonasera*. Literally \"good day\".",
      "hint": "Starts with \"buon…\"",
      "tags": ["greetings"],
      "quizzable": true
    }
  ]
}
```

- **Field rules:**
  - `answer` should be short (about 6 words or fewer).
  - `accept` lists other correct answers.
  - `details` is the fun, informative extra shown on the back of the card and after a quiz answer. It allows light Markdown: bold, italics and links only.
  - `quizzable: false` keeps a card out of typed quizzes when its answer can't reasonably be typed. It defaults to true.
- **Card IDs never change** once committed, because progress is stored under `setId/cardId`. Deleting a card is fine; reusing its ID is not.
- **The validator (`npm run sets:check`) fails on:**
  - schema errors
  - duplicate set or card IDs
  - a file name that doesn't match the set's `id`
  - `answer` longer than 80 characters when `quizzable` is true
  - near-duplicate prompts within or across sets: normalised token similarity ≥ 0.8 is a warning, and an exact normalised match is an error.

### F3. Study mode (`study`)

- Shows one card at a time with the prompt on the front. Flipping uses a 3D Y-axis rotation of about 450ms with an easing curve, and the back shows the `answer` and its `details`.
- **Controls (mouse and keyboard):**
  - Space or click: flip
  - `1`: "Still learning", `2`: "Knew it" (only once the card is flipped)
  - `←`/`→`: previous or next card
  - `H`: show the hint
  - `?`: write a question about this card
  - `S`: shuffle
- A progress bar and counter (for example "12 / 30") are shown.
- **Options:** shuffle, or "only cards I'm still learning".
- **End-of-session summary:** how many I knew versus am still learning, points earned, a "Quiz me now" button, and "Restart with the ones I missed".
- With `prefers-reduced-motion`, the flip becomes a short crossfade.

### F4. Quiz mode (`quiz`)

- Shows the prompt and an auto-focused text box. Enter submits. I can show the hint, which costs points.
- **Answer matcher** (a pure function, fully unit tested):
  1. Normalise both strings: lowercase, trim, collapse whitespace, strip punctuation, fold accents (é→e), and drop leading English and Italian articles (_the, a, an, il, lo, la, i, gli, le, l', un, uno, una_).
  2. **Correct** means an exact normalised match with `answer` or any entry in `accept`.
  3. **Close** means a Damerau-Levenshtein distance ≤ 1 for answers of 4–8 characters, or ≤ 2 for longer ones. I see what I typed next to the correct answer and can accept it.
  4. Otherwise it's **wrong**, and an **"I was right"** override button is shown (and counted separately).
  5. If the only difference was accents, it's correct but shows a small note: "Watch the accent: _perché_".
- After each answer, the correct answer and `details` are shown. Enter moves to the next card.
- The order favours weaker cards first (lower mastery box, then least recently seen), with a little randomness. Lengths: "all cards", or a quick 10.
- **Results screen:** accuracy %, points, best combo, a list of missed cards, and a "new personal best!" confetti burst when I beat my best.

### F5. Scoring, mastery & streaks (`progress`)

**Points**

| Event                                     | Points                     |
| ----------------------------------------- | -------------------------- |
| Study: "Knew it"                          | +2                         |
| Quiz: correct                             | +10                        |
| Quiz: close (accepted)                    | +7                         |
| Quiz: "I was right" override              | +5                         |
| Quiz: hint used                           | −3 from that card's points |
| Combo: every 5 correct in a row in a quiz | +5 bonus                   |
| First time a set is completed             | +25                        |
| Set becomes mastered                      | +100 🎉                    |

**Per-card mastery** uses Leitner boxes from 0 to 5:

- A correct quiz answer moves the card up one box, at most once per card per local calendar day. This means mastering a card needs recall on separate days.
- A wrong quiz answer drops it to box 1.
- "Knew it" in study can only move a card up to box 2. Recognising an answer is weaker than recalling it.
- A card counts as **mastered** at box ≥ 4. A **set** counts as mastered when ≥ 90% of its quizzable cards are mastered.

**Daily streak**

- A day counts once I reach the **daily goal**, which defaults to 50 points and can be changed in settings. Days are local calendar days, never UTC.
- The streak shows in the top bar. When it would break tonight, it shows a gentle "keep your streak alive" state.
- Today's points and progress towards the goal are shown as a small ring.

**Dashboard / leaderboard (`/` and `/stats`)**

- **Today:** points, goal ring, streak, and the longest streak ever.
- **Activity heatmap:** points per day for the last 26 weeks, GitHub-style.
- **Best sets:** ranked by best quiz accuracy, with total points as the tie-breaker.
- **Mastered sets:** each with the date it was mastered.
- **Gathering dust:** sets studied before but not in ≥ 7 days, sorted by how long ago (stalest first).
- **Fresh picks:** sets never opened.

**Storage**

- One versioned `localStorage` document, stored under the key `lf:state` (current schema version 1), with migration functions for future versions.
- UI preferences (theme, sidebar) stay in their own small keys (`lf:theme`, `lf:sidebar-open`), outside the progress document. That keeps the no-flash theme script trivial, and "export progress" covers learning data only. _(Decided during T8.)_
- Settings has **Export progress** (downloads JSON), **Import progress** (validated before it replaces anything) and **Reset**, which asks me to confirm.
- If storage is unavailable or full, a clear banner says so instead of failing silently.

### F6. Search (`search`)

- The search icon in the top bar opens a centred overlay, like a command palette. It also opens with `Ctrl/⌘+K` or `/`. It takes up no space while closed.
- It fuzzy-searches set titles, descriptions and tags, and card prompts, answers and details. Results are grouped as **Sets** and **Cards**.
- The arrow keys move through results, Enter opens one, and Esc closes the overlay. Choosing a card opens that set's study mode at that card.
- Card text is loaded lazily the first time search opens.

### F7. Questions notebook (`notebook`)

- I can write a question from anywhere: the `?` key or a button on any card fills in the set and card automatically, or I can use the `/questions` page for a free-form question.
- Each question stores: `id`, `text`, optional `setId`/`cardId`, `createdAt`, and `status` (`open` | `sent` | `resolved`).
- The list can be filtered by status or set, and questions can be edited, deleted or marked resolved.
- **"Copy for Claude"** copies a ready-to-paste prompt to the clipboard, for example:

```
Please answer these questions and add them as new cards to the matching sets
in learning-flashcards (follow docs/content-guide.md, avoid duplicates):

- [modest-mouse-band / c014] Why did Johnny Marr join the band?
- [italian-greetings] What's the difference between ciao and salve?
- [general] Are there Italian words that came from Modest Mouse lyrics? 🙃
```

- There's also **Download .json** for the same data. Copied or downloaded questions are marked `sent`.

### F8. Content workflow (Claude Code side)

- `docs/content-guide.md` is the house style for generated sets:
  - The tone is informative and fun: one surprising detail per card where possible, and nothing cringeworthy.
  - Answers are short; context goes in `details`.
  - Each card tests one fact.
  - A set aims for 20–40 cards. Band sets can go up to about 45, and album companion sets have about 10–15.
  - No duplicates: check existing sets first and run `sets:check`.
  - **Accuracy over flair:** when I'm not confident about a fact (dates, chart positions, personnel), I leave it out or mark it for review instead of guessing.
- **What a "topic" means (music, and by extension movies):** when I mention a new CD, the main focus is the **band as a whole**: origins, members, sound, discography arc, influence and stories. The specific album gets **partial** coverage. Concretely:
  - **Default (I just name the album):** one large **band set** (about 35–45 cards), with a few cards about the album where they fit the band's story. Also one **small album companion set** (about 10–15 cards: the highlights, key tracks, how it was made, one or two good stories).
  - **"Equal coverage" (only when I say I want to know as much about the album):** a full album set of about 25–35 cards next to the band set.
  - **A band that already has a set:** extend it, and add only the small album companion set. Don't make a second band set.
  - **Movies:** a set about the film itself (about 25–35 cards: plot beats without big spoilers unless I ask, cast, director, how it was made, trivia). Only add director or franchise context cards where they're interesting.
- To generate a set, I prompt Claude Code with something like "make a set about X". Claude writes `public/sets/<id>.json`, runs `npm run sets:check`, and fixes any warnings.
- To fold in my questions, I paste the "Copy for Claude" text. Claude adds the cards (keeping existing card IDs) and bumps the set's `version`.

### Starter content (V1)

| Set id                      | Title                                                                                                       | ~Cards |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| `modest-mouse-band`         | Modest Mouse: The Band (origins, members, eras, sound, discography, stories)                                | 40     |
| `modest-mouse-we-were-dead` | Modest Mouse: _We Were Dead Before the Ship Even Sank_ (companion: highlights, key tracks, how it was made) | 12     |
| `italian-greetings`         | Italian: Greetings & Basics                                                                                 | 30     |
| `italian-numbers-time`      | Italian: Numbers, Days & Time                                                                               | 30     |
| `italian-cafe-food`         | Italian: At the Café & Restaurant                                                                           | 30     |
| `italian-essential-verbs`   | Italian: Essere, Avere & Friends                                                                            | 25     |
| `italian-travel`            | Italian: Getting Around                                                                                     | 25     |

## Project Structure

```
SPEC.md                    → This spec (kept up to date)
CLAUDE.md                  → Agent rules for this repo (commands, boundaries, content workflow)
docs/content-guide.md      → House style + schema guide for generating sets
schema/set.schema.json     → JSON Schema for set files
scripts/check-sets.mjs     → Validator + manifest generator
public/sets/*.json         → Card sets (one file per set) + generated index.json
src/app/
  core/                    → Services: storage, settings, theme, set-loader, progress, shortcuts
  core/models/             → TypeScript types (Set, Card, Progress, Question…)
  core/logic/              → Pure functions: answer-matcher, scoring, mastery, streaks (heavily unit-tested)
  shell/                   → Top bar, sidebar, layout
  features/dashboard/      → Dashboard + leaderboard/stats
  features/set-overview/
  features/study/          → Flip-card mode + flip-card component
  features/quiz/
  features/search/         → Search overlay
  features/notebook/
  shared/                  → Small reusable UI (progress ring, heatmap, button, kbd)
e2e/                       → Playwright specs
tasks/plan.md, tasks/todo.md → Implementation plan + task checklist
```

Unit tests sit next to their source files (`*.spec.ts`).

## Code Style

Use standalone components, signals for state, `inject()` instead of constructor injection, the new control flow, and kebab-case file names in the 2025 style (`flip-card.ts`, with no `.component` suffix). OnPush is the Angular 22 default, so it is not set explicitly. Keep logic in pure functions under `core/logic/` so it can be tested without TestBed.

```ts
// features/study/flip-card.ts
@Component({
  selector: 'lf-flip-card',
  host: { '[class.flipped]': 'flipped()', '(click)': 'toggle()' },
  template: `
    <div class="card-face front">{{ card().prompt }}</div>
    <div class="card-face back">
      <p class="answer">{{ card().answer }}</p>
      @if (card().details; as details) {
        <lf-markdown-lite [text]="details" />
      }
    </div>
  `,
})
export class FlipCardComponent {
  readonly card = input.required<Card>();
  readonly flipped = model(false);
  toggle() {
    this.flipped.update((f) => !f);
  }
}
```

- Component prefix: `lf-`.
- Do not use `any`. Model data types live in `core/models`.
- Each component should stay under about 200 lines. If one grows past that, split it.
- Never render set content as raw HTML. `details` goes through a tiny whitelist renderer (bold, italics, links with `rel="noopener"`).

## Testing Strategy

| Level             | Tool                               | What it covers                                                                                                                                                                                    |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (pure logic) | Vitest                             | answer matcher, scoring, Leitner mastery, streak/day-boundary math, storage migrations, search indexing. **Target: ≥ 90% line coverage for `core/logic/`.** Written test-first.                   |
| Component         | Vitest + Angular testing utilities | flip card, quiz input flow, sidebar collapse, search keyboard navigation                                                                                                                          |
| Content           | `npm run sets:check`               | every set file, run in CI                                                                                                                                                                         |
| E2E               | Playwright (Chromium)              | 1) pick a set → study → finish → see points; 2) quiz with a typo is accepted as close; 3) streak persists after reload; 4) write a question → Copy for Claude; 5) theme and sidebar state persist |

Date logic is tested with an injected clock so streaks crossing midnight and DST changes are covered.

## Boundaries

- **Always:**
  - Run `npm run verify` before committing.
  - Keep card IDs stable.
  - Run `sets:check` after touching content.
  - Respect `prefers-reduced-motion`.
  - Keep everything keyboard-accessible.
  - Use local dates for streaks.
- **Ask first:**
  - adding a dependency not listed in Tech Stack
  - changing the stored-state schema (needs a migration)
  - changing the scoring or mastery rules
  - adding a backend, accounts or any network call other than loading local set files
  - setting up deployment.
- **Never:**
  - commit secrets
  - render untrusted HTML from set files
  - rename or reuse card IDs
  - delete or skip failing tests to get to green
  - invent "facts" in content when unsure.

## Success Criteria

1. From a cold load, I can open a set and flip my first card in ≤ 2 clicks (or 1 keyboard shortcut plus Enter via search).
2. The card flip runs at 60fps on a mid-range laptop, with no layout shift. Reduced-motion mode uses a crossfade.
3. In quiz mode, `perche` is accepted for `perché` (with an accent note), and `Buongorno` is offered as close to `Buongiorno`. `il gatto` matches `gatto`.
4. Points, per-card mastery, streak and notes survive a page reload and a browser restart. Exporting then importing the progress JSON restores the same state.
5. Reaching the daily goal on two consecutive local days shows a 2-day streak. Missing a day resets it to 0 on the next visit.
6. The dashboard correctly lists best sets, mastered sets and "gathering dust" sets, as verified with seeded state in e2e.
7. "Copy for Claude" puts a correctly formatted prompt on the clipboard that includes set and card references.
8. Search finds a card by a misspelled word in its prompt (for example "buongorno") in under 100ms with all the starter sets loaded.
9. Light and dark themes both meet WCAG 2.2 AA contrast. There's no theme flash on load.
10. `npm run verify` passes, and all 7 starter sets pass `sets:check` with zero errors.

## Out of Scope (Deferred to V2+)

- **Full spaced-repetition scheduling ("due today" queues):** V1 orders quizzes by weakness; full scheduling only matters once there are many sets.
- **Multiple choice, matching or "type the prompt" (reverse) modes:** stick to flip and type first.
- **Audio pronunciation for Italian (Web Speech API):** nice to have, but browser voices vary a lot.
- **Syncing across devices, or accounts:** that needs a backend. Export and import cover backups for now.
- **Calling Claude from inside the app:** that needs an API key and a backend. The copy-paste loop is enough.
- **A card editor in the UI:** content is meant to come through Claude and git.
- **Images or album art on cards:** licensing and hosting questions. Text only in V1.
- **Achievements and badges beyond confetti:** see whether points and streaks are motivating enough first.
- **A PWA / offline install:** easy to add later with `@angular/pwa`.
- **Streak freezes:** wait to see whether the streak feels too punishing.

## Open Questions

_Resolved: Angular 22 confirmed. The album is_ We Were Dead Before the Ship Even Sank*, and music sets focus on the band (see F8).*

3. **Hosting:** run it only locally (`npm start`), or deploy to **GitHub Pages** through GitHub Actions? Note that Pages on a _private_ repo needs a paid GitHub plan.
4. **Is one device enough?** Progress in `localStorage` is per-browser, with manual export and import. Is that OK for V1?
5. **Daily goal:** is 50 points (about 5 correct quiz answers) a good default?
6. **Italian focus:** travel and conversation first (my assumption), or a stronger grammar track?
7. **Styling:** Tailwind + Angular CDK (my recommendation, for a minimal custom look), or Angular Material (faster, but looks more like "Google")?
