# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with the
task's own instructions; for trivial tasks, use judgment.

Source: the "Karpathy Guidelines" (github.com/multica-ai/andrej-karpathy-skills,
MIT) — a community distillation of Andrej Karpathy's public notes on LLM coding
pitfalls. Kept here because they match how this project should be built.

## 1. Think before coding
Don't assume. Don't hide confusion. Surface tradeoffs.
- State assumptions explicitly; if uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so; push back when warranted.
- If something is unclear, stop, name what's confusing, and ask.

## 2. Simplicity first
Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code; no unrequested "flexibility" or config.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it. Ask: "would a senior engineer call this overcomplicated?"

## 3. Surgical changes
Touch only what you must. Clean up only your own mess.
- Don't "improve" adjacent code, comments, or formatting; don't refactor what isn't broken.
- Match existing style even if you'd do it differently.
- Notice unrelated dead code → mention it, don't delete it.
- Remove only the imports/variables/functions YOUR change made unused.
- Every changed line should trace directly to the request.

## 4. Goal-driven execution — verify before claiming done
Define a success criterion, then check it.
- Turn vague asks into checks: "fix the bug" → "reproduce it, fix it, confirm it's gone."
- For multi-step work, state a brief plan: `step → verify: check`.
- This project has **no test framework** (vanilla static HTML/CSS/JS), so "verify"
  means the project's real checks, not unit tests:
  - Render the page (Playwright screenshot) and actually look at it — desktop **and**
    360px, in EN **and** a long-string language (RU).
  - When rendering, also fail on any browser-console error and click through one flow
    (pick an answer → Next → Back, switch a block): a perfect screenshot can hide a dead
    handler. The quiz shuffles question order (`js/app-course.js`), so locate a question
    by `id`, not by its on-screen number.
  - `node --check` any JS you touch; grep that every id / class / `data-*` hook the
    JS depends on still exists after an HTML or CSS edit — and the reverse: after a JS
    edit, grep that every hook the JS reads exists in the HTML.
  - Confirm any new CSS class is defined and any inline `<svg>` has an explicit size.
  - `node scripts/verify.js` runs the mechanical part in one shot: bank invariants
    (`scripts/check-banks.js`) + `node --check` over all non-vendor JS. Always run it
    after touching `js/questions/*`.
  - Reading the diff is not verification — render it. (An unsized icon once shipped
    oversized to prod; only rendering caught it.)

---
Working if: fewer stray changes in diffs, fewer rewrites from overcomplication, and
clarifying questions land before implementation rather than after a mistake.

## Agent lanes (multiple subagents — avoid collisions, break nothing)
Up to three subagents may run. Each edits ONLY its own files, so their changes never overlap
and deploys fast-forward cleanly:
- **design** (`.claude/agents/design.md`) — look & layout: HTML structure + `css/*.css` +
  presentational glue like `js/resources-render.js`. Not content facts, not resource data.
- **content** (`.claude/agents/content.md`) — the question banks `js/questions/*` and guides
  `js/guides/*`, verified against official sources. Not layout.
- **resources** (`.claude/agents/resources.md`) — ONLY `js/resources.js` (official-links/
  articles data) + its i18n keys. Not banks, not layout, not other JS.
Shared rule: never rename or remove an `id` / `class` / `data-*` hook another file's JS reads.
The orchestrator serializes deploys; since each agent's diff touches different files, merges
to `main` stay conflict-free.

## Construction banks: ALWAYS 5 blocks × 100 questions
Exam banks in the **Construction** category are **always 5 blocks of 100 questions**
(500 per course) — NOT the 50-question / 6-section shape used by other verticals. Give each
item a numeric `block` field (`1`–`5`, ~100 questions per block); the course player renders
block cards (`buildBlockCards` / `activeBlock` in `js/app-course.js`) and filters the quiz to
the selected block whenever items carry `block`. Keep `sec` too for the in-block section nav.
Applies to the CSLB trade & related exams under Construction (`c10`, `c20`, `c36`, `c7`,
`c16`, `cslb-law`, `asbestos`, `osha-construction`). Other verticals (driving, CDL, EPA,
beauty, …) stay 50 questions / 6 sections unless stated otherwise.

## Question authoring (banks & translations)
Every new or edited question must pass these. `scripts/check-banks.js` warns on the
measurable ones; the rest are review criteria for the content agent.
- **One verified key.** Exactly one defensibly correct option, checked against an
  official source. If a distractor is "partly true" in some configuration, rewrite it.
- **Sources: open official only; wording: original.** Every fact comes from open
  official / primary sources (federal & state statutes, agency handbooks, code
  publications — OSHA, EPA, CSLB, DMV, FMCSA…; US federal government works are public
  domain, 17 U.S.C. § 105). NEVER copy items from real exams or commercial prep banks —
  those are proprietary. Question and option wording is written from scratch: the owner
  claims IP rights on this bank, so verbatim copying both infringes and destroys
  protectability. The content agent cites the source for every fact.
- **No repeats within a course.** Every question tests a distinct fact or skill —
  across ALL five blocks, not just its own (blocks exist for coverage, not repetition).
  Asking the same fact forward and backward ("open run cap → symptom" and
  "symptom → open run cap") counts as a repeat unless it drills a genuinely different
  skill. The checker errors on identical stems and warns on textual near-duplicates;
  *semantic* duplicates it cannot see — checking for those is part of content review.
- **Distractors on-topic and plausible.** Wrong options are real misconceptions or
  adjacent facts from the same domain — never absurd fillers ("Be unaffected",
  "Smell it", "Filled with oil"). Litmus test: a person with zero domain knowledge
  should not be able to eliminate a single option; if they can strike two, rewrite.
- **No test-taking giveaways.** Options are grammatically parallel, continue the stem,
  and are of comparable length — the correct one must not be the only long, detailed
  option (checker flags the length cue). Spread correct answers roughly evenly across
  A–D (checker flags skew). Avoid "all/none of the above" and absolutes (always/never)
  that mark options as wrong.
- **Expand abbreviations and formulas on first use.** In the stem or the `re`
  explanation: "SEER (Seasonal Energy Efficiency Ratio)", "EER = BTU/h ÷ watts".
  The `re` must define every abbreviation/formula it relies on and say WHY the key is
  right — not just restate it. A reader who doesn't know the term must be able to
  learn it from the explanation alone.
- **Translations (RU/ES).** Never reorder `opts`: the player pairs translated options
  with EN by index and `correct` lives only in the EN file, so a reorder silently marks
  wrong answers and no render check will catch it. Options must grammatically continue
  the translated stem (not "приводит к тому, что он: Не затронут"). Keep the English
  exam term next to the translation on first use — «рабочий конденсатор (run
  capacitor)» — the real exam is in English. Edit EN + RU + ES in one commit.
