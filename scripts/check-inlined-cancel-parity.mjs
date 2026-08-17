#!/usr/bin/env node
// ============================================================================
// check:inlined-cancel-parity
//
// WHY THIS EXISTS
// ───────────────
// Cancellation is implemented once, in
// supabase/functions/_shared/cancel-subscription.ts, and then INLINED into
// deployable Edge functions because Deno Edge bundles cannot resolve a shared
// relative import at deploy time:
//
//   • supabase/functions/provider-self-cancel-subscription/index.ts
//   • supabase/functions/admin-cancel-subscription/index.ts
//
// (The stripe-webhook copy is generated and already byte-guarded by
// check:stripe-webhook-inline, so it is deliberately not re-checked here.)
//
// scripts/inline-shared.py refuses to regenerate these two, so the copies have
// been kept in step BY HAND. A hand-synchronised money path is exactly the kind
// of thing that silently drifts: a fix landed in the shared file — say the
// Featured-only re-route that stops scope='all' from refunding a Pro
// subscription that does not exist — can be live in one cancellation entry
// point and missing from the other, and nothing fails. A comment saying "keep
// these in sync" is not a control.
//
// WHAT IT CHECKS
// ──────────────
//  1. PARITY. The inlined region of each copy must equal the canonical module
//     exactly, after removing only the import statements the inliner strips.
//     Byte-equality, not a similarity heuristic.
//  2. BEHAVIOUR. Rules that must hold in the canonical source itself, so that
//     parity can never mean "identically wrong":
//       • a non-Pro row must re-route scope='all' to the Featured path
//       • the Featured-only re-route must be gated on tier, not on a nullable
//         Stripe id
//       • cancelling Featured must not touch Pro tier/status/Stripe id
//       • only Featured state may be cleared by the Featured scope
//
// Exit 0 = every copy agrees with the canonical module and the canonical module
// still encodes the Featured-independence contract.
// ============================================================================

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const exists = (rel) => existsSync(join(ROOT, rel));

const CANONICAL = "supabase/functions/_shared/cancel-subscription.ts";
const COPIES = [
  "supabase/functions/provider-self-cancel-subscription/index.ts",
  "supabase/functions/admin-cancel-subscription/index.ts",
];

const START_MARKER = "── inlined from _shared/cancel-subscription.ts";
const END_MARKER = "entrypoint body";

const violations = [];
const fail = (rule, detail = "") => violations.push({ rule, detail });

/** Drop import statements (single- and multi-line). The inliner removes these
 *  and nothing else, so this is the whole normalisation. */
function stripImports(src) {
  const out = [];
  let inImport = false;
  for (const line of src.split("\n")) {
    if (!inImport && /^import\b/.test(line)) {
      if (/;\s*$/.test(line)) continue; // single-line import
      inImport = true;
      continue;
    }
    if (inImport) {
      if (/^\}\s*from\s+.*;\s*$/.test(line)) inImport = false;
      continue;
    }
    out.push(line);
  }
  return out;
}

/** The inlined region of a copy: everything between the two markers, with the
 *  marker line itself dropped and trailing blank lines trimmed. */
function inlinedRegion(src) {
  const lines = src.split("\n");
  let start = -1;
  let end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (start === -1 && lines[i].includes(START_MARKER)) start = i + 1;
    else if (start !== -1 && lines[i].includes(END_MARKER)) { end = i; break; }
  }
  if (start === -1) return null;
  const region = lines.slice(start, end === -1 ? lines.length : end);
  while (region.length && region[region.length - 1].trim() === "") region.pop();
  return region;
}

// ── 1. PARITY ───────────────────────────────────────────────────────────────
if (!exists(CANONICAL)) {
  fail("the canonical cancellation module is missing", CANONICAL);
} else {
  const canonical = stripImports(read(CANONICAL));
  while (canonical.length && canonical[canonical.length - 1].trim() === "") canonical.pop();

  for (const copy of COPIES) {
    if (!exists(copy)) {
      fail("an inlined cancellation copy is missing", copy);
      continue;
    }
    const region = inlinedRegion(read(copy));
    if (region === null) {
      fail(
        `no "${START_MARKER}" marker — the parity guard cannot locate the ` +
          `inlined region, so drift here would be invisible`,
        copy,
      );
      continue;
    }
    // Compare every non-blank line exactly. Blank lines are excluded because
    // the inliner also drops the blank that separated the header from the
    // import block it removed — a purely cosmetic offset that would otherwise
    // fail this guard forever. Every line of code and every comment is still
    // compared byte-for-byte.
    const canonSig = canonical.filter((l) => l.trim() !== "");
    const copySig = region.filter((l) => l.trim() !== "");

    if (copySig.length !== canonSig.length) {
      fail(
        `inlined cancellation drifted from ${CANONICAL} ` +
          `(${copySig.length} significant lines inlined vs ${canonSig.length} canonical)`,
        copy,
      );
      continue;
    }
    for (let i = 0; i < canonSig.length; i++) {
      if (copySig[i] !== canonSig[i]) {
        fail(
          `inlined cancellation drifted from ${CANONICAL} at significant line ${i + 1}\n` +
            `      canonical: ${canonSig[i].trim().slice(0, 100)}\n` +
            `      inlined:   ${copySig[i].trim().slice(0, 100)}`,
          copy,
        );
        break;
      }
    }
  }
}

