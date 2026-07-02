#!/usr/bin/env node
// Validates question-bank invariants in js/questions/.
// Structural problems are ERRORS (exit 1); authoring heuristics are WARNINGS.
// Run: node scripts/check-banks.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DIR = path.join(__dirname, "..", "js", "questions");

// Construction banks (CLAUDE.md): 5 blocks × ~100 questions, every item carries block 1–5.
const CONSTRUCTION = new Set([
  "c10-exam", "c20-exam", "c36-plumbing", "c7-low-voltage",
  "c16-fire-sprinkler", "cslb-law", "asbestos", "osha-construction",
]);

const ctx = { window: {} };
vm.createContext(ctx);
for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".js")).sort()) {
  try {
    vm.runInContext(fs.readFileSync(path.join(DIR, f), "utf8"), ctx, { filename: f });
  } catch (e) {
    console.error(`ERROR ${f}: does not evaluate — ${e.message}`);
    process.exit(1);
  }
}
const REG = ctx.window.COURSE_REGISTRY || {};
const LANG = ctx.window.COURSE_LANG || {};

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
// Word-level normalization for prose stems. NOT for options: stripping symbols
// would collapse formula options like "V × R" vs "V / R" into false duplicates.
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9а-яё ]+/gi, " ").replace(/\s+/g, " ").trim();
const normOpt = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();

for (const [course, items] of Object.entries(REG)) {
  const withBlock = items.filter((it) => "block" in it).length;
  // A construction bank with no block fields at all is a pending migration (warning);
  // a MIX of block/blockless items breaks the player's block filter (error per item).
  const blockShaped = withBlock > 0 || CONSTRUCTION.has(course);
  const blockRequired = withBlock > 0;
  if (CONSTRUCTION.has(course) && withBlock === 0) {
    warn(`${course}: construction bank not yet migrated to 5×100 blocks (no block fields)`);
  }
  const ids = new Set();
  const posCount = [0, 0, 0, 0];

  for (const it of items) {
    const tag = `${course}#${it.id}`;
    if (ids.has(it.id)) err(`${tag}: duplicate id`);
    ids.add(it.id);
    if (!it.q || !String(it.q).trim()) err(`${tag}: empty question`);
    if (!Array.isArray(it.opts) || it.opts.length !== 4) {
      err(`${tag}: expected 4 options, got ${Array.isArray(it.opts) ? it.opts.length : typeof it.opts}`);
    } else if (it.opts.some((o) => !o || !String(o).trim())) {
      err(`${tag}: empty option`);
    } else if (new Set(it.opts.map(normOpt)).size !== 4) {
      err(`${tag}: duplicate options within the question`);
    }
    if (!Number.isInteger(it.correct) || it.correct < 0 || it.correct >= (it.opts || []).length) {
      err(`${tag}: correct index out of range (${it.correct})`);
    }
    if (!it.sec) err(`${tag}: missing sec`);
    if (!it.re || !String(it.re).trim()) warn(`${tag}: missing explanation (re)`);
    if (blockRequired && !(Number.isInteger(it.block) && it.block >= 1 && it.block <= 5)) {
      err(`${tag}: block must be 1–5 (got ${it.block})`);
    }

    // Authoring heuristics (see CLAUDE.md "Question authoring").
    if (Array.isArray(it.opts) && it.opts.length === 4 &&
        Number.isInteger(it.correct) && it.correct >= 0 && it.correct < 4) {
      posCount[it.correct]++;
      const lens = it.opts.map((o) => String(o).length);
      const c = lens[it.correct];
      const others = lens.filter((_, i) => i !== it.correct);
      const mean = others.reduce((a, b) => a + b, 0) / others.length;
      if (c > 1.6 * mean && c >= Math.max(...others) + 10) {
        warn(`${tag}: correct option is much longer than the distractors (length cue)`);
      }
      if (it.opts.some((o) => /^(all|none) of the above\.?$/i.test(String(o).trim()))) {
        warn(`${tag}: uses all/none-of-the-above`);
      }
    }
  }

  // Bank shape.
  if (blockRequired) {
    if (items.length !== 500) warn(`${course}: ${items.length} questions (construction banks are 5×100 = 500)`);
    const per = {};
    for (const it of items) per[it.block] = (per[it.block] || 0) + 1;
    for (let b = 1; b <= 5; b++) {
      const n = per[b] || 0;
      if (n < 90 || n > 110) warn(`${course}: block ${b} has ${n} questions (~100 expected)`);
    }
  } else if (!blockShaped) {
    if (items.length !== 50) warn(`${course}: ${items.length} questions (expected 50)`);
    const secs = new Set(items.map((i) => i.sec));
    if (secs.size !== 6) warn(`${course}: ${secs.size} sections (expected 6)`);
  }

  // Repeats across the whole course (all blocks): identical stems are errors,
  // high word-overlap stems are warnings. Semantic repeats need human review.
  const seenStem = new Map();
  for (const it of items) {
    const n = norm(it.q);
    if (!n) continue;
    if (seenStem.has(n)) err(`${course}#${it.id}: duplicate stem of #${seenStem.get(n)}`);
    else seenStem.set(n, it.id);
  }
  const stemWords = items.map((it) => new Set(norm(it.q).split(" ").filter((w) => w.length > 2)));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = stemWords[i], b = stemWords[j];
      if (a.size < 5 || b.size < 5) continue;
      let inter = 0;
      for (const w of a) if (b.has(w)) inter++;
      if (inter / (a.size + b.size - inter) >= 0.75) {
        warn(`${course}#${items[j].id}: near-duplicate stem of #${items[i].id}`);
      }
    }
  }

  // Correct-answer position balance.
  const total = posCount.reduce((a, b) => a + b, 0);
  if (total >= 40) {
    posCount.forEach((n, i) => {
      const share = n / total;
      if (share > 0.40 || share < 0.10) {
        warn(`${course}: correct answer sits on ${"ABCD"[i]} in ${(share * 100).toFixed(0)}% of questions (aim ~25%)`);
      }
    });
  }
}

