#!/usr/bin/env node
/**
 * check-stripe-webhook-inline.mjs
 *
 * Proves the deployable stripe-webhook is REPRODUCIBLY GENERATED from its
 * canonical source, and that the generated artifact still honours the Stage-3
 * B2 entitlement contract.
 *
 * WHY THIS EXISTS
 * ───────────────
 * `supabase/functions/stripe-webhook/index.ts` is a generated single-file
 * bundle: `--use-api` uploads only the entrypoint, so the deployable file must
 * carry zero local relative imports. Before this guard the pipeline was
 * inoperable and the artifact was maintained by hand:
 *
 *   • the generator read and wrote the SAME file, so it re-inlined its own
 *     output (405,745 bytes vs 200,319, duplicate declarations, did not
 *     compile);
 *   • it pointed at `stripe-webhook/_shared`, deleted in c9c8fbc436, so it
 *     could not reach the canonical modules at all;
 *   • its generated header told maintainers to run a `.sh` script that has
 *     never existed in this repository.
 *
 * Hand-editing a generated artifact is how index.ts silently acquired three
 * unresolved relative imports (stripe-subscription-period, pro-checkout-
 * facility, sentry) — the exact failure the inlining exists to prevent. A
 * webhook that cannot be regenerated cannot be safely rolled out, because
 * nothing proves the deployed bytes correspond to any reviewed source.
 *
 * WHAT IT PROVES
 * ──────────────
 *   1. A canonical entrypoint exists and is NOT the generated artifact.
 *   2. The generator reads that entrypoint and the canonical _shared
 *      directory — not the artifact, not the deleted per-function dir.
 *   3. The committed artifact is byte-identical to the generator's output.
 *   4. The artifact has no local relative imports.
 *   5. No inlined module appears twice.
 *   6. The generated header names commands that actually exist.
 *   7. The B2-safe pro-benefits implementation survives regeneration, and no
 *      retired Pro→ranking / Pro→Featured mutation came back with it.
 *
 * Rule 3 is delegated to the generator itself (`--check`), so there is exactly
 * ONE implementation of the transform. A second copy here could drift from the
 * real one and certify a bundle nobody can rebuild.
 *
 * PYTHON IS REQUIRED, NEVER OPTIONAL
 * ──────────────────────────────────
 * If python3 is missing this guard FAILS. It does not skip. A check that
 * silently passes when its engine is absent is worse than no check: it reports
 * green for the one environment where it verified nothing.
 *
 * Usage:  node scripts/check-stripe-webhook-inline.mjs
 * Exit:   0 intact · 1 violation
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const exists = (rel) => existsSync(join(ROOT, rel));

const GENERATOR = "scripts/inline-stripe-webhook-shared.py";
const ENTRYPOINT = "supabase/functions/stripe-webhook/entrypoint.ts";
const ARTIFACT = "supabase/functions/stripe-webhook/index.ts";
const SHARED_DIR = "supabase/functions/_shared";

const violations = [];
const fail = (rule, detail = "") => violations.push({ rule, detail });

/** Strip JS/TS comments so prose describing a retired behaviour never trips a rule. */
const stripJs = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ── 1. Source and artifact must be distinct files ──────────────────────────
if (!exists(GENERATOR)) {
  fail(`the generator ${GENERATOR} is missing`);
} else if (!exists(ENTRYPOINT)) {
  fail(
    "there is no canonical stripe-webhook entrypoint",
    `${ENTRYPOINT} not found — without a pristine source the generated ` +
      `${ARTIFACT} would have to be its own input, which re-inlines already-` +
      `inlined modules and is not idempotent`,
  );
}

