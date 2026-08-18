#!/usr/bin/env node
/**
 * patch-commercial-truth-copy.mjs
 *
 * Applies scripts/_commercial-truth-copy.mjs to every surface that can put a
 * false RehabLookup product claim in front of Google:
 *
 *   1. public/ **.html   — the ~46.7k prerendered pages Vercel serves directly
 *                          (vercel.json sets cleanUrls:true, and a static file
 *                          wins over the SPA rewrite, so these files ARE the
 *                          indexable pages, not a build artifact)
 *   2. scripts/generate-*.mjs, scripts/fix-*.mjs
 *                        — the generators that emit (1); patching only (1)
 *                          means the next regeneration reinstates the claim
 *   3. src/ **           — the React source behind the client-rendered routes
 *
 * Run with --apply to write; default is a dry run that reports counts only.
 *
 *   node scripts/patch-commercial-truth-copy.mjs           # dry run
 *   node scripts/patch-commercial-truth-copy.mjs --apply   # write
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { REWRITES } from "./_commercial-truth-copy.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

const TARGETS = [
  { dir: "public", exts: [".html"] },
  { dir: "scripts", exts: [".mjs", ".ts"], filter: (n) => /^(generate|fix)-/.test(n) },
  { dir: "src", exts: [".ts", ".tsx"] },
];

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "__tests__", "__fixtures__"]);

function* walk(abs, rel) {
  let entries;
  try {
    entries = readdirSync(abs);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const childAbs = join(abs, entry);
    const childRel = join(rel, entry);
    let st;
    try {
      st = statSync(childAbs);
    } catch {
      continue;
    }
    if (st.isDirectory()) yield* walk(childAbs, childRel);
    else yield { abs: childAbs, rel: childRel, name: entry };
  }
}

function main() {
  const perRule = new Map(REWRITES.map(([, , note], i) => [i, { note, hits: 0, files: 0 }]));
  let filesScanned = 0;
  let filesChanged = 0;
  const changedByDir = new Map();

  for (const target of TARGETS) {
    for (const file of walk(join(ROOT, target.dir), target.dir)) {
      if (!target.exts.includes(extname(file.name))) continue;
      if (target.filter && !target.filter(file.name)) continue;
      filesScanned += 1;

      const before = readFileSync(file.abs, "utf8");
      let text = before;
      const touchedRules = new Set();

      REWRITES.forEach(([re, replacement], i) => {
        const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
        const matches = text.match(rx);
        if (!matches) return;
        perRule.get(i).hits += matches.length;
        touchedRules.add(i);
        text = text.replace(rx, replacement);
      });

      if (text === before) continue;
      for (const i of touchedRules) perRule.get(i).files += 1;
      filesChanged += 1;
      changedByDir.set(target.dir, (changedByDir.get(target.dir) ?? 0) + 1);
      if (APPLY) writeFileSync(file.abs, text);
    }
  }

  console.log(`\n${APPLY ? "APPLIED" : "DRY RUN"} — commercial-truth copy rewrite\n`);
  console.log(`  files scanned : ${filesScanned}`);
  console.log(`  files changed : ${filesChanged}`);
  for (const [dir, n] of [...changedByDir].sort()) console.log(`      ${dir}/ : ${n}`);
  console.log("\n  rule hits:");
  const rows = [...perRule.values()].filter((r) => r.hits > 0).sort((a, b) => b.hits - a.hits);
  for (const r of rows) console.log(`    ${String(r.hits).padStart(7)}  in ${String(r.files).padStart(6)} file(s)  ${r.note}`);
  const dead = [...perRule.values()].filter((r) => r.hits === 0);
  if (dead.length) {
    console.log(`\n  ${dead.length} rule(s) matched nothing (already clean or superseded).`);
  }
  if (!APPLY) console.log("\n  re-run with --apply to write these changes.\n");
  else console.log("");
}

main();