// Translations.
for (const [course, langs] of Object.entries(LANG)) {
  if (!REG[course]) { err(`${course}: translation exists but no EN bank`); continue; }
  const en = new Map(REG[course].map((it) => [it.id, it]));
  for (const [lng, items] of Object.entries(langs)) {
    const seen = new Set();
    for (const it of items) {
      const tag = `${course}.${lng}#${it.id}`;
      if (seen.has(it.id)) err(`${tag}: duplicate id`);
      seen.add(it.id);
      const src = en.get(it.id);
      if (!src) { err(`${tag}: id not present in EN bank`); continue; }
      if ("correct" in it) warn(`${tag}: translations must not carry 'correct' (it lives in the EN file only)`);
      if (!it.q || !String(it.q).trim()) err(`${tag}: empty question`);
      if (!Array.isArray(it.opts) || it.opts.length !== src.opts.length) {
        err(`${tag}: option count differs from EN`);
      } else if (it.opts.some((o) => !o || !String(o).trim())) {
        err(`${tag}: empty option`);
      }
    }
    if (seen.size < en.size) warn(`${course}.${lng}: covers ${seen.size}/${en.size} questions`);
  }
}
for (const course of Object.keys(REG)) {
  for (const lng of ["ru", "es"]) {
    if (!LANG[course] || !LANG[course][lng]) warn(`${course}: no ${lng} translation`);
  }
}

// Report.
for (const m of errors) console.error(`ERROR   ${m}`);
for (const m of warns) console.log(`warning ${m}`);
const byType = {};
for (const m of warns) {
  const t = m.replace(/^[^:]+: /, "").replace(/\(.*?\)|\d+%?/g, "").trim();
  byType[t] = (byType[t] || 0) + 1;
}
console.log(`\n${Object.keys(REG).length} banks, ${Object.values(REG).reduce((a, b) => a + b.length, 0)} questions`);
if (Object.keys(byType).length) {
  console.log("warning totals:");
  for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${t}`);
}
console.log(`${errors.length} errors, ${warns.length} warnings`);
process.exit(errors.length ? 1 : 0);