// ── 2. Generator configuration ─────────────────────────────────────────────
if (exists(GENERATOR)) {
  const gen = read(GENERATOR);
  const genCode = stripJs(gen.replace(/"""[\s\S]*?"""/g, "").replace(/#[^\n]*/g, ""));

  if (/^\s*ENTRY\s*=.*index\.ts/m.test(genCode)) {
    fail(
      "the generator reads the GENERATED artifact as its input",
      "index.ts is output, never input. Feeding it back in re-inlines every " +
        "shared module on top of the copies already there — duplicate " +
        "declarations, and the output does not compile.",
    );
  }
  if (/stripe-webhook["'\s,)]*[,)]?\s*["']_shared["']|stripe-webhook\/_shared/.test(genCode)) {
    fail(
      "the generator points at the per-function _shared directory",
      "supabase/functions/stripe-webhook/_shared was deleted in c9c8fbc436. " +
        `The canonical modules live in ${SHARED_DIR}.`,
    );
  }
  if (!genCode.includes(`"_shared"`)) {
    fail("the generator no longer resolves the canonical _shared directory");
  }
  if (!/--check/.test(genCode) || !/--write/.test(genCode)) {
    fail("the generator no longer exposes both --write and --check modes");
  }
}

// ── 3. Artifact matches generator output (delegated to the generator) ──────
if (exists(GENERATOR) && exists(ENTRYPOINT) && exists(ARTIFACT)) {
  const probe = spawnSync("python3", ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    fail(
      "python3 is unavailable, so the webhook cannot be verified as reproducible",
      "This guard fails rather than skips. A generated Stripe webhook that " +
        "cannot be regenerated in the build environment must not be certified " +
        "as deployable — nothing would prove the committed bytes match any " +
        "reviewed source.",
    );
  } else {
    const res = spawnSync("python3", [join(ROOT, GENERATOR), "--check"], {
      encoding: "utf8",
      cwd: ROOT,
    });
    if (res.status !== 0) {
      fail(
        "the committed webhook does not match the generator's output",
        (res.stderr || res.stdout || "").trim(),
      );
    }
  }
}

// ── 4-7. Properties of the committed artifact ──────────────────────────────
if (exists(ARTIFACT)) {
  const art = read(ARTIFACT);
  const artCode = stripJs(art);

  // 4. Zero local relative imports — the entire reason inlining exists.
  const localImports = [
    ...artCode.matchAll(/^import[\s\S]*?from\s*"(\.{1,2}\/[^"]+)";/gm),
  ].map((m) => m[1]);
  if (localImports.length > 0) {
    fail(
      "the generated webhook still has local relative imports",
      `${[...new Set(localImports)].join(", ")} — the --use-api bundler uploads ` +
        `only the entrypoint and cannot resolve these, so the deploy ships a ` +
        `module the runtime will fail to load.`,
    );
  }

  // 5. No module inlined twice.
  const markers = [...art.matchAll(/^\/\/ ── inlined from (\S+)/gm)].map((m) => m[1]);
  const dupes = markers.filter((m, i) => markers.indexOf(m) !== i);
  if (dupes.length > 0) {
    fail(
      "the generated webhook inlines the same module more than once",
      `${[...new Set(dupes)].join(", ")} — the signature of the generator ` +
        `consuming its own output.`,
    );
  }

  // 6. The header must name commands that exist.
  if (/inline-stripe-webhook-shared\.sh/.test(art)) {
    fail(
      "the generated header points at a nonexistent .sh generator",
      "The repository's generator is inline-stripe-webhook-shared.py. A " +
        "maintainer following the header cannot regenerate the file.",
    );
  }
  if (!/inline-stripe-webhook-shared\.py/.test(art)) {
    fail("the generated header no longer names the real generator command");
  }

  // 7. B2 contract survives regeneration.
  //
  // Pro buys product features. It must not write trust, Featured inventory, or
  // organic ranking. These ran on the Pro activation/cancellation path AND in a
  // second hand-written copy on the past_due→active recovery path, which is
  // precisely why the check is against the FINAL GENERATED bytes: a shared-
  // module fix does not prove the deployable artifact carries it.
  if (!/activateProBenefits/.test(artCode) || !/deactivateProBenefits/.test(artCode)) {
    fail(
      "the generated webhook no longer inlines the pro-benefits implementation",
      "Pro activation would silently become a no-op.",
    );
  }
  const rankingMutation =
    /calculated_ranking_score[\s\S]{0,120}?[+-]\s*50|[+-]\s*50[\s\S]{0,60}?calculated_ranking_score/;
  if (rankingMutation.test(artCode)) {
    fail(
      "the generated webhook mutates calculated_ranking_score by ±50 on a payment event",
      "Organic ranking is not purchasable. The retired pro_boost was larger " +
        "than every other ranking weight combined.",
    );
  }
  // `facilities.featured` (the catalog trust/placement flag) — NOT
  // `has_featured`, which is the legitimate Featured add-on subscription column.
  if (/(?<!has_)\bfeatured\s*:\s*(?:true|false)\b/.test(artCode)) {
    fail(
      "the generated webhook writes facilities.featured from a payment event",
      "Pro is not Featured. Activation must not grant placement, and " +
        "cancellation must not strip an independently held Featured entitlement.",
    );
  }
  if (/\bverified\s*:\s*true\b/.test(artCode)) {
    fail(
      "the generated webhook writes facilities.verified from a payment event",
      "Verification is a listing-level trust status and is never purchasable.",
    );
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
if (violations.length > 0) {
  console.error("\n✖ stripe-webhook generation contract violated\n");
  for (const v of violations) {
    console.error(`  • ${v.rule}${v.detail ? `\n      ${v.detail}` : ""}`);
  }
  console.error(
    "\n  The deployable webhook must be reproducible from reviewed source:\n" +
      `      python3 ${GENERATOR} --write\n`,
  );
  process.exit(1);
}

console.log("✓ stripe-webhook generation contract intact");
console.log("  • canonical entrypoint is the generator's input; index.ts is output only");
console.log("  • committed artifact is byte-identical to generator output");
console.log("  • zero local relative imports; no module inlined twice");
console.log("  • header names the real regeneration command");
console.log("  • no Pro→ranking, Pro→Featured or Pro→verified mutation survives");
