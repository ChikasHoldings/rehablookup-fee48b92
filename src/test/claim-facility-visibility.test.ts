import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Provider claim funnel — facility visibility contract.
 *
 * Two defects this locks down, both of which stranded providers mid-claim:
 *
 * 1. public_facilities hid a facility from its OWN claimant.
 *    20260829004900 added an unconditional
 *      NOT EXISTS (claim on this facility with status pending/under_review)
 *    to hide listings under review from the public directory. But the whole
 *    claim flow reads the facility through this same view (useFacilityBySlug,
 *    BuildStep, useSeedFacility, AccountStep, Onboarding deep links), so
 *    ClaimWizard step 2 — which creates that very claim row — made the
 *    facility vanish for the claimant. React Query masked it for the rest of
 *    that session; on refresh or on return (doc review takes 1-2 business
 *    days) the wizard dead-ended with "We couldn't find this facility".
 *
 * 2. search_provider_facilities.is_claimed required claimed_at.
 *    claimed_at is written only by the claim-approval trigger, so a
 *    provider-CREATED listing (user_id set, claimed_at NULL) reported
 *    is_claimed = false. It rendered as selectable in FindOrListStep, passed
 *    the click guard, advanced the wizard to build/claim — and ClaimWizard
 *    then read is_claimed = true from public_facilities and rendered the
 *    terminal "already claimed" card, whose only action looped straight back.
 *
 * These are SQL-layer invariants, so we assert against the latest migration
 * that defines each object — the same style as provider-leads-masking.test.ts,
 * which pins a DB contract from the test suite.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

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

/**
 * Strip `--` line comments, then collapse whitespace, so assertions describe
 * EXECUTABLE SQL only and survive reformatting. Without the comment strip, a
 * migration that documents the predicate it removed would still "contain" it.
 */
function normalize(sql: string): string {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

describe("public_facilities — visible to the facility's own claimant", () => {
  const migration = latestMigrationMatching(
    /create (or replace )?view public\.public_facilities/i,
  );
  const sql = normalize(migration.sql);

  it("still hides facilities under an active claim from everyone else", () => {
    expect(sql).toContain("facility_claim_requests");
    expect(sql).toContain("'pending', 'under_review'");
  });

  it("exempts the caller's own claim so the wizard can resume", () => {
    // Without a claimant_user_id = auth.uid() escape, the exclusion applies to
    // the claimant too and their own in-flight facility disappears.
    expect(sql).toMatch(/fcr\.claimant_user_id = \(select auth\.uid\(\)\)/);
  });

  it("keeps the approved + non-suspended public gate intact", () => {
    expect(sql).toContain("status = 'approved'");
    expect(sql).toContain("coalesce(suspended, false) = false");
  });

  it("still masks Pro-only fields behind has_active_pro", () => {
    // The visibility fix recreates the whole view, so a copy/paste slip here
    // would silently un-gate Pro content for anonymous visitors.
    expect(sql).toContain("has_active_pro(id)");
    expect(sql).toMatch(/case when has_active_pro\(id\) then verified else false end/);
  });
});

describe("search_provider_facilities — canonical is_claimed", () => {
  const migration = latestMigrationMatching(
    /create or replace function public\.search_provider_facilities/i,
  );
  const sql = normalize(migration.sql);

  it("treats ownership alone as claimed", () => {
    expect(sql).toContain("(f.user_id is not null) as is_claimed");
  });

  it("does not require claimed_at, which only claim approval ever sets", () => {
    // The exact predicate that mislabelled provider-created listings as
    // claimable and walked users into the dead-end card.
    expect(sql).not.toContain("f.user_id is not null and f.claimed_at is not null");
  });

  it("matches the definition public_facilities exposes", () => {
    const view = normalize(
      latestMigrationMatching(/create (or replace )?view public\.public_facilities/i).sql,
    );
    expect(view).toContain("user_id is not null as is_claimed");
  });
});
