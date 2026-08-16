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

// ═══════════════════════════════════════════════════════════════════════════
// 4. SEARCH TRUST — an aggregate count may not carry a trust adjective
// ═══════════════════════════════════════════════════════════════════════════
/**
 * SearchResults shipped `Browse ${filteredCenters.length} verified addiction
 * treatment centers…` in its SEO/meta description. `filteredCenters` is the
 * whole current result set; it is narrowed to `verified === true` only when the
 * visitor turns on the Verified Only filter. Unfiltered — every indexable
 * variant — it is dominated by unclaimed SAMHSA rows the importer writes as
 * `verified: false` and the DB gate refuses to verify. Production: 5 verified
 * against ~3.8k listings. The page asserted a trust status for thousands of
 * listings that do not hold it.
 *
 * This is NOT a ban on the word "verified". Verified is legitimate for an
 * individual verified facility, for the Verified Only filter, and for the copy
 * that explains what verification means. The rule is shaped to the mechanism:
 * a trust adjective may not be applied to a RESULT-SET COUNT.
 */
const TRUST_ADJECTIVE = "verified|vetted|approved|trusted|accredited|screened|endorsed";
const RESULT_AGGREGATES = [
  "filteredCenters\\.length",
  "allCenters\\.length",
  "sortedCenters\\.length",
  "paginatedCenters\\.length",
  "centers\\.length",
  "results\\.length",
  "resultCount",
  "totalResults",
  "totalCount",
];

