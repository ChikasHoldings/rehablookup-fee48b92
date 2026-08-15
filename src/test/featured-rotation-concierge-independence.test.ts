/**
 * R1 — Featured rotation must not depend on Concierge.
 *
 * Stage 1 audit, Finding 1: `get-featured-rotation` selects its eligible pool
 * with a PostgREST filter equivalent to
 *
 *     has_featured.eq.true , has_concierge_partner.eq.true      (OR)
 *
 * on the embedded `facility_subscriptions` row. A later stage removes
 * Concierge. The failure mode we are guarding against is that removal work
 * touches this filter (or the underlying column) and Featured-only
 * subscribers silently vanish from every rotation on the site.
 *
 * These tests execute the REAL edge-function handler (see
 * `src/test/edge/loadEdgeFunction.ts`); only the Supabase network client is
 * substituted, with an in-memory PostgREST-alike that genuinely evaluates the
 * filter expression the function builds. That means the core contract below
 * keeps its meaning after the Concierge term is deleted from the filter —
 * a source-string assertion could not.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadEdgeFunction, setEdgeEnv, edgeRequest } from "./edge/loadEdgeFunction";
import { createFakeSupabase, type FakeSupabase } from "./edge/fakeSupabase";
import { __setCreateClient } from "./edge/stubs/supabase-js";

const FEATURED_ONLY_FACILITY = "11111111-1111-4111-8111-111111111111";
const CONCIERGE_ONLY_FACILITY = "22222222-2222-4222-8222-222222222222";
const NO_ADDON_FACILITY = "33333333-3333-4333-8333-333333333333";

function facilityRow(id: string, name: string) {
  return {
    id,
    name,
    slug: `${name.toLowerCase().replace(/\s+/g, "-")}`,
    city: "Austin",
    state: "TX",
    facility_type: "residential",
    description: "desc",
    logo_url: null,
    phone: "5125550123",
    verified_phone: "5125550123",
    has_facility_verified_contact: true,
    verified: true,
    sponsored_tagline: null,
    status: "approved",
  };
}

function placementRow(facilityId: string, activatedAt: string) {
  return {
    facility_id: facilityId,
    activated_at: activatedAt,
    active: true,
    placement_type: "state",
    placement_value: "texas",
  };
}

/**
 * @param subscriptions rows for facility_subscriptions. Pass rows WITHOUT the
 *   `has_concierge_partner` key to simulate the post-Stage-5 schema.
 */
function buildDb(subscriptions: Record<string, unknown>[]): FakeSupabase {
  return createFakeSupabase({
    tables: {
      featured_placements: [
        placementRow(FEATURED_ONLY_FACILITY, "2026-01-01T00:00:00Z"),
        placementRow(CONCIERGE_ONLY_FACILITY, "2026-01-02T00:00:00Z"),
        placementRow(NO_ADDON_FACILITY, "2026-01-03T00:00:00Z"),
      ],
      facilities: [
        facilityRow(FEATURED_ONLY_FACILITY, "Featured Only"),
        facilityRow(CONCIERGE_ONLY_FACILITY, "Concierge Only"),
        facilityRow(NO_ADDON_FACILITY, "No Addon"),
      ],
      facility_subscriptions: subscriptions,
      facility_services: [],
      facility_insurance: [],
      featured_impressions: [],
    },
    relations: {
      "featured_placements.facilities": {
        table: "facilities",
        fromColumn: "facility_id",
        toColumn: "id",
      },
      "featured_placements.facility_subscriptions": {
        table: "facility_subscriptions",
        fromColumn: "facility_id",
        toColumn: "facility_id",
      },
    },
    rpc: {
      get_facility_ratings_batch: () => [],
    },
  });
}

/** Current-schema subscription rows (Concierge column still present). */
function currentSchemaSubscriptions() {
  return [
    {
      facility_id: FEATURED_ONLY_FACILITY,
      has_featured: true,
      has_concierge_partner: false,
      status: "active",
    },
    {
      facility_id: CONCIERGE_ONLY_FACILITY,
      has_featured: false,
      has_concierge_partner: true,
      status: "active",
    },
    {
      facility_id: NO_ADDON_FACILITY,
      has_featured: false,
      has_concierge_partner: false,
      status: "active",
    },
  ];
}