// ── 2. BEHAVIOUR OF THE CANONICAL MODULE ────────────────────────────────────
// Parity alone would happily lock in a regression, so the contract itself is
// asserted here. Matching runs on comment-stripped source: the module documents
// the behaviour it replaced, and prose must not satisfy a rule.
if (exists(CANONICAL)) {
  const src = read(CANONICAL)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  // A Featured-only row has no Pro to cancel: scope='all' must become the
  // Featured path.
  if (!/effectiveScope[\s\S]{0,200}?scope\s*===\s*"all"\s*&&\s*!isProRow\s*\?\s*"addon-featured"/.test(src)) {
    fail(
      "scope='all' on a non-Pro row no longer re-routes to 'addon-featured' — a " +
        "Featured-only cancellation would refund a Pro subscription that does not exist",
      CANONICAL,
    );
  }

  // That re-route must be decided by tier, never by a nullable Stripe id.
  if (!/const\s+isProRow\s*=\s*subscription\.tier\s*===\s*"pro"/.test(src)) {
    fail(
      "the Featured-only re-route is not gated on `subscription.tier === \"pro\"` — " +
        "inferring Pro from a nullable Stripe id is the fragility this guard exists to stop",
      CANONICAL,
    );
  }

  // Cancelling Featured must leave Pro completely alone.
  const featuredBranch =
    src.match(/else if \(effectiveScope === "addon-featured"\)\s*\{[\s\S]*?\n  \} else if/) ??
    src.match(/else if \(effectiveScope === "addon-featured"\)\s*\{[\s\S]*$/);
  if (!featuredBranch) {
    fail("the 'addon-featured' cancellation branch is gone", CANONICAL);
  } else {
    const branch = featuredBranch[0];

    // Only the DATABASE WRITES matter here. `tier: "featured"` appears in the
    // refundOnePiece() argument object as a pricing-table key, which is not a
    // column write — scoping to `.update({...})` payloads keeps the rule about
    // what actually reaches facility_subscriptions.
    const updatePayloads = [...branch.matchAll(/\.update\(\s*\{([\s\S]*?)\}\s*\)/g)].map((m) => m[1]);
    const forbidden = [
      [/\btier\s*:/, "writes tier"],
      [/\bstatus\s*:/, "writes status"],
      [/\bstripe_subscription_id\s*:/, "writes the Pro stripe_subscription_id"],
      [/\bcurrent_period_end\s*:/, "writes the Pro period"],
      [/\bcanceled_at\s*:/, "writes canceled_at"],
    ];
    for (const payload of updatePayloads) {
      for (const [re, what] of forbidden) {
        if (re.test(payload)) {
          fail(
            `cancelling Featured ${what} on facility_subscriptions — Featured ` +
              `cancellation must leave the Pro subscription untouched`,
            CANONICAL,
          );
        }
      }
    }
    if (!updatePayloads.some((p) => /has_featured:\s*false/.test(p))) {
      fail("the 'addon-featured' branch no longer clears has_featured", CANONICAL);
    }
  }

  // The full-cancel branch must still clear Featured state (it cancels the
  // add-ons too) — otherwise a cancelled facility keeps rendering paid ads.
  const allBranch = src.match(/if \(effectiveScope === "all"\)\s*\{[\s\S]*?\n  \} else if/);
  if (!allBranch) {
    fail("the scope='all' cancellation branch is gone", CANONICAL);
  } else if (!/has_featured:\s*false/.test(allBranch[0])) {
    fail(
      "scope='all' no longer clears has_featured — a fully cancelled facility would " +
        "keep rendering paid Featured placements",
      CANONICAL,
    );
  }
}

// ── report ──────────────────────────────────────────────────────────────────
if (violations.length > 0) {
  console.error("✗ inlined cancellation parity FAILED\n");
  for (const v of violations) {
    console.error(`  • ${v.rule}`);
    if (v.detail) console.error(`    ${v.detail}`);
    console.error("");
  }
  console.error(
    "  Fix: re-inline the canonical module into the copy (the inlined region is\n" +
      "  everything between the \"inlined from _shared/cancel-subscription.ts\" marker\n" +
      "  and the entrypoint-body marker), or restore the contract in the canonical file.",
  );
  process.exit(1);
}

console.log("✓ inlined cancellation parity intact");
console.log(`  • ${COPIES.length} inlined copies byte-match ${CANONICAL}`);
console.log("  • a non-Pro row routes scope='all' to the Featured path, gated on tier");
console.log("  • cancelling Featured writes no Pro tier / status / Stripe id");
console.log("  • scope='all' still clears Featured so a cancelled facility stops rendering ads");