function checkSearchTrust() {
  const file = "src/pages/SearchResults.tsx";
  if (exists(file)) {
    const src = stripJs(read(file));

    // An interpolated result-set count followed, within the same sentence, by a
    // trust adjective describing what was counted.
    const agg = new RegExp(
      `\\$\\{\\s*(${RESULT_AGGREGATES.join("|")})\\s*\\}[^\\n\`]{0,60}?\\b(${TRUST_ADJECTIVE})\\b`,
      "i",
    );
    const hit = src.match(agg);
    if (hit) {
      fail(
        "search-trust",
        `the result count \`${hit[1]}\` is described as "${hit[2]}" — the result set ` +
          `does not enforce that predicate unless the Verified Only filter is on`,
        file,
      );
    }

    // The inverse ordering: "N verified centers" where the adjective precedes.
    const agg2 = new RegExp(
      `\\b(${TRUST_ADJECTIVE})\\b[^\\n\`]{0,40}?\\$\\{\\s*(${RESULT_AGGREGATES.join("|")})\\s*\\}`,
      "i",
    );
    const hit2 = src.match(agg2);
    if (hit2) {
      fail(
        "search-trust",
        `a result-set count \`${hit2[2]}\` is qualified as "${hit2[1]}"`,
        file,
      );
    }

    // The description must be built by the single tested helper, so there is
    // one place to police rather than an inline template that can be reworded.
    if (!/buildSearchResultsDescription\s*\(/.test(src)) {
      fail(
        "search-trust",
        "SearchResults no longer builds its meta description through " +
          "buildSearchResultsDescription() — the trust wording has no single " +
          "tested chokepoint",
        file,
      );
    }
  }

  // The helper itself must not reintroduce a trust adjective around the count.
  const helper = "src/lib/searchResultsSeo.ts";
  if (exists(helper)) {
    const src = stripJs(read(helper));
    const hit = src.match(
      new RegExp(`\\$\\{\\s*count\\s*\\}[^\\n\`]{0,60}?\\b(${TRUST_ADJECTIVE})\\b`, "i"),
    );
    if (hit) {
      fail(
        "search-trust",
        `buildSearchResultsDescription describes its count as "${hit[1]}"`,
        helper,
      );
    }
  }

  // ── The BUILT bundle, when one exists ────────────────────────────────────
  // build:vercel runs this guard after `vite build`, so the artifact the
  // Preview actually serves is inspectable. Source review alone would not have
  // caught the regression that shipped: it was found by reading the deployed
  // bundle. Template interpolation is gone after minification, so the built
  // check targets the resulting phrases directly.
  const BUILT_REGRESSIONS = [
    "verified addiction treatment centers",
    "verified addiction treatment center listings",
    "verified rehab centers",
    "verified treatment centers",
  ];
  const assetsDir = "dist/assets";
  if (exists(assetsDir)) {
    let chunks = [];
    try {
      chunks = readdirSync(join(ROOT, assetsDir)).filter(
        (f) => /^SearchResults[.-]/.test(f) && f.endsWith(".js"),
      );
    } catch {
      chunks = [];
    }
    for (const chunk of chunks) {
      const rel = `${assetsDir}/${chunk}`;
      const built = read(rel);
      for (const phrase of BUILT_REGRESSIONS) {
        if (built.toLowerCase().includes(phrase)) {
          fail(
            "search-trust",
            `the built SearchResults chunk describes results as "${phrase}" — ` +
              `this is the exact string served to crawlers and to the Preview`,
            rel,
          );
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. CANONICAL PRO — one definition of Pro, and it is has_active_pro
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Pro is `public_facilities.is_pro`, i.e. `has_active_pro(id)`. Anything else
 * is a second, drifting definition.
 *
 * get-featured-facilities built `proFacilityIds` from every
 * facility_subscriptions row with `status='active'` and a future
 * current_period_end — no tier predicate at all, so ANY active subscription of
 * ANY product was published as a Pro entitlement, and Pro unlocks the public
 * phone. It is also a B3 landmine: a Featured-only subscription must stay
 * `status='active'` (get-featured-rotation INNER JOINs on it), so the moment B3
 * lands, Featured-only would have become Pro.
 */
function checkCanonicalPro() {
  const fn = "supabase/functions/get-featured-facilities/index.ts";
  if (exists(fn)) {
    const src = stripJs(read(fn));

    if (/\bfrom\s*\(\s*["']facility_subscriptions["']\s*\)/.test(src)) {
      fail(
        "canonical-pro",
        "get-featured-facilities queries facility_subscriptions directly — Pro " +
          "identity must come from the canonical public_facilities.is_pro " +
          "projection, not from a locally reimplemented subscription predicate",
        fn,
      );
    }
    if (!/\bfrom\s*\(\s*["']public_facilities["']\s*\)[\s\S]{0,160}?\bis_pro\b/.test(src)) {
      fail(
        "canonical-pro",
        "get-featured-facilities does not read is_pro from public_facilities",
        fn,
      );
    }
    if (!/\bis_pro\s*===\s*true\b/.test(src)) {
      fail(
        "canonical-pro",
        "get-featured-facilities does not fail closed on `is_pro === true` when " +
          "building proFacilityIds",
        fn,
      );
    }
    // Featured — in any of its representations — must never feed the Pro set.
    for (const [pattern, label] of [
      [/proFacilityIds\.push\([^)]*\bhas_featured\b/, "has_featured"],
      [/proFacilityIds\.push\([^)]*\bfeatured\b/, "facilities.featured"],
      [/proFacilityIds\.push\([^)]*FEATURED_PRODUCT_IDS/, "the Stripe Featured product"],
    ]) {
      if (pattern.test(src)) {
        fail(
          "canonical-pro",
          `${label} can put a facility into proFacilityIds — Featured is not Pro`,
          fn,
        );
      }
    }
  }

  // ── No frontend may elevate a non-Pro facility to Pro ────────────────────
  // A union can only ADD Pro, so a secondary list is never a "safety net": it
  // is a path for a non-canonical signal to unlock Pro product features.
  const sf = "src/hooks/useStaticFacilities.ts";
  if (exists(sf)) {
    const src = stripJs(read(sf));
    const assign = src.match(/const\s+isPro\s*=\s*([^;]+);/);
    if (!assign) {
      fail("canonical-pro", "useStaticFacilities no longer derives isPro", sf);
    } else {
      const expr = assign[1];
      if (/\|\||\?\?/.test(expr) || /\bproIds\b|\bproFacilityIds\b/.test(expr)) {
        fail(
          "canonical-pro",
          `useStaticFacilities unions canonical isPro with another source ` +
            `(\`${expr.trim().slice(0, 80)}\`) — a legacy list must never turn ` +
            `isPro=false into true`,
          sf,
        );
      }
      if (!/\bisPro\s*===\s*true\b/.test(expr)) {
        fail(
          "canonical-pro",
          "useStaticFacilities does not fail closed on the snapshot's `isPro === true`",
          sf,
        );
      }
    }
  }

  const af = "src/hooks/useApprovedFacilities.ts";
  if (exists(af)) {
    const src = stripJs(read(af));
    if (!/\bfrom\s*\(\s*["']public_facilities["']\s*\)/.test(src) || !/\bis_pro\b/.test(src)) {
      fail(
        "canonical-pro",
        "useApprovedFacilities does not source is_pro from public_facilities",
        af,
      );
    }
    const assign = src.match(/const\s+isPro\s*=\s*([^;]+);/);
    if (assign && !/\bis_pro\s*===\s*true\b/.test(assign[1])) {
      fail(
        "canonical-pro",
        `useApprovedFacilities derives Pro from \`${assign[1].trim().slice(0, 80)}\` ` +
          `instead of the canonical \`facility.is_pro === true\``,
        af,
      );
    }
  }

  // ── No public surface may badge Pro as Featured ──────────────────────────
  // CenterProfile invoked get-featured-facilities, tested membership of
  // proFacilityIds, and rendered a crowned "Featured" badge from the result —
  // a Pro test behind a Featured-sounding name. Pro buys product features, not
  // a placement claim.
  const cp = "src/pages/CenterProfile.tsx";
  if (exists(cp)) {
    const src = stripJs(read(cp));
    if (/\bproFacilityIds\b/.test(src)) {
      fail(
        "canonical-pro",
        "CenterProfile reads proFacilityIds — the public profile derives no plan " +
          "state; Pro comes from the canonical is_pro claim flags",
        cp,
      );
    }
    if (/\bhasFeaturedSubscription\b/.test(src)) {
      fail(
        "canonical-pro",
        "CenterProfile's hasFeaturedSubscription is back — it tested Pro " +
          "membership and rendered a Featured badge from it",
        cp,
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. WEBHOOK GENERATION — the deployable artifact must be reproducible
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Byte-equality between the committed webhook and the generator's output is
 * proved by `npm run check:stripe-webhook-inline`, which delegates to the
 * generator itself so there is exactly one implementation of the transform.
 * The rules here are the cheap static ones that describe the PIPELINE'S SHAPE
 * — the defects that made the generator inoperable in the first place.
 */
function checkWebhookGeneration() {
  const generator = "scripts/inline-stripe-webhook-shared.py";
  const artifact = "supabase/functions/stripe-webhook/index.ts";
  const entrypoint = "supabase/functions/stripe-webhook/entrypoint.ts";

  if (exists(generator)) {
    const raw = read(generator);
    const code = raw.replace(/"""[\s\S]*?"""/g, "").replace(/#[^\n]*/g, "");

    if (/^\s*ENTRY\s*=.*index\.ts/m.test(code) || /^\s*SRC\s*=.*index\.ts/m.test(code)) {
      fail(
        "webhook-generation",
        "the generator reads the generated index.ts as its canonical input — " +
          "it re-inlines its own output and is not idempotent",
        generator,
      );
    }
    if (/stripe-webhook\/_shared|["']stripe-webhook["']\s*,\s*["']_shared["']/.test(code)) {
      fail(
        "webhook-generation",
        "the generator points at stripe-webhook/_shared, deleted in c9c8fbc436 — " +
          "the canonical modules live in supabase/functions/_shared",
        generator,
      );
    }
    if (!exists(entrypoint)) {
      fail(
        "webhook-generation",
        "there is no canonical stripe-webhook entrypoint; the generated artifact " +
          "would have to serve as its own source",
        entrypoint,
      );
    }
  }

  if (exists(artifact)) {
    const art = read(artifact);
    if (/inline-stripe-webhook-shared\.sh/.test(art)) {
      fail(
        "webhook-generation",
        "the generated header tells maintainers to run a .sh generator that does " +
          "not exist in this repository",
        artifact,
      );
    }
    const stripped = stripJs(art);
    const local = [...stripped.matchAll(/^import[\s\S]*?from\s*"(\.{1,2}\/[^"]+)";/gm)].map(
      (m) => m[1],
    );
    if (local.length > 0) {
      fail(
        "webhook-generation",
        `the generated webhook has unresolved local imports (${[
          ...new Set(local),
        ].join(", ")}) — --use-api uploads only the entrypoint and cannot resolve them`,
        artifact,
      );
    }
  }

  // The check must be wired into the build, not merely available.
  if (exists("package.json")) {
    const pkg = read("package.json");
    if (!/"check:stripe-webhook-inline"\s*:/.test(pkg)) {
      fail("webhook-generation", "check:stripe-webhook-inline is not defined", "package.json");
    } else {
      const build = JSON.parse(pkg).scripts?.["build:vercel"] ?? "";
      const iInline = build.indexOf("check:stripe-webhook-inline");
      const iBlocking = build.indexOf("validate:blocking");
      if (iInline === -1) {
        fail(
          "webhook-generation",
          "build:vercel does not run check:stripe-webhook-inline",
          "package.json",
        );
      } else if (iBlocking !== -1 && iInline > iBlocking) {
        fail(
          "webhook-generation",
          "check:stripe-webhook-inline runs after validate:blocking",
          "package.json",
        );
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. PRODUCT CLASSIFICATION — Featured is not a Pro entitlement
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Pro and Featured are different purchases. Pro ($99/mo) buys PRODUCT FEATURES
 * — the public facility phone + Call CTA, enhanced media, analytics. Featured
 * buys labeled VISIBILITY and nothing else: no trust, no verification, no
 * organic ranking, no phone, no Pro.
 *
 * The webhook collapsed that distinction into a single list named
 * PRO_PRODUCT_IDS which held BOTH Professional products AND BOTH Featured
 * products. Every branch read membership as a Pro predicate, and on
 * customer.subscription.created that predicate is the entitlement decision, so
 * a Featured subscription without the modern featured_addon metadata was
 * granted Pro.
 *
 * The rules are mechanism-shaped: they check the SETS and the MAPPING, in both
 * the canonical module and the deployable artifact. They do not ban the words
 * Pro or Featured, which are legitimate product names throughout.
 */
function checkProductClassification() {
  const CLASSIFIER = "supabase/functions/_shared/stripe-product-classification.ts";
  const ENTRYPOINT = "supabase/functions/stripe-webhook/entrypoint.ts";
  const ARTIFACT = "supabase/functions/stripe-webhook/index.ts";

  const FEATURED_PRODUCTS = ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"];
  const PRO_PRODUCTS = ["prod_TbalLOPujTIoUe", "prod_Tbyz1bf6iYyzYd"];

  const idSet = (src, namePattern) => {
    const m = src.match(new RegExp(`${namePattern}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
    if (!m) return null;
    return [...m[1].matchAll(/["']([^"']+)["']/g)].map((x) => x[1]);
  };

  if (!exists(CLASSIFIER)) {
    fail(
      "product-classification",
      "there is no canonical Stripe product classifier; product identity is " +
        "re-derived per event branch",
      CLASSIFIER,
    );
    return;
  }

  // The same rules hold for the reviewed source and for the bytes that deploy.
  for (const file of [CLASSIFIER, ENTRYPOINT, ARTIFACT].filter(exists)) {
    const code = stripJs(read(file));

    const proIds = idSet(code, "(?<![A-Z_])LEGACY_PRO_PRODUCT_IDS");
    const featuredIds = idSet(code, "LEGACY_FEATURED_PRODUCT_IDS");

    // A set literally named PRO_PRODUCT_IDS is only a violation when it holds a
    // Featured product — that mixture is the defect, not the identifier.
    const legacyMixedSet = idSet(code, "(?<![A-Z_])PRO_PRODUCT_IDS");
    if (legacyMixedSet) {
      const bad = legacyMixedSet.filter((id) => FEATURED_PRODUCTS.includes(id));
      if (bad.length > 0) {
        fail(
          "product-classification",
          `PRO_PRODUCT_IDS contains Featured product ids (${bad.join(", ")}) — a ` +
            `Featured purchase would be classified Pro and unlock the public ` +
            `facility phone`,
          file,
        );
      }
    }

    if (proIds) {
      const bad = proIds.filter((id) => FEATURED_PRODUCTS.includes(id));
      if (bad.length > 0) {
        fail(
          "product-classification",
          `the Pro product set contains Featured product ids (${bad.join(", ")})`,
          file,
        );
      }
      if (featuredIds) {
        const intersection = proIds.filter((id) => featuredIds.includes(id));
        if (intersection.length > 0) {
          fail(
            "product-classification",
            `the legacy Pro and Featured product sets intersect (${intersection.join(
              ", ",
            )}) — they must be disjoint`,
            file,
          );
        }
      }
    }

    if (featuredIds) {
      const bad = featuredIds.filter((id) => PRO_PRODUCTS.includes(id));
      if (bad.length > 0) {
        fail(
          "product-classification",
          `the Featured product set contains Pro product ids (${bad.join(", ")}) — ` +
            `legitimate Pro subscribers would lose their entitlement`,
          file,
        );
      }
    }

    // No branch may map a product-id list straight onto the Pro tier. One
    // classifier is used everywhere; a second copy is how the first one drifts.
    if (/_IDS\s*(?:as\s+readonly\s+string\[\]\s*)?\)?\.includes\([^)]*\)[^;{]{0,40}?planTier\s*=\s*"pro"/.test(code)) {
      fail(
        "product-classification",
        "a product-id membership test assigns planTier='pro' directly — product " +
          "identity must go through the fail-closed classifier",
        file,
      );
    }
  }

  // The canonical classifier must actually be fail-closed, and the webhook must
  // route Featured somewhere other than the Pro path.
  const cls = stripJs(read(CLASSIFIER));
  if (!/function\s+classifyLegacyProduct/.test(cls)) {
    fail(
      "product-classification",
      "classifyLegacyProduct is gone — there is no single product classifier",
      CLASSIFIER,
    );
  }
  if (!/LEGACY_FEATURED_PRODUCT_IDS[\s\S]{0,400}?includes\([\s\S]{0,60}?return\s+"featured"/.test(cls)) {
    fail(
      "product-classification",
      "the classifier no longer resolves Featured products to \"featured\"",
      CLASSIFIER,
    );
  }

  if (exists(ARTIFACT)) {
    const art = stripJs(read(ARTIFACT));
    if (!/planTier\s*===\s*"pro"\s*&&\s*subscriptionEntitled/.test(art)) {
      fail(
        "product-classification",
        "the deployable webhook no longer gates Pro activation on the classified tier",
        ARTIFACT,
      );
    }
    if (!/legacyClass\s*===\s*"featured"/.test(art)) {
      fail(
        "product-classification",
        "the deployable webhook has no legacy-Featured branch, so a Featured " +
          "subscription without featured_addon metadata takes the Pro path",
        ARTIFACT,
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. PRO LIFECYCLE MESSAGING — what the automated emails promise
//
// The DB, the scorer and the frontend can all be correct while the Stripe
// webhook still *tells the provider* they bought something else. That is
// exactly what shipped: the payment-success email advertised
// "Featured placement & priority ranking" as a Pro benefit and the
// cancellation email reported the same pair as removed. Neither is a Pro
// entitlement — Featured is independent paid inventory and organic order is
// computed by calculate-ranking-scores from neutral signals — so both
// statements were false in the same direction, and the cancellation one also
// implied that dropping Pro withdrew an independent Featured entitlement and
// changed the listing's directory standing.
//
// Copy is load-bearing here: an outbound email is the only part of the
// contract the customer actually reads, and it is the part that survives a
// correct backend.
//
// SCOPED, NOT WORD-BANNED. "Featured", "ranking", "verified" and "priority"
// are legitimate throughout this file — the Featured add-on branch, the
// legacy-product classifier, the Concierge flow and the retirement comments
// all use them correctly. So this rule reads only the two Pro-lifecycle copy
// regions, located by their own anchors, and only after comments are removed.
//
// NEGATION IS CLAIM-LOCAL, NOT LINE-LOCAL.
// ────────────────────────────────────────
// The first version of this rule skipped an entire LINE as soon as the line
// contained any neutralizing word:
//
//     if (NEUTRALIZED.test(line)) continue;   // ← the defect
//
// That closed the cross-line hole (a disclaimer in one paragraph excusing a
// false claim in another) and left the same-line hole wide open. One truthful
// phrase anywhere on a line exempted every claim beside it, so all of these
// passed a guard whose whole purpose was to catch them:
//
//     Verification is unchanged. Pro includes priority ranking.
//     Featured remains independent, but Pro includes priority placement.
//     Your verification is not affected; Pro gives higher search placement.
//     Featured is separate. Pro gives a verified badge.
//     Your directory position is unchanged, and Pro boosts you higher in search.
//     Pro includes Featured placement, although verification is independent.
//
// A disclaimer only ever holds harmless the clause it actually governs. So the
// region is now broken into CLAUSE-SIZED units and each prohibited claim is
// judged inside its own unit, by two independent tests:
//
//   1. CLAUSE SPLITTING — sentence terminators, semicolons, bullets, markup
//      boundaries, contrastive conjunctions (but / although / though / yet /
//      whereas / however) and `, and`-style coordination all start a new unit.
//      A disclaimer therefore cannot reach across the punctuation into the
//      next assertion.
//
//   2. ASSERTION OVERRIDE — within a single unit, a neutralizing word excuses
//      a claim only when the unit makes no grant/removal assertion. "Featured
//      remains independent" is a disclaimer; "Featured remains independent,
//      but Pro includes priority placement" asserts (`includes`), so the
//      disclaimer no longer excuses it even if the splitter had missed the
//      comma.
//
// The two are deliberately redundant: either alone catches every case above,
// so a gap in one is covered by the other.
//
// Anchors fail closed: if a region cannot be found the rule reports that
// rather than passing, so renaming the block never silently disables it.
//
// The matcher proves itself against the exact bypasses above on every run
// (see PRO_COPY_MATCHER_FIXTURES) before it is trusted to judge the repo.
// ═══════════════════════════════════════════════════════════════════════════

/** HTML comments live inside template literals, so stripJs cannot see them. */
const stripHtmlComments = (src) => src.replace(/<!--[\s\S]*?-->/g, "");

/**
 * Words that explicitly hold a signal harmless. These are the wording the
 * contract wants, so they must not be mistaken for the claim they disclaim —
 * but only for a claim in the SAME clause, and only when that clause is not
 * simultaneously asserting something (see PRO_COPY_ASSERTION).
 */
const PRO_COPY_NEUTRALIZER =
  /\b(?:unchanged|unaffected|not\s+affected|isn't\s+affected|independent|independently|separate|separately|unrelated|regardless|never|no\s+effect|no\s+impact|no\s+bearing|not\s+influenced|not\s+determined|not\s+tied|does\s+not|do\s+not|doesn't|don't|cannot|can't|will\s+not|won't)\b/i;

/**
 * Verbs that assert Pro grants or withdraws something. Their presence means the
 * clause is making a claim, so a neutralizing word in the same clause is
 * describing a DIFFERENT signal and cannot excuse it.
 *
 * Deliberately excludes `restore`, `resubscribe`, `feature(s)`, `determined`
 * and `affect` — all appear in the current truthful copy.
 */
const PRO_COPY_ASSERTION =
  /\b(?:includes?|including|included|gives?|giving|gave|grants?|granted|provides?|provided|unlocks?|unlocked|adds?|added|boosts?|boosted|boosting|improves?|improved|increases?|increased|raises?|raised|elevates?|elevated|promotes?|promoted|upgrades?|upgraded|earns?|earned|receives?|received|gains?|gained|comes?\s+with|no\s+longer|loses?|losing|lost|removes?|removed|revokes?|revoked|withdrawn|withdraws?|paused?|expires?|expired|forfeits?|forfeited|downgrades?|downgraded)\b/i;

/** Words that describe a position in the directory's organic order. */
const ORGANIC_POSITION =
  /\b(?:ranking|rankings|rank|ranks|ranked|placement|placements|position|positions|visibility|exposure|prominence|search|results)\b/i;

/** Words that describe that position being better than it otherwise would be. */
const POSITION_IMPROVEMENT =
  /\b(?:higher|highest|top|better|best|improved?|improves|boost|boosts|boosted|boosting|increased?|increases|premium|priority|prioritized?|elevated?|promoted?|above|ahead|preferential|prominent|greater)\b/i;

/**
 * Assertions that Pro itself grants or withdraws trust, position or inventory.
 *
 * `test(unit)` receives one clause-sized unit. Bare "position"/"visibility" is
 * NOT a claim on its own — the current truthful copy says "your listing's
 * directory position … is not affected", and "Organic directory position is
 * unchanged by Pro" must pass. It becomes a claim only when the same clause
 * also says that position is better.
 */
const PRO_COPY_CLAIMS = [
  {
    test: (u) => /\bfeatured\b/i.test(u),
    claim: "Featured placement (Featured is independent paid inventory, not a Pro benefit)",
  },
  {
    test: (u) => /\bpriority\s+(?:ranking|rank|placement|position|listing|visibility|search|slot|spot)\b/i.test(u),
    claim: "priority ranking / priority placement",
  },
  {
    test: (u) => POSITION_IMPROVEMENT.test(u) && ORGANIC_POSITION.test(u),
    claim: "an improved organic position",
  },
  { test: (u) => /\brank(?:ing|ings|ed|s)?\b/i.test(u), claim: "organic ranking" },
  {
    test: (u) => /\bverif(?:y|ies|ied|ication)\b/i.test(u),
    claim: "verification / trust status",
  },
  {
    test: (u) => /\btrusted\b|\bvetted\b|\baccredited\b|\bendorsed\b/i.test(u),
    claim: "a trust designation",
  },
];

/**
 * Pro-lifecycle copy regions, each located by an anchor that belongs to the
 * copy itself rather than to a line number.
 */
const PRO_COPY_REGIONS = [
  {
    label: "Pro payment-success / renewal benefits block",
    // const proBenefits = isPro ? `…` : "";
    re: /const\s+proBenefits\s*=\s*isPro[\s\S]{0,2000}?:\s*""/,
  },
  {
    label: "Pro cancellation email to the provider",
    // the provider-facing cancel email, terminated by its own emailType tag
    re: /subject:\s*[`"']Your Pro Subscription Has Been Cancelled[`"'][\s\S]{0,4000}?emailType:\s*"stripe_cancel_provider"/,
  },
];

/** The handful of entities that actually occur in these templates. */
const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&(?:apos|#0?39);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");

/** Attributes whose value is rendered to the reader, so they carry copy. */
const VISIBLE_ATTRS = /\b(?:alt|title|aria-label)\s*=\s*"([^"]*)"/gi;

/**
 * Split a copy region into clause-sized units.
 *
 * Markup becomes a boundary rather than text: a `style` declaration is not copy
 * (and `position: absolute; top: 0` would otherwise read as an organic-position
 * claim), while `<p>A</p><p>B</p>` must not merge into one unit. The values of
 * attributes that ARE rendered are re-appended as their own units so a claim
 * cannot hide in an `alt` or `title`.
 */
function proCopyUnits(region) {
  const attrText = [...region.matchAll(VISIBLE_ATTRS)].map((m) => decodeEntities(m[1]));

  let text = decodeEntities(region.replace(/<[^>]*>/g, "\n"));
  // `, and` / `, but` style coordination starts a new clause.
  text = text.replace(
    /,\s*(?=(?:but|although|though|yet|while|whereas|however|and|or|so|plus|still|meanwhile)\b)/gi,
    "\n",
  );
  // A contrastive conjunction starts a new clause with or without the comma.
  text = text.replace(/\s+(?=(?:but|although|though|whereas|however|yet)\b)/gi, "\n");

  return [text, ...attrText]
    .join("\n")
    .split(/\n|(?<=[.!?])\s+|[;•·✓✔×|—–]/)
    .map((u) => u.trim())
    .filter(Boolean);
}

/**
 * Every prohibited claim asserted in `region`, with the clause that asserts it.
 * A claim survives only if its own clause disclaims it and asserts nothing.
 */
function findProCopyViolations(region) {
  const found = [];
  for (const unit of proCopyUnits(region)) {
    const disclaimed = PRO_COPY_NEUTRALIZER.test(unit) && !PRO_COPY_ASSERTION.test(unit);
    if (disclaimed) continue;
    for (const { test, claim } of PRO_COPY_CLAIMS) {
      if (test(unit)) found.push({ claim, unit });
    }
  }
  return found;
}

/**
 * The matcher's own regression suite, run on every invocation. `expect: true`
 * means at least one violation; `expect: false` means none.
 *
 * The `false` cases are the current shipped copy and the independence wordings
 * the contract explicitly wants — a false positive here is as much a bug as a
 * missed claim, because it would push authors toward vaguer disclaimers.
 */
const PRO_COPY_MATCHER_FIXTURES = [
  // ── must FAIL: the same-line disclaimer escapes ──────────────────────────
  ["same-line period bypass", "<p>Verification is unchanged. Pro includes priority ranking.</p>", true],
  ["same-line contrast bypass", "<p>Featured remains independent, but Pro includes priority placement.</p>", true],
  ["semicolon bypass", "<p>Your verification is not affected; Pro gives higher search placement.</p>", true],
  ["trust claim after disclaimer", "<p>Featured is separate. Pro gives a verified badge.</p>", true],
  ["coordinated boost bypass", "<p>Your directory position is unchanged, and Pro boosts you higher in search.</p>", true],
  ["reversed order", "<p>Pro includes Featured placement, although verification is independent.</p>", true],
  ["original regression", "<p>✓ Featured placement &amp; priority ranking</p>", true],
  ["claim hidden in a visible attribute", '<img alt="Pro includes priority ranking">', true],
  // ── must PASS: the shipped copy and the wordings the contract wants ──────
  [
    "shipped payment-success disclaimer",
    "<p>Pro is a set of listing features. Your listing's directory position and its " +
      "verification status are determined independently and are not affected by your subscription.</p>",
    false,
  ],
  [
    "shipped cancellation disclaimer",
    "<p>Your listing, its directory position and its verification status are unchanged. " +
      "Your data is safe — nothing has been deleted. You can resubscribe anytime to restore your Pro features.</p>",
    false,
  ],
  ["explicit trust independence", "<p>Pro does not affect verification.</p>", false],
  ["explicit Featured independence", "<p>Featured is independent of Pro.</p>", false],
  ["explicit position independence", "<p>Organic directory position is unchanged by Pro.</p>", false],
  ["truthful Pro benefits", "<p>✓ Public phone number and Call button on your listing</p>", false],
  ["truthful listing cap", "<p>✓ Up to 5 facility listings</p>", false],
  ["cancellation effects", "<p>• Your public phone number and Call button are no longer shown</p>", false],
];

function checkProCopyMatcher() {
  for (const [name, sample, shouldFail] of PRO_COPY_MATCHER_FIXTURES) {
    const hits = findProCopyViolations(sample);
    if (shouldFail && hits.length === 0) {
      fail(
        "pro-lifecycle-copy",
        `the Pro copy matcher no longer catches its own regression case "${name}" — ` +
          "a disclaimer can excuse a false claim beside it again",
        sample.trim().slice(0, 160),
      );
    }
    if (!shouldFail && hits.length > 0) {
      fail(
        "pro-lifecycle-copy",
        `the Pro copy matcher rejects the truthful control "${name}" (as ` +
          `${hits[0].claim}) — an explicit independence statement must be allowed`,
        `${sample.trim().slice(0, 120)} → "${hits[0].unit.slice(0, 80)}"`,
      );
    }
  }
}

function checkProLifecycleCopy() {
  // BOTH the human-maintained source and the deployable artifact: the artifact
  // is what actually runs, and a hand-edit there would otherwise be invisible.
  const files = [
    "supabase/functions/stripe-webhook/entrypoint.ts",
    "supabase/functions/stripe-webhook/index.ts",
  ];

  for (const rel of files) {
    if (!exists(rel)) {
      fail("pro-lifecycle-copy", `${rel} is missing — Pro lifecycle copy cannot be checked`, rel);
      continue;
    }
    const src = stripHtmlComments(stripJs(read(rel)));

    for (const region of PRO_COPY_REGIONS) {
      const match = src.match(region.re);
      if (!match) {
        fail(
          "pro-lifecycle-copy",
          `cannot locate the ${region.label} — its anchor moved or was renamed, ` +
            "so this rule can no longer prove the copy is truthful",
          rel,
        );
        continue;
      }

      for (const { claim, unit } of findProCopyViolations(match[0])) {
        fail(
          "pro-lifecycle-copy",
          `the ${region.label} tells the provider that Pro grants or removes ${claim}`,
          `${rel}: ${unit.slice(0, 160)}`,
        );
      }
    }
  }
}
checkDatabase();
checkRanking();
checkFrontend();
checkSearchTrust();
checkCanonicalPro();
checkWebhookGeneration();
checkProductClassification();
checkProCopyMatcher();
checkProLifecycleCopy();

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
console.log("  • no result-set count is described as verified (source + built bundle)");
console.log("  • Pro identity is canonical is_pro everywhere; no list can elevate it");
console.log("  • the deployable stripe-webhook is generated from a pristine entrypoint");
console.log("  • Pro and Featured Stripe products are disjoint; Featured is never a Pro tier");
console.log("  • Pro lifecycle emails promise no Featured, ranking or verification benefit");
console.log("  • a disclaimer excuses only its own clause, never a claim beside it");
