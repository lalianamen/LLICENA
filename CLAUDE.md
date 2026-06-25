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
  - `node --check` any JS you touch; grep that every id / class / `data-*` hook the
    JS depends on still exists after an HTML or CSS edit.
  - Confirm any new CSS class is defined and any inline `<svg>` has an explicit size.
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
