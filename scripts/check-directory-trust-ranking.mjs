#!/usr/bin/env node
/**
 * check-directory-trust-ranking.mjs
 *
 * Build-time guard for the DIRECTORY ENTITLEMENT contract (Stage-3 B1 + B2):
 *
 *   A provider may pay for Pro PRODUCT FEATURES ($99/mo — public phone + Call
 *   CTA, enhanced-profile media, analytics) and for clearly labeled FEATURED
 *   VISIBILITY.
 *
 *   A provider may NEVER pay for:
 *     • verification / trust
 *     • organic search ranking
 *     • inquiry eligibility, inquiry value, or matching
 *
 * WHY A SEPARATE CHECK
 * ────────────────────
 * `check:pro-phone-visibility` proves the POSITIVE half of the phone
 * contract — that phone IS gated on has_active_pro. It is satisfied by a view
 * that gates everything on has_active_pro, including trust. This guard proves
 * the NEGATIVE half: which signals must NOT be purchasable. The two are
 * complementary and the phone check is deliberately not weakened here.
 *
 * The failures this exists to prevent all shipped at once, and each one read
 * as reasonable in isolation:
 *   • public_facilities masked `verified` behind has_active_pro, so 5 verified
 *     facilities were published to the directory as 0 verified because nobody
 *     held Pro.
 *   • ranking added a flat +50 `pro_boost` — larger than every other weight
 *     combined — and the boost also lived in a stored platform_settings row,
 *     so deleting it from the code default alone would have changed nothing.
 *   • pro-benefits wrote facilities.featured and ±50 to
 *     calculated_ranking_score on every Pro activation / cancellation, and the
 *     stripe-webhook had a SECOND inlined copy of the same mutation on the
 *     past_due-recovery path.
 *   • the frontend ranked paid tiers ahead of the user's chosen sort, so
 *     "Name A–Z" was not alphabetical.
 *
 * WHAT IT IS NOT
 * ──────────────
 * It is NOT a repo-wide ban on the words Pro, Featured, verified or ranking.
 * Those are legitimate almost everywhere: Pro genuinely gates phone and media,
 * Featured is a real product with its own rail, verification is a real
 * pipeline. The rules below are MECHANISM-shaped — they target specific
 * expressions (an entitlement predicate around a trust column; a subscription
 * lookup inside a rank computation; a payment flag assigned to a Featured
 * field) and are scanned against comment-stripped source so that documenting
 * a retired behaviour never trips the guard that retired it.
 *
 * It judges FINAL SOURCE STATE, not migration history. Historical migrations
 * legitimately contain the expressions this contract retires.
 *
 * Usage
 *   node scripts/check-directory-trust-ranking.mjs
 *
 * Exit codes
 *   0  contract intact
 *   1  at least one violation
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const exists = (rel) => existsSync(join(ROOT, rel));

/** Strip JS/TS comments so prose describing a retired behaviour never trips a rule. */
const stripJs = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
/** Strip SQL comments for the same reason. */
const stripSql = (sql) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");

const violations = [];
const fail = (layer, rule, detail = "") => violations.push({ layer, rule, detail });

