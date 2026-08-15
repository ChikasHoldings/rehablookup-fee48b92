/**
 * R6 — TEMPORARY CHARACTERIZATION — replace when Concierge routing is removed.
 *
 * ============================================================================
 * THIS TEST DOES NOT DESCRIBE DESIRED ARCHITECTURE. It pins down what
 * `submit-qualified-lead` does TODAY so the next stage can replace the
 * Free-tier destination deliberately instead of dropping seeker inquiries by
 * accident.
 * ============================================================================
 *
 * Stage 1 audit, Finding 6 (and the single highest-risk finding in the audit):
 * every inquiry submitted against a NON-Pro facility is persisted into
 * `concierge_inquiries` with `routing_mode = 'free_tier_redirect'`, not into
 * `leads`. With `facility_subscriptions` currently empty, that is 100% of
 * inbound seeker volume. Deleting the Concierge tables before a replacement
 * destination exists would silently destroy the site's entire lead pipeline.
 *
 * The invariants asserted here are the ones that must remain true no matter
 * what the destination becomes:
 *   1. an inquiry is never silently discarded;
 *   2. the Pro / non-Pro fork is deterministic and server-decided;
 *   3. the Free-tier destination is persisted durably before responding;
 *   4. no path returns success while failing to save the inquiry.
 *
 * Invariants 1-4 should be carried over to the replacement routing. Only the
 * table name should change.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadEdgeFunction, setEdgeEnv, edgeRequest } from "./edge/loadEdgeFunction";
import { createFakeSupabase, type FakeSupabase, type FakeSupabaseOptions } from "./edge/fakeSupabase";
import { __setCreateClient } from "./edge/stubs/supabase-js";
import { __resetResend } from "./edge/stubs/resend";

const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const SEEKER_EMAIL = "seeker@example.com";

function baseTables(): Record<string, Record<string, unknown>[]> {
  return {
    facilities: [
      {
        id: FACILITY_ID,
        name: "Cedar Ridge Recovery",
        email: "admissions@cedar.example",
        claim_email: "claims@cedar.example",
        user_id: "owner-user-id",
        status: "approved",
        suspended: false,
        slug: "cedar-ridge-recovery",
        reply_email: null,
        reply_email_verified: false,
      },
    ],
    leads: [],
    concierge_inquiries: [],
    concierge_case_events: [],
    admin_notifications: [],
    admin_user_profiles: [],
    notification_preferences: [],
    profiles: [],
    provider_notifications: [],
    notification_events: [],
    email_tracking_events: [],
    email_send_failures: [],
    suppressed_emails: [],
    lead_distributions: [],
  };
}

function makeDb(
  isPro: boolean,
  overrides: Partial<FakeSupabaseOptions> = {},
): FakeSupabase {
  return createFakeSupabase({
    tables: baseTables(),
    rpc: {
      has_active_pro: () => isPro,
      is_identifier_blocked: () => false,
      is_email_verified: () => true,
      ...(overrides.rpc ?? {}),
    },
    ...overrides,
    // `tables` above must win over a partial override unless explicitly given.
    ...(overrides.tables ? { tables: overrides.tables } : {}),
  });
}

function inquiryBody(extra: Record<string, unknown> = {}) {
  return {
    facilityId: FACILITY_ID,
    name: "Jamie Rivera",
    email: SEEKER_EMAIL,
    phone: "5125550123",
    message: "Looking for help with detox.",
    levelOfCare: "detox",
    urgency: "immediate",
    locationCityState: "Austin, TX",
    insuranceProvider: "Aetna",
    source: "facility_profile",
    ...extra,
  };
}

async function submit(db: FakeSupabase, body: Record<string, unknown> = inquiryBody()) {
  __setCreateClient(() => db);
  const handler = await loadEdgeFunction("submit-qualified-lead");
  const res = await handler(edgeRequest(body));
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json };
}

describe("R6 [TEMPORARY CHARACTERIZATION] — Free-tier inquiry routing", () => {
  beforeEach(() => {
    __resetResend();
    setEdgeEnv({
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "srk",
      SUPABASE_ANON_KEY: "anon",
      RESEND_API_KEY: "re_test",
    });
  });

  afterEach(() => {
    __setCreateClient(null);
  });

  it("routes a NON-Pro facility's inquiry into concierge_inquiries, not leads", async () => {
    const db = makeDb(false);
    const { status, json } = await submit(db);

    expect(status).toBe(200);
    expect(json.routing_mode).toBe("free_tier_redirect");
    expect(json.inquiry_id).toBeTruthy();

    // Durably persisted in the current destination…
    expect(db.tables.concierge_inquiries).toHaveLength(1);
    const row = db.tables.concierge_inquiries[0];
    expect(row.routing_mode).toBe("free_tier_redirect");
    expect(row.originating_facility_id).toBe(FACILITY_ID);
    expect(row.status).toBe("pending_intake");
    expect(row.user_email).toBe(SEEKER_EMAIL);

    // …and NOT delivered as a provider lead.
    expect(db.tables.leads).toHaveLength(0);
  });

  it("routes an ACTIVE-Pro facility's inquiry into leads, not concierge_inquiries", async () => {
    const db = makeDb(true);
    const { status } = await submit(db);

    expect(status).toBe(200);
    expect(db.tables.leads.length).toBeGreaterThanOrEqual(1);
    expect(db.tables.leads[0].facility_id).toBe(FACILITY_ID);
    expect(db.tables.concierge_inquiries).toHaveLength(0);
  });

  it("decides the fork server-side via has_active_pro(), ignoring client-supplied hints", async () => {
    // A client claiming the facility is Pro must not change the destination.
    const db = makeDb(false);
    await submit(db, inquiryBody({ tier: "pro", isPro: true, has_active_pro: true }));

    expect(db.tables.concierge_inquiries).toHaveLength(1);
    expect(db.tables.leads).toHaveLength(0);
  });

  it("fails safe to the Free-tier destination when has_active_pro() errors", async () => {
    // Never deliver a raw lead to a facility we cannot confirm is entitled.
    const db = createFakeSupabase({
      tables: baseTables(),
      rpc: { is_identifier_blocked: () => false, is_email_verified: () => true },
      rpcErrors: { has_active_pro: { message: "connection reset" } },
    });
    const { status, json } = await submit(db);

    expect(status).toBe(200);
    expect(json.routing_mode).toBe("free_tier_redirect");
    expect(db.tables.concierge_inquiries).toHaveLength(1);
    expect(db.tables.leads).toHaveLength(0);
  });

  it("NEVER reports success when the inquiry could not be persisted", async () => {
    // The invariant that must survive the routing rewrite: a seeker in crisis
    // must not see a confirmation for an inquiry that was dropped.
    const db = createFakeSupabase({
      tables: baseTables(),
      rpc: {
        has_active_pro: () => false,
        is_identifier_blocked: () => false,
        is_email_verified: () => true,
      },
      insertErrors: {
        concierge_inquiries: { message: "insert failed", code: "XX000" },
      },
    });
    const { status, json } = await submit(db);

    expect(status).toBe(500);
    expect(json.success).not.toBe(true);
    expect(db.tables.concierge_inquiries).toHaveLength(0);
  });

  it("returns a confirmation path the seeker UI can navigate to", async () => {
    const db = makeDb(false);
    const { json } = await submit(db);
    const inquiryId = db.tables.concierge_inquiries[0].id ?? json.inquiry_id;

    expect(json.confirmation_path).toBe(`/inquiry/confirmation/${inquiryId}`);
  });

  it("notifies the Free-tier facility of the redirect (the Pro upsell touchpoint)", async () => {
    // This notification is the mechanic that converts Free → Pro. Whatever
    // replaces Concierge routing must keep an equivalent provider touchpoint,
    // or the Pro funnel loses its primary driver.
    const db = makeDb(false);
    await submit(db);

    const notify = db.invocations.find(
      (i) => i.name === "notify-free-tier-inquiry-redirect",
    );
    expect(notify).toBeDefined();
    expect((notify?.body as Record<string, unknown>).facility_id).toBe(FACILITY_ID);
  });

  it("rejects an inquiry for an unapproved facility before any routing decision", async () => {
    const tables = baseTables();
    tables.facilities[0].status = "pending";
    const db = createFakeSupabase({
      tables,
      rpc: {
        has_active_pro: () => false,
        is_identifier_blocked: () => false,
        is_email_verified: () => true,
      },
    });
    const { status } = await submit(db);

    expect(status).toBe(400);
    expect(db.tables.concierge_inquiries).toHaveLength(0);
    expect(db.tables.leads).toHaveLength(0);
  });
});