async function callRotation(db: FakeSupabase, body: Record<string, unknown> = {}) {
  __setCreateClient(() => db);
  const handler = await loadEdgeFunction("get-featured-rotation");
  const res = await handler(
    edgeRequest({
      placement_type: "state",
      placement_value: "texas",
      slot_count: 10,
      seed: 0,
      log_impressions: false,
      ...body,
    }),
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

function returnedFacilityIds(json: Record<string, unknown>): string[] {
  const facilities = (json.facilities ?? []) as { facility_id: string }[];
  return facilities.map((f) => f.facility_id);
}

describe("R1 — Featured rotation eligibility is independent of Concierge", () => {
  beforeEach(() => {
    setEdgeEnv({
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    });
  });

  afterEach(() => {
    __setCreateClient(null);
  });

  it("returns a facility holding ONLY the Featured add-on (no Concierge entitlement)", async () => {
    const { status, json } = await callRotation(buildDb(currentSchemaSubscriptions()));

    expect(status).toBe(200);
    // The contract: Featured alone is sufficient to appear in rotation.
    expect(returnedFacilityIds(json)).toContain(FEATURED_ONLY_FACILITY);
    expect(json.is_fallback).toBe(false);
  });

  it("excludes a facility with no add-on at all (the paywall still holds)", async () => {
    const { json } = await callRotation(buildDb(currentSchemaSubscriptions()));
    expect(returnedFacilityIds(json)).not.toContain(NO_ADDON_FACILITY);
  });

  it("excludes a Featured holder whose subscription is not active", async () => {
    const subs = currentSchemaSubscriptions();
    subs[0] = { ...subs[0], status: "past_due" };
    const { json } = await callRotation(buildDb(subs));
    expect(returnedFacilityIds(json)).not.toContain(FEATURED_ONLY_FACILITY);
  });

  it("still serves the Featured-only facility when it is the ONLY eligible subscriber", async () => {
    // The post-Concierge-removal steady state: nobody holds Concierge.
    const subs = [
      {
        facility_id: FEATURED_ONLY_FACILITY,
        has_featured: true,
        has_concierge_partner: false,
        status: "active",
      },
    ];
    const { status, json } = await callRotation(buildDb(subs));

    expect(status).toBe(200);
    expect(returnedFacilityIds(json)).toEqual([FEATURED_ONLY_FACILITY]);
    expect(json.pool_size).toBe(1);
    expect(json.is_fallback).toBe(false);
  });

  it("does not fall back to top-rated when a paid Featured-only subscriber exists", async () => {
    // Guards a subtle regression: if the eligibility filter broke, the pool
    // would be empty and the function would quietly serve ORGANIC results
    // labelled is_fallback — paid subscribers would lose their placement
    // without any error surfacing.
    const subs = [
      {
        facility_id: FEATURED_ONLY_FACILITY,
        has_featured: true,
        has_concierge_partner: false,
        status: "active",
      },
    ];
    const { json } = await callRotation(buildDb(subs), { fallback_to_top_rated: true });

    expect(json.is_fallback).toBe(false);
    expect(returnedFacilityIds(json)).toEqual([FEATURED_ONLY_FACILITY]);
  });

  /**
   * TEMPORARY CHARACTERIZATION — delete once Stage 5 removes the Concierge
   * term from the eligibility filter.
   *
   * Proves the Stage 1 audit's ordering constraint is real: while the filter
   * still names `has_concierge_partner`, dropping that column from
   * `facility_subscriptions` makes the pool query error out (PostgREST 42703)
   * and the endpoint 500s — i.e. Featured goes dark site-wide.
   *
   * The safe order is therefore: edit the filter FIRST, deploy, then drop the
   * column. When the filter no longer references the column this test will
   * start failing, which is the signal to remove it.
   */
  it("[characterization] dropping has_concierge_partner before editing the filter breaks the pool query", async () => {
    const subsWithoutConciergeColumn = [
      {
        facility_id: FEATURED_ONLY_FACILITY,
        has_featured: true,
        status: "active",
        // has_concierge_partner intentionally absent — simulates the dropped column
      },
    ];
    const { status, json } = await callRotation(buildDb(subsWithoutConciergeColumn));

    expect(status).toBe(500);
    expect(json.code).toBe("pool_fetch_failed");
  });
});