// ═══════════════════════════════════════════════════════════════════════════
// 1. DATABASE — the public projection
// ═══════════════════════════════════════════════════════════════════════════
function checkDatabase() {
  const dir = join(ROOT, "supabase", "migrations");
  if (!existsSync(dir)) {
    return fail("database", "supabase/migrations not found");
  }

  const migrations = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: stripSql(readFileSync(join(dir, name), "utf8")) }));

  // The LATEST definition is the live contract.
  const viewMig = [...migrations]
    .reverse()
    .find((m) => /CREATE OR REPLACE VIEW public\.public_facilities/i.test(m.sql));

  if (!viewMig) {
    return fail("database", "no migration defines public.public_facilities");
  }

  // Isolate the view body: from the CREATE to the statement terminator, so a
  // later unrelated statement in the same file can't satisfy or trip a rule.
  const start = viewMig.sql.search(/CREATE OR REPLACE VIEW public\.public_facilities/i);
  const body = viewMig.sql.slice(start).split(/;\s*$/m)[0];

  // ── B1: verified must NOT be an entitlement ──────────────────────────────
  // Any CASE that yields `verified` off a has_active_pro / subscription /
  // plan / tier predicate is a trust signal sold as a product.
  const verifiedGate =
    /CASE\s+WHEN\s+[^\n]*\b(has_active_pro|is_pro|is_premium_visible|facility_subscriptions|tier\s*=|plan\s*=)[^\n]*THEN\s+f?\.?verified\b/i;
  const verifiedElseFalse = /THEN\s+f?\.?verified\s+ELSE\s+(false|NULL)/i;
  if (verifiedGate.test(body) || verifiedElseFalse.test(body)) {
    fail(
      "database",
      "public_facilities.verified is gated on an entitlement — verification is a factual " +
        "directory state and must be published independently of plan",
      `latest definition: ${viewMig.name}`,
    );
  }
  // It must still be projected at all.
  if (!/\bverified\b/i.test(body)) {
    fail("database", "public_facilities no longer projects `verified`", viewMig.name);
  }

  // ── B1: phone must STILL be Pro-gated ────────────────────────────────────
  // Removing the trust mask must not take the paid-contact-feature mask with
  // it. This mirrors check:pro-phone-visibility rather than replacing it.
  if (!/CASE\s+WHEN\s+has_active_pro\(id\)\s+THEN\s+phone\s+ELSE\s+NULL/i.test(body)) {
    fail(
      "database",
      "public_facilities.phone is no longer gated by has_active_pro(id) — phone is a PAID contact feature",
      viewMig.name,
    );
  }

  // ── Featured must never appear in an entitlement predicate ───────────────
  if (/CASE\s+WHEN\s+[^\n]*\bfeatured\b[^\n]*THEN\s+(phone|verified)/i.test(body)) {
    fail(
      "database",
      "Featured is used to unlock phone or verified — Featured is paid VISIBILITY only",
      viewMig.name,
    );
  }

  // ── Claimant visibility (PR #78 resume path) must survive ────────────────
  if (!/facility_claim_requests/i.test(body)) {
    fail(
      "database",
      "public_facilities lost its claim-state predicate — pending-claim hiding and claimant resume are both broken",
      viewMig.name,
    );
  }
  if (!/claimant_user_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)/i.test(body)) {
    fail(
      "database",
      "the claimant self-visibility exception is gone — a claimant can no longer load their own facility to resume the wizard",
      viewMig.name,
    );
  }

  // ── is_claimed must keep the canonical 20260830000100 semantics ──────────
  if (!/user_id\s+IS\s+NOT\s+NULL\s+AS\s+is_claimed/i.test(body)) {
    fail("database", "is_claimed is no longer `user_id IS NOT NULL`", viewMig.name);
  }

  // ── The newest migration must not reopen the raw table to anon ───────────
  // Stage-2 closed public.facilities to anonymous callers entirely. Any
  // migration ordered after that closure that hands it back is a regression,
  // whichever file it lives in.
  // The CURRENT closure is the LAST one. anon access to the raw table was
  // revoked, re-granted and revoked again several times across 2026; only the
  // most recent revoke describes today's boundary, and only migrations
  // ordered after it can regress it.
  const lastIndexWhere = (pred) => {
    for (let i = migrations.length - 1; i >= 0; i--) if (pred(migrations[i])) return i;
    return -1;
  };
  const closureIdx = lastIndexWhere((m) =>
    /REVOKE SELECT ON public\.facilities FROM anon/i.test(m.sql),
  );
  if (closureIdx === -1) {
    fail("database", "the Stage-2 anon closure on public.facilities is missing entirely");
  } else {
    for (const m of migrations.slice(closureIdx + 1)) {
      if (/GRANT\s+SELECT\s*(\([^)]*\))?\s*ON\s+public\.facilities\s+TO\s+[^;]*\banon\b/i.test(m.sql)) {
        fail("database", "a later migration re-grants anon SELECT on raw public.facilities", m.name);
      }
      for (const policy of m.sql.matchAll(
        /CREATE POLICY\s+"?([\w-]+)"?\s+ON\s+public\.facilities\b([\s\S]*?);/gi,
      )) {
        const [stmt, policyName] = policy;
        const grantedTo = stmt.match(/\bTO\s+(anon|public)\b/i);
        const isSelect =
          /\bFOR\s+SELECT\b/i.test(stmt) || !/\bFOR\s+(INSERT|UPDATE|DELETE|ALL)\b/i.test(stmt);
        if (grantedTo && isSelect) {
          fail(
            "database",
            `policy ${policyName} re-opens raw facilities SELECT to \`${grantedTo[1]}\``,
            m.name,
          );
        }
      }
    }
  }

  // ── The dropped public RPC must stay dropped ─────────────────────────────
  // get_public_facility_data(uuid) predates and bypasses the view's masks. It
  // was deliberately dropped by 20260829004500 and is not a B1 fallback.
  const dropIdx = lastIndexWhere((m) =>
    /DROP FUNCTION IF EXISTS public\.get_public_facility_data/i.test(m.sql),
  );
  if (dropIdx === -1) {
    fail("database", "get_public_facility_data was never dropped");
  } else {
    for (const m of migrations.slice(dropIdx + 1)) {
      if (/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.get_public_facility_data/i.test(m.sql)) {
        fail(
          "database",
          "get_public_facility_data is recreated — it bypasses the public_facilities masks",
          m.name,
        );
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. RANKING — organic score has no payment input
// ═══════════════════════════════════════════════════════════════════════════
function checkRanking() {
  const rankFile = "supabase/functions/calculate-ranking-scores/index.ts";
  if (!exists(rankFile)) {
    fail("ranking", `${rankFile} not found`);
  } else {
    const src = stripJs(read(rankFile));

    if (/\bpro_boost\b/.test(src)) {
      fail("ranking", "calculate-ranking-scores still references pro_boost", rankFile);
    }
    if (/facility_subscriptions/.test(src)) {
      fail(
        "ranking",
        "calculate-ranking-scores queries facility_subscriptions — organic rank must not read subscription state",
        rankFile,
      );
    }
    if (/\bisPro\b|\bproFacilityIds\b|has_active_pro/.test(src)) {
      fail("ranking", "calculate-ranking-scores still derives a Pro flag for scoring", rankFile);
    }
    // The stale platform_settings row still carries pro_boost, so a blanket
    // spread of the stored value would silently reintroduce it. The scorer
    // must copy an explicit allow-list instead.
    if (/\.\.\.\s*settingsData\.setting_value|\.\.\.\s*\(?\s*settingsData\?\.\s*setting_value/.test(src)) {
      fail(
        "ranking",
        "ranking weights are spread wholesale from platform_settings — a stored pro_boost would " +
          "re-enter the model. Copy an explicit allow-list of neutral keys instead.",
        rankFile,
      );
    }
    if (!/NEUTRAL_WEIGHT_KEYS/.test(src)) {
      fail("ranking", "the neutral weight allow-list is gone from calculate-ranking-scores", rankFile);
    }
  }

  // A forward migration must strip the stored pro_boost key.
  const migDir = join(ROOT, "supabase", "migrations");
  if (existsSync(migDir)) {
    const strips = readdirSync(migDir)
      .filter((f) => f.endsWith(".sql"))
      .some((f) => {
        const sql = stripSql(readFileSync(join(migDir, f), "utf8"));
        return /platform_settings/i.test(sql) && /-\s*'pro_boost'/i.test(sql);
      });
    if (!strips) {
      fail(
        "ranking",
        "no migration removes the stored `pro_boost` key from platform_settings.ranking_weights",
      );
    }
  }

  // ── Pro activation must not write trust / ranking / Featured ─────────────
  const proBenefits = "supabase/functions/_shared/pro-benefits.ts";
  if (!exists(proBenefits)) {
    fail("ranking", `${proBenefits} not found`);
  } else {
    const src = stripJs(read(proBenefits));
    if (/calculated_ranking_score/.test(src)) {
      fail("ranking", "pro-benefits writes calculated_ranking_score — Pro must not buy organic rank", proBenefits);
    }
    if (/\bfeatured\s*:/.test(src)) {
      fail("ranking", "pro-benefits writes facilities.featured — Pro is not Featured", proBenefits);
    }
    if (/\bverified\s*:/.test(src)) {
      fail("ranking", "pro-benefits writes facilities.verified — Pro does not buy trust", proBenefits);
    }
    // Pro activation must still do its legitimate work.
    if (!/plan:\s*["']pro["']/.test(src)) {
      fail("ranking", "pro-benefits no longer mirrors profiles.plan='pro' — Pro activation is a no-op", proBenefits);
    }
    if (!/plan:\s*["']free["']/.test(src)) {
      fail("ranking", "pro-benefits no longer mirrors profiles.plan='free' on deactivation", proBenefits);
    }
  }

  // ── The GENERATED webhook must carry the same retirement ─────────────────
  // stripe-webhook/index.ts inlines the shared modules, and additionally had
  // its own hand-written copy of the mutation on the past_due-recovery path.
  // Both must be clean, or the deployable artifact keeps the retired behaviour
  // no matter how clean the canonical source looks.
  const webhook = "supabase/functions/stripe-webhook/index.ts";
  if (!exists(webhook)) {
    fail("ranking", `${webhook} not found`);
  } else {
    const src = stripJs(read(webhook));
    for (const m of src.matchAll(/calculated_ranking_score\s*:/g)) {
      fail(
        "ranking",
        "generated stripe-webhook still writes calculated_ranking_score",
        `offset ${m.index}`,
      );
    }
    if (/\bfeatured\s*:\s*(true|false)\b/.test(src)) {
      fail(
        "ranking",
        "generated stripe-webhook still writes facilities.featured — note has_featured " +
          "(the Featured add-on flag on facility_subscriptions) is the legitimate one",
        webhook,
      );
    }
    if (/RANKING_BOOST/.test(src)) {
      fail("ranking", "generated stripe-webhook still carries the RANKING_BOOST constant", webhook);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. FRONTEND — organic ordering and Featured display
// ═══════════════════════════════════════════════════════════════════════════
function checkFrontend() {
  // ── No payment-ranked organic sort helper may exist ──────────────────────
  if (exists("src/lib/facilityPlanSort.ts")) {
    fail(
      "frontend",
      "src/lib/facilityPlanSort.ts is back — organic results must not be ordered by plan",
    );
  }
  for (const [file, symbols] of Object.entries({
    "src/pages/SearchResults.tsx": ["getPlanRank", "getPlanPriority"],
    "src/pages/seeker/SeekerHome.tsx": ["getPlanRank", "getPlanPriority"],
    "src/pages/seeker/SeekerSearch.tsx": ["getPlanRank", "getPlanPriority"],
  })) {
    if (!exists(file)) continue;
    const src = stripJs(read(file));
    for (const sym of symbols) {
      if (new RegExp(`\\b${sym}\\s*\\(`).test(src)) {
        fail("frontend", `${sym}() ranks organic results by plan`, file);
      }
    }
  }

  // ── The comparators themselves must not read a payment signal ────────────
  // Scoped to the sort callback so an unrelated `isPro` elsewhere on the page
  // (phone gating, badges) is not a false positive.
  const sortSurfaces = [
    "src/pages/SearchResults.tsx",
    "src/pages/seeker/SeekerHome.tsx",
    "src/pages/seeker/SeekerSearch.tsx",
  ];
  const paidSignal = /\b(isPro|planTier|isFeaturedPaid|isHomepageFeatured|hasPaidPlan|hasFeaturedSubscription|subscriptionStatus)\b/;
  for (const file of sortSurfaces) {
    if (!exists(file)) continue;
    const src = stripJs(read(file));
    for (const m of src.matchAll(/\.sort\(\s*\(([\s\S]*?)\n\s{0,6}\}\)\s*;/g)) {
      const cb = m[1];
      const hit = cb.match(paidSignal);
      if (hit) {
        fail(
          "frontend",
          `the results comparator reads \`${hit[1]}\` — organic order must not depend on payment`,
          file,
        );
      }
    }
  }

  // ── Pro must never be assigned to a Featured field ──────────────────────
  const hooks = ["src/hooks/useApprovedFacilities.ts", "src/hooks/useStaticFacilities.ts"];
  for (const file of hooks) {
    if (!exists(file)) continue;
    const src = stripJs(read(file));
    if (/\bfeatured\s*:\s*[^,\n]*\bisPro\b/.test(src)) {
      fail(
        "frontend",
        "`featured` is assigned from isPro (directly or via `||`) — a Pro subscription is not Featured placement",
        file,
      );
    }
    if (/\bisFeaturedPaid\s*:/.test(src)) {
      fail(
        "frontend",
        "isFeaturedPaid is reintroduced — paid Featured must come from the rotation " +
          "contract (featured_placements), not from a raw catalog boolean",
        file,
      );
    }
  }

  // ── Pro must not enter homepage Featured eligibility ─────────────────────
  const feat = "supabase/functions/get-featured-facilities/index.ts";
  if (!exists(feat)) {
    fail("frontend", `${feat} not found`);
  } else {
    const src = stripJs(read(feat));
    // The specific regression: pushing a Pro-subscription row into the
    // eligibility pool. Computing proFacilityIds is fine and still expected.
    const proLoop = src.match(/for\s*\(\s*const\s+proSub\s+of\s+proSubs\s*\)\s*\{[\s\S]*?\n\s{4}\}/);
    if (proLoop && /eligibleFacilities\.push/.test(proLoop[0])) {
      fail(
        "frontend",
        "an active Pro subscription is pushed into Featured eligibility — Pro buys product " +
          "features, not homepage placement",
        feat,
      );
    }
    if (/plan_type:\s*['"]pro['"]/.test(src)) {
      fail("frontend", "Featured eligibility still carries plan_type='pro'", feat);
    }
    if (!/proFacilityIds\.push/.test(src)) {
      fail(
        "frontend",
        "proFacilityIds is no longer computed — existing callers need the Pro entitlement signal",
        feat,
      );
    }
  }

  // ── The paid rotation engine must keep its Stage-2 phone protection ──────
  const rot = "supabase/functions/get-featured-rotation/index.ts";
  if (exists(rot)) {
    const src = stripJs(read(rot));
    // Assert the gating EXPRESSION, not just the presence of the tokens: the
    // rail must resolve display_phone through the canonical Pro set and fall
    // through to null. A Featured-only, Free or fallback entry publishing a
    // phone number is the Stage-2 regression this protects.
    if (!/\bdisplay_phone\b\s*:\s*proFacilityIds\.has\(/.test(src)) {
      fail(
        "frontend",
        "get-featured-rotation no longer gates display_phone on the canonical Pro set — a " +
          "Featured-only, Free or fallback rail entry would publish a phone number",
        rot,
      );
    }
    if (!/:\s*null\s*,\s*$/m.test(src.slice(src.search(/\bdisplay_phone\b/)).slice(0, 400))) {
      fail(
        "frontend",
        "get-featured-rotation's display_phone no longer falls through to null for non-Pro entries",
        rot,
      );
    }
  }

  // ── Static generators must not badge organic listings as Featured ────────
  const gen = "scripts/_facility-data.mjs";
  if (exists(gen)) {
    const src = stripJs(read(gen));
    if (/featuredBadge/.test(src)) {
      fail(
        "frontend",
        "the static aggregate generator renders a Featured badge on organic listings",
        gen,
      );
    }
  }
}

checkDatabase();
checkRanking();
checkFrontend();

if (violations.length > 0) {
  console.error("\n✖ directory trust / ranking contract violated\n");
  let lastLayer = null;
  for (const v of violations) {
    if (v.layer !== lastLayer) {
      console.error(`  ── ${v.layer.toUpperCase()} ──`);
      lastLayer = v.layer;
    }
    console.error(`  • ${v.rule}${v.detail ? `\n      ${v.detail}` : ""}`);
  }
  console.error(
    "\n  Contract: providers may buy Pro PRODUCT FEATURES and labeled FEATURED\n" +
      "  VISIBILITY. They may not buy verification, organic ranking, inquiry\n" +
      "  eligibility, inquiry value, or matching.\n",
  );
  process.exit(1);
}

console.log("✓ directory trust / ranking contract intact");
console.log("  • verified is plan-independent; phone stays Pro-gated");
console.log("  • claimant visibility + raw-table closure preserved");
console.log("  • organic ranking has no payment input (code or stored settings)");
console.log("  • Pro writes no Featured / ranking / trust state");
console.log("  • organic sorts and Featured display carry no payment signal");
