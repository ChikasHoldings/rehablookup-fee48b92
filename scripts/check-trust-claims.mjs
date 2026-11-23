#!/usr/bin/env node
/**
 * check-trust-claims.mjs — blocking guard for healthcare trust claims
 * (SEO recovery Phase 1, 2026-11-23).
 *
 * Fails the build when any surface Google or a visitor can read reintroduces a
 * claim RehabLookup cannot substantiate:
 *
 *   1. Prerendered HTML (public/**.html), public/llms.txt and index.html —
 *      banned phrases: the retired insurance-verification tool and concierge,
 *      "verified/accredited directory" wording, a medical advisory board,
 *      consumer-account prompts, and the SAMHSA importer's unattributed
 *      "is a licensed … provider" sentence.
 *   2. Every /center/* JSON-LD facility node — the record-independent rules of
 *      src/lib/seo/facilityTruth.mjs (no fabricated hours, specialty, price,
 *      slogan, credentials, offers, ReserveAction, or editorial review).
 *   3. Generator and React sources — the same phrases as string literals, so a
 *      regeneration cannot quietly bring them back.
 *
 * Usage: node scripts/check-trust-claims.mjs [--root=<dir>]
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findFacilitySchemaViolations } from "../src/lib/seo/facilityTruth.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootArg = process.argv.find((a) => a.startsWith("--root="));
const ROOT = rootArg ? path.resolve(rootArg.slice(7)) : path.resolve(here, "..");

/** [regex, why] — matched case-insensitively against visible text and literals. */
export const BANNED = [
  [/free insurance verification tool/i, "retired insurance-verification tool"],
  [/use our free insurance verification/i, "retired insurance-verification tool"],
  [/Medical Advisory Board/i, "no medical advisory board exists"],
  [/Free Concierge Placement|Hand-matched placement|concierge placement/i, "retired concierge / placement service", { publicOnly: true }],
  [/Create a free account/i, "consumer accounts were retired"],
  [/Sign in to leave a review/i, "consumer accounts were retired"],
  [/verified,\s+accredited (?:addiction|treatment|facilit|centers|rehab)/i, "listings are not independently verified"],
  [/\bExpert-verified\b/i, "listings are not expert-verified"],
  // Case-sensitive on purpose: "Find/Compare accredited …" headings and
  // directory sentences are claims about the listings; lowercase advice such as
  // "look for an accredited program" is legitimate guidance.
  [/\b(?:Compare|Find) [Aa]ccredited\b/, "listings described as accredited"],
  [/(?:helps patients|directory to|RehabLookup helps you) (?:find|compare) accredited\b/i, "listings described as accredited"],
  [/[0-9,]+\+ verified (?:treatment )?facilit/i, "inflated verified-facility count"],
  [/All listed facilities go through a verification process/i, "no listing verification process exists"],
  [/Each accreditation is independently reviewed by our team/i, "accreditations are not independently reviewed"],
  [/The clinical team tailors the mix/i, "fabricated facility capability"],
  [/is a licensed addiction treatment provider in /i, "unattributed importer claim (use presentListingDescription)"],
  [/40-60% of people (?:maintaining|maintain|who complete)/i, "NIDA's 40–60% is a relapse rate, not a recovery rate"],
];

// Files allowed to contain the banned phrases (they define or test them).
const SOURCE_ALLOW = [
  "scripts/_commercial-truth-copy.mjs",
  "scripts/check-trust-claims.mjs",
  "scripts/patch-commercial-truth-copy.mjs",
  "src/lib/seo/facilityTruth.mjs",
];
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "__tests__", "__fixtures__", ".tmp"]);

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const failures = [];
const add = (file, why, sample) => failures.push({ file: rel(file), why, sample });

function visibleText(html) {
  return html
    .replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/&amp;/g, "&");
}

// 1 + 2. Public surfaces
let htmlFiles = 0;
let facilityNodes = 0;
const publicDir = path.join(ROOT, "public");
const publicTargets = [...walk(publicDir)].filter((f) => f.endsWith(".html"));
for (const extra of [path.join(publicDir, "llms.txt"), path.join(ROOT, "index.html")]) {
  if (existsSync(extra)) publicTargets.push(extra);
}
for (const file of publicTargets) {
  htmlFiles++;
  const raw = readFileSync(file, "utf8");
  const text = visibleText(raw);
  for (const [rx, why] of BANNED) {
    const m = rx.exec(text);
    if (m) add(file, why, m[0]);
  }
  if (/[\\/]center[\\/][^\\/]+\.html$/.test(file)) {
    for (const block of raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      let node;
      try {
        node = JSON.parse(block[1]);
      } catch {
        add(file, "invalid JSON-LD", block[1].slice(0, 60));
        continue;
      }
      for (const n of [].concat(node["@graph"] ?? node)) {
        // Record-independent mode: admissions status can only be checked
        // against the database (covered by unit tests), so it is passed through.
        const facts = { acceptingAdmissions: typeof n.isAcceptingNewPatients === "boolean" ? n.isAcceptingNewPatients : undefined };
        const v = findFacilitySchemaViolations(n, facts);
        if ([].concat(n["@type"] ?? []).includes("LocalBusiness")) facilityNodes++;
        for (const why of v) add(file, `facility schema: ${why}`, "");
      }
    }
  }
}

// 3. Sources
const sourceTargets = [
  ...[...walk(path.join(ROOT, "src"))].filter((f) => /\.(tsx?|mjs|js)$/.test(f)),
  ...[...walk(path.join(ROOT, "scripts"))].filter((f) => /\.(mjs|js|ts)$/.test(f)),
].filter((f) => !SOURCE_ALLOW.includes(rel(f)));
// Comments may describe retired features (and internal admin tools still name
// them); only code and copy count.
const stripComments = (src) =>
  src
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join("\n");
for (const file of sourceTargets) {
  const raw = stripComments(readFileSync(file, "utf8"));
  for (const [rx, why, opts] of BANNED) {
    if (opts?.publicOnly) continue;
    const m = rx.exec(raw);
    if (m) add(file, why, m[0]);
  }
  if (/opens:\s*"00:00"[\s\S]{0,40}closes:\s*"23:59"/.test(raw)) add(file, "hard-coded 24/7 opening hours", "00:00–23:59");
  if (/medicalSpecialty:\s*\[[^\]]*"Psychiatry"/.test(raw)) add(file, "hard-coded Psychiatry specialty", "medicalSpecialty");
  if (/name:\s*"LegitScript Verified"/.test(raw)) add(file, "undocumented LegitScript credential", "LegitScript Verified");
}

const byWhy = new Map();
for (const f of failures) byWhy.set(f.why, (byWhy.get(f.why) ?? 0) + 1);
console.log(`check-trust-claims: ${htmlFiles} public files, ${facilityNodes} facility schema nodes, ${sourceTargets.length} source files scanned`);
if (failures.length) {
  for (const [why, n] of byWhy) console.error(`  ✗ ${why}: ${n}`);
  for (const f of failures.slice(0, 25)) console.error(`    ${f.file}${f.sample ? `  «${f.sample}»` : ""}  — ${f.why}`);
  if (failures.length > 25) console.error(`    … ${failures.length - 25} more`);
  process.exit(1);
}
console.log("  ✓ no unsupported trust claims found");
