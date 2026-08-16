import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * PUBLIC FACILITY PHONE — Pro entitlement contract.
 *
 * Publishing a facility's phone number is a paid feature of an active Pro
 * subscription. Free, Featured-only and lapsed listings do not expose one
 * publicly. Featured NEVER unlocks it.
 *
 * WHY THIS FILE EXISTS
 * ────────────────────
 * Independent production verification found the previous "Pro-gated phone"
 * claim was false in two independent ways at once, and neither was caught by
 * any existing test:
 *
 *   1. public.public_facilities selected raw `phone` with no entitlement
 *      expression — the Pro CASE had been dropped by 20260714000000 and never
 *      restored. get-public-facilities carried a comment asserting the
 *      opposite, so the code READ as if it were safe.
 *
 *   2. Even a fixed view would not have been enough: the base table
 *      public.facilities was directly readable by anon and by any ordinary
 *      authenticated seeker (GRANT SELECT TO anon + a TO public approved-row
 *      RLS policy), so a caller could bypass the view entirely with
 *      `select phone from facilities`.
 *
 * A test asserting only "public_facilities.phone is null" would have passed
 * against a schema that still leaked. So this file pins BOTH the view mask and
 * the bypass closure, plus the defence-in-depth masks in the public Edge
 * responses and the frontend.
 *
 * These are SQL/source-layer invariants, asserted against the migration that
 * defines each object — the same style as provider-leads-masking.test.ts and
 * claim-facility-visibility.test.ts, which pin DB contracts from the suite.
 */

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Newest migration whose body matches `pattern`, by filename sort order. */
function latestMigrationMatching(pattern: RegExp): { name: string; sql: string } {
  const hits = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), "utf8") }))
    .filter((m) => pattern.test(m.sql));
  if (hits.length === 0) throw new Error(`No migration matches ${pattern}`);
  return hits[hits.length - 1];
}

/** Strip SQL comments so prose about a rule isn't mistaken for the rule. */
function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

function stripJsComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// ───────────────────────────────────────────────────────────────────────────
describe("DATABASE — public_facilities gates phone by has_active_pro", () => {
  const view = latestMigrationMatching(/CREATE OR REPLACE VIEW public\.public_facilities/i);
  const body = stripSqlComments(view.sql);

  it("is the amendment's migration, sorting after every prior migration", () => {
    const all = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    expect(all[all.length - 1]).toBe(view.name);
  });

  it("masks phone with the canonical entitlement predicate", () => {
    expect(body).toMatch(/CASE\s+WHEN\s+has_active_pro\(id\)\s+THEN\s+phone\s+ELSE\s+NULL/i);
  });

  it("does not re-implement subscription logic in SQL", () => {
    // The whole point of has_active_pro() is that tier/status/grace live in
    // exactly one place. A view that joins facility_subscriptions to decide
    // phone visibility would be a second, drifting definition of "Pro".
    const viewBody = body.slice(
      body.search(/CREATE OR REPLACE VIEW public\.public_facilities/i),
      body.search(/COMMENT ON VIEW public\.public_facilities/i),
    );
    expect(viewBody).not.toMatch(/facility_subscriptions/i);
    expect(viewBody).not.toMatch(/current_period_end/i);
  });

  it("does not Pro-gate ordinary directory metadata", () => {
    // The amendment monetizes PHONE and nothing else. Silently paywalling the
    // name, address, website or directions data would be a different product
    // decision that nobody made.
    for (const col of ["name", "address", "city", "state", "zip_code", "website"]) {
      expect(body).not.toMatch(
        new RegExp(`CASE\\s+WHEN\\s+has_active_pro\\(id\\)\\s+THEN\\s+${col}\\b`, "i"),
      );
    }
  });

  it("preserves the claimant-visibility rule the provider claim funnel needs", () => {
    expect(body).toMatch(/facility_claim_requests/i);
    expect(body).toMatch(/claimant_user_id\s*=\s*\(\s*SELECT auth\.uid\(\)\s*\)/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("DATABASE — anon loses raw facilities access entirely", () => {
  const mig = latestMigrationMatching(/DROP POLICY IF EXISTS "facilities_select_public"/);
  const body = stripSqlComments(mig.sql);

  it("removes the TO public approved-row policy that allowed the bypass", () => {
    expect(body).toMatch(/DROP POLICY IF EXISTS "facilities_select_public" ON public\.facilities/);
  });

  it("creates no replacement anon/public SELECT policy under any name", () => {
    // The first cut of this migration replaced the TO public policy with
    // `facilities_select_public_anon` TO anon and called that a safety net. It
    // was not a safety net; it kept the internal provider record on the
    // anonymous Data API. Nothing anon-scoped may take its place, and a rename
    // must not slip through, so the assertion is over every CREATE POLICY on
    // the table rather than over one policy name.
    expect(body).toMatch(/DROP POLICY IF EXISTS "facilities_select_public_anon"/);

    const created = [
      ...body.matchAll(/CREATE POLICY\s+"?([\w-]+)"?\s+ON\s+public\.facilities\b([\s\S]*?);/gi),
    ];
    for (const stmt of created) {
      expect(
        stmt[0],
        `policy ${stmt[1]} re-opens raw facilities to anonymous callers`,
      ).not.toMatch(/\bTO\s+(anon|public)\b/i);
    }
  });

  it("revokes anon's SELECT and grants nothing back", () => {
    expect(body).toMatch(/REVOKE SELECT ON public\.facilities FROM anon/i);

    // Neither form may return: table-level, column-level, or a column list
    // assembled dynamically through format()/EXECUTE.
    expect(body).not.toMatch(/GRANT\s+SELECT\s+ON\s+public\.facilities\s+TO\s+[^;]*\banon\b/i);
    expect(body).not.toMatch(
      /GRANT\s+SELECT\s*\([^)]*\)\s*ON\s+public\.facilities\s+TO\s+[^;]*\banon\b/i,
    );
    expect(body).not.toMatch(/GRANT\s+SELECT\s*\(%s\)\s*ON\s+public\.facilities\s+TO\s+anon/i);
  });

  it("asserts the closed boundary at migration time instead of trusting the DDL", () => {
    // Fail-closed post-condition: a stray historical column grant, or a
    // re-grant from a migration applied out of order, aborts the migration
    // rather than shipping a boundary that only reads as closed.
    expect(body).toMatch(/has_table_privilege\('anon',\s*'public\.facilities',\s*'SELECT'\)/i);
    expect(body).toMatch(/has_column_privilege\('anon'/i);
    expect(body).toMatch(/RAISE EXCEPTION/i);
  });

  it("does not gate the public directory on a per-column deny-list", () => {
    // THE REGRESSION THIS FILE EXISTS FOR.
    //
    // public.facilities is the internal provider record, not a directory
    // table. Beyond `phone` it carries the columns below, all of which a
    // "grant every column except phone" regrant would have published to
    // anonymous PostgREST callers. The fix is not to extend the deny-list —
    // it is that anon cannot select the table at all, so no enumeration of
    // internal columns is load-bearing and a column added next quarter is
    // public only if someone adds it to a public projection.
    const INTERNAL_COLUMNS = [
      "admin_notes",
      "reply_email",
      "verified_phone",
      "claim_owner_id",
      "claim_status",
      "concierge_admissions_email",
      "concierge_admissions_phone",
      "concierge_notes",
    ];

    expect(body).not.toMatch(/column_name\s*<>\s*'phone'/i);
    expect(body).not.toMatch(/information_schema\.columns[\s\S]{0,400}TO anon/i);

    // None of these may be reachable anonymously — neither by an explicit
    // anon grant in the migration, nor by appearing in the public projection.
    const viewMig = latestMigrationMatching(
      /CREATE OR REPLACE VIEW public\.public_facilities/i,
    );
    const viewBody = stripSqlComments(viewMig.sql);
    const publicView = viewBody.slice(
      viewBody.search(/CREATE OR REPLACE VIEW public\.public_facilities/i),
      viewBody.search(/COMMENT ON VIEW public\.public_facilities/i),
    );
    for (const col of INTERNAL_COLUMNS) {
      expect(publicView, `${col} must not be projected publicly`).not.toMatch(
        new RegExp(`\\b${col}\\b`, "i"),
      );
    }
  });

  it("keeps owner, facility-team and admin raw access untouched", () => {
    // These policies are what providers and admins read their own phone
    // through. Dropping or narrowing them would break provider editing, admin
    // moderation, and the claim verification flows.
    expect(body).not.toMatch(/DROP POLICY[^;]*facilities_select_authenticated/i);
    expect(body).not.toMatch(/DROP POLICY[^;]*facilities_team_select/i);
    expect(body).not.toMatch(/REVOKE[^;]*FROM[^;]*\bauthenticated\b/i);
    expect(body).not.toMatch(/REVOKE[^;]*FROM[^;]*\bservice_role\b/i);
  });

  it("adds no broad authenticated directory policy in their place", () => {
    // Ordinary authenticated seekers must fail RLS because they satisfy
    // neither the owner/admin nor the team predicate. Handing `authenticated`
    // an approved-row policy to "keep the app working" would recreate the
    // bypass for every signed-in user.
    const created = [
      ...body.matchAll(/CREATE POLICY\s+"?([\w-]+)"?\s+ON\s+public\.facilities\b([\s\S]*?);/gi),
    ];
    for (const stmt of created) {
      expect(stmt[0], `policy ${stmt[1]} grants blanket authenticated access`).not.toMatch(
        /status\s*=\s*'approved'/i,
      );
    }
  });

  it("repoints dependent public projections off the base table", () => {
    // These five views are SECURITY INVOKER and previously joined `facilities`
    // directly, which is the only reason anon/seeker raw row access was needed.
    for (const v of [
      "public_facility_accreditations",
      "public_facility_amenities",
      "public_facility_programs",
      "public_facility_staff",
      "facility_badge_recency",
    ]) {
      expect(body).toMatch(new RegExp(`CREATE OR REPLACE VIEW public\\.${v}\\b`, "i"));
    }
    expect(body).toMatch(/JOIN public\.public_facilities/i);
  });

  it("keeps slug-alias resolution working without raw base-table reads", () => {
    // An RLS policy's subquery runs with the CALLER's RLS, so the old inline
    // `EXISTS (SELECT 1 FROM facilities …)` predicate would have gone dark for
    // anon once the approved-row policy was dropped.
    expect(body).toMatch(/facility_name_aliases_select_public/);
    expect(body).toMatch(/is_approved_facility\(facility_id\)/i);
  });

  it("destroys no stored data — the raw phone remains internal authorized data", () => {
    expect(body).not.toMatch(/drop\s+table/i);
    expect(body).not.toMatch(/drop\s+column/i);
    expect(body).not.toMatch(/delete\s+from/i);
    expect(body).not.toMatch(/update\s+public\.facilities\s+set\s+phone/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("PUBLIC BROWSER — no anonymous surface reads the raw table", () => {
  it("TrustStrip counts through the public directory RPC, not `facilities`", () => {
    // TrustStrip was the last anonymous consumer of the raw base table, and
    // the reason the migration first tried to keep a "count-only" anon grant.
    const code = stripJsComments(read("src/components/home/TrustStrip.tsx"));
    expect(code).not.toMatch(/\.from\(\s*["'`]facilities["'`]\s*\)/);
    expect(code).toMatch(/useDirectoryStats/);
  });

  it("does not restate the directory-wide 'verified' claim the data disproves", () => {
    // `facilities.verified` is true for 5 rows out of 3,794 on production, and
    // `public_facilities.verified` is itself Pro-gated (currently 0). Neither
    // supports "verified/vetted treatment centers" as a directory-size label.
    const code = read("src/components/home/TrustStrip.tsx");
    const jsx = code.slice(code.indexOf("const items"));
    expect(jsx).not.toMatch(/Vetted treatment centers/i);
    expect(jsx).not.toMatch(/\.eq\(\s*["'`]verified["'`]/);
  });

  it("does not reintroduce the retired matching / advisor promises", () => {
    const code = read("src/components/home/TrustStrip.tsx");
    const jsx = code.slice(code.indexOf("const items"));
    expect(jsx).not.toMatch(/match time/i);
    expect(jsx).not.toMatch(/advisor/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("PUBLIC EDGE — get-public-facilities masks Free phone defensively", () => {
  const FN = "supabase/functions/get-public-facilities/index.ts";
  const src = read(FN);

  it("masks phone on the canonical is_pro projection", () => {
    expect(stripJsComments(src)).toMatch(/phone:\s*isPro\s*\?\s*f\.phone\s*:\s*null/);
  });

  it("resolves isPro with an exact === true test", () => {
    expect(stripJsComments(src)).toMatch(/const isPro\s*=\s*f\.is_pro === true/);
  });

  it("no longer carries the false 'the view masks phone/email/website' comment", () => {
    // That comment was actively harmful: it made a leaking endpoint read as
    // audited. It must not come back in any form that groups website with the
    // Pro-gated fields.
    expect(src).not.toMatch(
      /Pro-gated fields \(phone\/email\/website\) are masked\s*\n?\s*\/\/\s*to null by the/,
    );
  });

  it("does not Pro-gate website", () => {
    const code = stripJsComments(src);
    expect(code).not.toMatch(/website:\s*isPro\s*\?/);
    expect(code).toMatch(/website:\s*f\.website/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("PUBLIC EDGE — Featured never leaks a phone", () => {
  const FN = "supabase/functions/get-featured-rotation/index.ts";
  const src = read(FN);
  const code = stripJsComments(src);

  it("gates display_phone on canonical Pro entitlement", () => {
    expect(code).toMatch(/proFacilityIds\.has\(f\.facility_id\)/);
    expect(code).toMatch(/display_phone:/);
  });

  it("sources entitlement from the canonical projection, not a local re-derivation", () => {
    expect(code).toMatch(/from\("public_facilities"\)[\s\S]{0,120}is_pro/);
    // A hand-rolled tier/status/period check here would be a second definition
    // of "Pro" that can drift from has_active_pro().
    expect(code).not.toMatch(/tier\s*===?\s*["']pro["']/);
  });

  it("fails closed when entitlement cannot be resolved", () => {
    expect(code).toMatch(/return new Set\(\)/);
  });

  it("does not treat Featured or has_featured as a phone unlock", () => {
    const gate = code.slice(code.indexOf("display_phone:"), code.indexOf("position_in_rail"));
    expect(gate).not.toMatch(/featured/i);
    expect(gate).not.toMatch(/verified\b/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("FRONTEND — one shared, fail-closed phone rule", () => {
  const HELPER = "src/lib/facilityPhoneVisibility.ts";

  it("exists and gates on exactly `isPro === true`", () => {
    expect(existsSync(join(ROOT, HELPER))).toBe(true);
    const code = stripJsComments(read(HELPER));
    expect(code).toMatch(/if \(input\.isPro !== true\) return HIDDEN/);
  });

  it("never consults Featured, verified, or claim state", () => {
    const code = stripJsComments(read(HELPER));
    expect(code).not.toMatch(/featured|verified|is_claimed/i);
  });

  it("returns no display value and no tel: href when hidden", () => {
    const code = stripJsComments(read(HELPER));
    expect(code).toMatch(/const HIDDEN[^=]*=\s*\{\s*visible:\s*false,\s*display:\s*null,\s*telHref:\s*null\s*\}/);
  });

  it.each([
    ["src/components/cards/SearchResultCard.tsx"],
    ["src/components/cards/TreatmentCenterCard.tsx"],
    ["src/pages/Comparison.tsx"],
  ])("%s resolves its phone through the shared rule", (rel) => {
    const code = stripJsComments(read(rel));
    expect(code).toMatch(/resolvePublicFacilityPhone/);
    // No raw `tel:${...phone}` construction bypassing the rule.
    expect(code).not.toMatch(/href=\{`tel:\$\{[^}]*\.phone\}`\}/);
  });

  it("CenterProfile gates every phone surface on canonical is_pro", () => {
    const code = stripJsComments(read("src/pages/CenterProfile.tsx"));
    // Resolved through the shared rule, seeded from the canonical projection.
    expect(code).toMatch(/resolvePublicFacilityPhone\(\{[\s\S]{0,120}isPro:\s*facility\.is_pro/);
    expect(code).toMatch(/const showFacilityPhone = facilityPhone\.visible/);
    // Structured data must agree with the visible page.
    expect(code).toMatch(/phone:\s*showFacilityPhone \? facility\.phone : undefined/);
  });

  it("CenterProfile does not Pro-gate website or email", () => {
    const code = stripJsComments(read("src/pages/CenterProfile.tsx"));
    expect(code).toMatch(/showContactDetails && facility\.website/);
    expect(code).toMatch(/showContactDetails && facility\.email/);
  });

  it("the contact capability hook nulls phone unless Pro is confirmed", () => {
    const code = stripJsComments(read("src/hooks/useFacilityContactCapabilities.ts"));
    expect(code).toMatch(/const showPhone = data\.is_pro === true/);
    expect(code).toMatch(/phone:\s*showPhone \?\s*\(data\.phone \?\? null\)\s*:\s*null/);
  });

  it("the contact modal accepts no caller-supplied phone", () => {
    // A parent-provided phone was the path by which a stale/pre-migration
    // payload could put a Free number on screen.
    const src = read("src/components/profile/RequestInfoModal.tsx");
    // Scope to the `facility:` shape only. `prefillData.phone` is the SEEKER's
    // own callback number, which is optional-but-legitimate on every tier and
    // has nothing to do with the facility's published number.
    const facilityShape = src.slice(
      src.indexOf("  facility: {"),
      src.indexOf("  prefillData?:"),
    );
    expect(facilityShape.length, "could not locate the facility prop shape").toBeGreaterThan(0);
    expect(facilityShape).not.toMatch(/^\s*phone\??:/m);
    for (const rel of ["src/pages/CenterProfile.tsx", "src/components/cards/SearchResultCard.tsx"]) {
      const call = stripJsComments(read(rel));
      const modalCall = call.slice(call.indexOf("<RequestInfoModal"));
      expect(modalCall.slice(0, 600)).not.toMatch(/phone:/);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe("PRERENDER — static artifacts follow the same rule", () => {
  const GEN = "scripts/generate-facility-profiles-html.mjs";
  const code = stripJsComments(read(GEN));

  it("derives phone visibility from is_pro === true alone", () => {
    expect(code).toMatch(/facility\?\.is_pro === true/);
    expect(code).toMatch(/function phoneVisibilityMode/);
  });

  it("gates the visible phone line, the tel: CTA and JSON-LD telephone", () => {
    expect(code).toMatch(/isActivePro\(f\) && f\.phone/);
    expect(code).toMatch(/telephone:\s*\(isActivePro\(f\) && f\.phone\)/);
    expect(code).toMatch(/if \(isPro && f\.phone\)/);
  });

  it("emits an inquiry CTA for every eligible facility, not just Pro", () => {
    // The marker is a constant precisely so a second routing mode cannot be
    // introduced without changing the generator, the guard and the tests.
    expect(code).toMatch(/function inquiryRoutingMode\(\)\s*\{\s*return "facility";/);
  });

  it("does not tell a non-Pro reader to call a number it withholds", () => {
    const faq = code.slice(code.indexOf("function buildContactFaqAnswer"), code.indexOf("function renderContactCta"));
    expect(faq).toMatch(/const phone = isPro \? facility\.phone : null/);
  });
});
