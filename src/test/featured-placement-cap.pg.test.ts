// @vitest-environment node
/**
 * R2 — Featured placement paywall + slot cap.
 *
 * Stage 1 audit, Finding 2: `enforce_featured_placement_cap()` authorises a
 * placement activation when the facility's subscription is active AND
 *
 *     has_featured = true  OR  has_concierge_partner = true
 *
 * Stage 5 removes the Concierge half. The regression risk is that the edit
 * takes the whole `EXISTS (...)` guard with it — either opening the paywall
 * (anyone can self-activate paid placements) or closing it on legitimate
 * Featured subscribers.
 *
 * This runs the REAL trigger function, extracted verbatim from the newest
 * migration that defines it, inside an in-process Postgres (PGlite). No
 * mocking: the assertions below are the actual behaviour of the shipped
 * PL/pgSQL. If a future migration changes the function, this test picks the
 * new definition up automatically.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(__dirname, "../../supabase/migrations");

/**
 * Return the body of the LAST migration (by filename order, which is
 * chronological) that defines `functionName`, so the test always exercises the
 * definition currently in production.
 */
function extractLatestFunctionSql(functionName: string): string {
  const needle = `CREATE OR REPLACE FUNCTION public.${functionName}`;
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let found: string | null = null;
  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    const start = sql.indexOf(needle);
    if (start === -1) continue;
    // Body is delimited by a dollar-quoted tag ($function$ or $$).
    const tagMatch = /AS\s+(\$[a-zA-Z_]*\$)/.exec(sql.slice(start));
    if (!tagMatch) continue;
    const tag = tagMatch[1];
    const bodyStart = start + (tagMatch.index ?? 0) + tagMatch[0].length;
    const end = sql.indexOf(tag, bodyStart);
    if (end === -1) continue;
    found = sql.slice(start, end + tag.length) + ";";
  }

  if (!found) {
    throw new Error(
      `[test] could not locate a definition of ${functionName}() in supabase/migrations. ` +
        `If the function was renamed or removed, this regression test must be updated deliberately.`,
    );
  }
  return found;
}

const FEATURED_ONLY = "11111111-1111-4111-8111-111111111111";
const CONCIERGE_ONLY = "22222222-2222-4222-8222-222222222222";
const NO_ADDON = "33333333-3333-4333-8333-333333333333";
const PAST_DUE_FEATURED = "44444444-4444-4444-8444-444444444444";

let db: PGlite;

/** Minimal schema the trigger touches. Column types mirror the live tables. */
const SCHEMA_SQL = `
CREATE TABLE public.facility_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  tier text,
  has_featured boolean NOT NULL DEFAULT false,
  has_concierge_partner boolean NOT NULL DEFAULT false
);

CREATE TABLE public.placement_caps (
  placement_type text NOT NULL,
  placement_value text NOT NULL,
  max_slots integer NOT NULL,
  PRIMARY KEY (placement_type, placement_value)
);

CREATE TABLE public.featured_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL,
  subscription_id uuid,
  placement_type text NOT NULL,
  placement_value text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  activated_at timestamptz DEFAULT now(),
  deactivated_at timestamptz
);
`;

