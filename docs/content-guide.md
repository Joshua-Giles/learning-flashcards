# Content guide: writing card sets

This is the house style for every set in `public/sets/`. It's written for Claude Code, but it works just as well for writing sets by hand. The JSON format is defined by [`schema/set.schema.json`](../schema/set.schema.json), and `npm run sets:check` enforces most of the rules below.

## 1. What to make for a topic

| The request                                    | What to create                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "I got a new CD by X" / "tell me about band X" | **Band-first.** One big **band set** (`<band>-band`, about 35–45 cards) covering origins, members and line-up changes, eras and labels, sound and influences, the albums over time, notable songs, and good stories. Add a small **album companion set** (`<band>-<album-slug>`, about 10–15 cards) with the highlights, key tracks, how it was made, and one or two stories. The band set can mention the album where it fits the band's story. |
| "…and I want to know as much about the album"  | A full **album set** (about 25–35 cards) next to the band set. Only make this when it's asked for explicitly.                                                                                                                                                                                                                                                                                                                                    |
| The band already has a set                     | **Extend the existing band set** (new cards, new IDs, bump `version`) and add only the album companion set. Never make a second band set.                                                                                                                                                                                                                                                                                                        |
| A movie                                        | One set about the film (about 25–35 cards): premise and early plot beats (**no big spoilers** unless asked), cast, director, how it was made, reception, trivia. Add director or franchise cards only where they're interesting.                                                                                                                                                                                                                 |
| A language                                     | Small themed starter sets (about 25–30 cards each), such as greetings, numbers, food, verbs and travel, rather than one huge set.                                                                                                                                                                                                                                                                                                                |
| Anything else                                  | One set of 20–40 cards. If the topic is big, propose a split first.                                                                                                                                                                                                                                                                                                                                                                              |

## 2. Card rules

```json
{
  "id": "c014",
  "prompt": "Which former Smiths guitarist joined Modest Mouse in 2006?",
  "answer": "Johnny Marr",
  "details": "Marr co-wrote and played on **We Were Dead Before the Ship Even Sank**, then left in 2008/09 to work on other projects.",
  "hint": "Think Manchester, think jangly guitars"
}
```

- **One fact per card.** If the prompt has "and" in it, it's probably two cards.
- **`answer` is short and typeable**: 6 words or fewer, 80 characters maximum. It gets typed in quiz mode. Names, numbers, single words and short phrases are ideal.
- **`accept`** lists other correct answers, such as a nickname, a different spelling, or a number written as a word ("4" and "four"). You don't need to include case, accent or "the/il/la" variants, because the quiz checker already ignores those.
- **`details` is where the fun lives**: one or two sentences of context, a surprising fact, or a memory hook. Light Markdown only: `**bold**`, `*italic*`, `[link](https://…)`.
- **`hint`** (optional) should nudge without giving the answer away.
- **`quizzable: false`** is for the rare card whose answer can't reasonably be typed. It still appears in study mode.
- **The prompt names its direction** for languages: "How do you say _thank you_ in Italian?" or "What does _grazie_ mean?". Never just "grazie?".
- Avoid "which of the following" (there are no options) and true/false prompts (they're too guessable).

## 3. Tone

**Informative and fun.** Write like a friend who knows the band or language inside out and is excited to tell you about it. Surprising, specific, a little playful, never cringeworthy. One delightful detail per card beats three dry ones.

**Accuracy beats flair, always.** If you're not confident a fact is correct (a chart position, an exact date, who played on which track, a quote), **leave it out**. Rephrase to the level you _are_ sure of ("in the mid-2000s" instead of an exact date), or skip the card. Never invent quotes, statistics or anecdotes. A smaller true set is better than a bigger shaky one.

| ✅ Good                                                                                                                                                                                                                          | ❌ Bad                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Prompt:** "Which Washington town did Modest Mouse form in?" **Answer:** "Issaquah". **Details:** "A small town just east of Seattle, about as far from the grunge spotlight as it was from the city."                          | **Prompt:** "Tell me about Modest Mouse's early days" (not one fact, no typeable answer)                                  |
| **Prompt:** "How do you say _the bill, please_ in Italian?" **Answer:** "Il conto, per favore". **Accept:** ["conto per favore"]. **Details:** "In Italy the waiter won't bring the bill until you ask. Lingering is the point!" | **Prompt:** "conto?" (which direction? what's being asked?)                                                               |
| **Prompt:** "What is _quattro_?" **Answer:** "Four". **Accept:** ["4"].                                                                                                                                                          | **Answer:** "Four, which is also the number of seasons Vivaldi wrote about" (too long to type; that belongs in `details`) |

## 4. IDs and versions

- Set `id`: kebab-case, equal to the file name (`public/sets/<id>.json`), and permanent.
- Card `id`s: `c001`, `c002`, … in order. **Never rename, renumber or reuse a card ID.** Progress is stored as `setId/cardId`. When you delete a card, its ID retires with it. New cards take the next unused number.
- Bump the set's `version` and `updated` (YYYY-MM-DD) whenever you change the set's cards.
- Start each file with `"$schema": "../../schema/set.schema.json"` for editor autocomplete.
- **`group`** puts sets into a collapsible section of the sidebar. Every set about a band or artist gets `"group": "<Artist name>"` (exactly the same string for the main set and its album sets, e.g. `"Nick Drake"`), and every language set gets the language (`"Italian"`). Leave it out for one-off topics.
- **Album sets** add the tag `"album"` so they sort after the artist's main set. Title them `"<Artist>: <Album>"`. The sidebar drops the `"<Artist>: "` prefix inside the group.

## 5. Workflow: a new set

1. Read the existing sets in `public/sets/` (at least their prompts) to avoid duplicates.
2. Decide the topic scope using section 1. For music, that's band-first.
3. Write `public/sets/<id>.json`.
4. Run `npm run sets:check`. Fix **every error and every near-duplicate warning**, then run it again until it's clean. It also rebuilds `public/sets/index.json`.
5. Mention any facts you left out because you weren't confident, so the user knows what's missing.

## 6. Workflow: questions from the notebook

The app's **Questions** page has **Copy for Claude**, which produces text like this:

```
Please answer these questions and add them as new cards to the matching sets
in learning-flashcards (follow docs/content-guide.md, avoid duplicates):

- [modest-mouse-band / c014] Why did Johnny Marr join the band?
- [italian-greetings] What's the difference between ciao and salve?
- [general] Are there Italian words that came from Modest Mouse lyrics? 🙃
```

For each line:

1. **The reference shows where it belongs.** `[set / card]` is a question about that card, `[set]` belongs in that set, and `[general]` means pick the best existing set or suggest a new one.
2. **Answer it briefly in chat** first, so the user gets the answer straight away.
3. **Add one or more cards** to the matching set: new IDs, never edits to existing IDs. Bump `version` and `updated`.
4. If the honest answer is "nobody really knows" or you're not sure, say so in chat and don't make a card out of a guess.
5. Run `npm run sets:check` until it's clean.
6. Remind the user to mark those questions **Resolved** in the app. Copied questions show as **Sent** until then.
