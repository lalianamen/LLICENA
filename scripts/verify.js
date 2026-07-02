#!/usr/bin/env node
// One-shot repo checks: bank invariants + `node --check` on every non-vendor JS file.
// Run: node scripts/verify.js
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let failed = false;

const banks = spawnSync(process.execPath, [path.join(__dirname, "check-banks.js")], { stdio: "inherit" });
if (banks.status !== 0) failed = true;

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "vendor" || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js")) files.push(p);
  }
})(path.join(root, "js"));
for (const f of fs.readdirSync(root)) if (f.endsWith(".js")) files.push(path.join(root, f));

for (const f of files) {
  const r = spawnSync(process.execPath, ["--check", f]);
  if (r.status !== 0) {
    failed = true;
    console.error(String(r.stderr));
  }
}
console.log(`node --check: ${files.length} files OK${failed ? " (see failures above)" : ""}`);
process.exit(failed ? 1 : 0);