async function insertPlacement(
  facilityId: string,
  opts: { type?: string; value?: string; active?: boolean } = {},
) {
  return db.query(
    `INSERT INTO public.featured_placements (facility_id, placement_type, placement_value, active)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [facilityId, opts.type ?? "state", opts.value ?? "texas", opts.active ?? true],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SCHEMA_SQL);
  await db.exec(extractLatestFunctionSql("enforce_featured_placement_cap"));
  await db.exec(
    `CREATE TRIGGER trg_enforce_featured_placement_cap
       BEFORE INSERT OR UPDATE ON public.featured_placements
       FOR EACH ROW EXECUTE FUNCTION public.enforce_featured_placement_cap();`,
  );
  await db.exec(extractLatestFunctionSql("get_placement_availability"));
});

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec("DELETE FROM public.featured_placements;");
  await db.exec("DELETE FROM public.facility_subscriptions;");
  await db.exec("DELETE FROM public.placement_caps;");
  await db.query(
    `INSERT INTO public.facility_subscriptions (facility_id, status, tier, has_featured, has_concierge_partner)
     VALUES ($1,'active','pro',true,false),
            ($2,'active','pro',false,true),
            ($3,'active','pro',false,false),
            ($4,'past_due','pro',true,false)`,
    [FEATURED_ONLY, CONCIERGE_ONLY, NO_ADDON, PAST_DUE_FEATURED],
  );
  await db.query(
    `INSERT INTO public.placement_caps (placement_type, placement_value, max_slots)
     VALUES ('state','texas',3)`,
  );
});

describe("R2 — enforce_featured_placement_cap(): Featured entitlement alone is sufficient", () => {
  it("ALLOWS a facility holding only the Featured add-on to activate a placement", async () => {
    // The core contract. No Concierge anywhere in this fixture.
    await expect(insertPlacement(FEATURED_ONLY)).resolves.toBeDefined();

    const { rows } = await db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM public.featured_placements WHERE facility_id = $1 AND active",
      [FEATURED_ONLY],
    );
    expect(rows[0].n).toBe(1);
  });

  it("REJECTS a facility with neither Featured nor any other permitted entitlement", async () => {
    await expect(insertPlacement(NO_ADDON)).rejects.toThrow(
      /Featured add-on is not active for this facility/,
    );
  });

  it("REJECTS a Featured holder whose subscription status is not active", async () => {
    // Matches the active-only display gate in get-featured-rotation, so a
    // stale flag on a past_due row cannot activate an invisible placement.
    await expect(insertPlacement(PAST_DUE_FEATURED)).rejects.toThrow(
      /Featured add-on is not active for this facility/,
    );
  });

  it("enforces the per-bucket slot cap from placement_caps", async () => {
    await db.query(
      `UPDATE public.placement_caps SET max_slots = 1 WHERE placement_type='state' AND placement_value='texas'`,
    );
    await insertPlacement(FEATURED_ONLY);

    // A second active row in the same bucket exceeds max_slots = 1.
    await db.query(
      `INSERT INTO public.facility_subscriptions (facility_id, status, tier, has_featured, has_concierge_partner)
       VALUES ('55555555-5555-4555-8555-555555555555','active','pro',true,false)`,
    );
    await expect(
      insertPlacement("55555555-5555-4555-8555-555555555555"),
    ).rejects.toThrow(/Featured slot cap reached/);
  });

  it("frees a slot when a placement is deactivated", async () => {
    await db.query(
      `UPDATE public.placement_caps SET max_slots = 1 WHERE placement_type='state' AND placement_value='texas'`,
    );
    await insertPlacement(FEATURED_ONLY);
    await db.query(
      `UPDATE public.featured_placements SET active = false WHERE facility_id = $1`,
      [FEATURED_ONLY],
    );

    await db.query(
      `INSERT INTO public.facility_subscriptions (facility_id, status, tier, has_featured, has_concierge_partner)
       VALUES ('55555555-5555-4555-8555-555555555555','active','pro',true,false)`,
    );
    await expect(
      insertPlacement("55555555-5555-4555-8555-555555555555"),
    ).resolves.toBeDefined();
  });

  it("does not require Concierge fixtures anywhere in the allowed path", async () => {
    // Explicitly delete every Concierge-holding subscription, then prove the
    // Featured-only activation still succeeds. This is the Stage 5 steady
    // state rehearsed ahead of time.
    await db.query("DELETE FROM public.facility_subscriptions WHERE has_concierge_partner = true");
    await expect(insertPlacement(FEATURED_ONLY)).resolves.toBeDefined();
  });

  /**
   * TEMPORARY CHARACTERIZATION — remove when Stage 5 drops the Concierge term.
   * Documents that Concierge currently also opens the paywall, so the Stage 5
   * edit is a deliberate behaviour change rather than a no-op refactor.
   */
  it("[characterization] Concierge Partner currently also satisfies the paywall", async () => {
    await expect(insertPlacement(CONCIERGE_ONLY)).resolves.toBeDefined();
  });
});

describe("R2b — get_placement_availability() (Featured cap RPC) is Concierge-free", () => {
  it("reports cap/used/remaining from placement_caps and active featured_placements", async () => {
    await insertPlacement(FEATURED_ONLY);

    const { rows } = await db.query<{ cap: number; used: number; remaining: number }>(
      "SELECT * FROM public.get_placement_availability('state','texas')",
    );
    expect(rows[0]).toEqual({ cap: 3, used: 1, remaining: 2 });
  });

  it("falls back to a type-level default cap for an unseeded bucket", async () => {
    const { rows } = await db.query<{ cap: number; used: number; remaining: number }>(
      "SELECT * FROM public.get_placement_availability('state','nevada')",
    );
    // GREATEST(5, AVG(max_slots)) over the seeded 'state' caps.
    expect(rows[0].cap).toBeGreaterThanOrEqual(5);
    expect(rows[0].used).toBe(0);
  });
});
