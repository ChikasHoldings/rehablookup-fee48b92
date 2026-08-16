// @vitest-environment node
//
// Runs in the node environment (not the suite-wide jsdom default): the edge
// function is transpiled with esbuild, which asserts that `TextEncoder`
// produces a real `Uint8Array` — jsdom's cross-realm typed arrays break that
// invariant. The handler itself only needs fetch-API globals, which Node has.
/**
 * `submit-qualified-lead` — SELECTED-FACILITY INQUIRY CONTRACT (v3.1.0).
 *
 * These tests execute the REAL edge-function handler in-process (see
 * helpers/edgeFunctionHarness.ts) against recording stubs, so they prove
 * behaviour and ordering rather than the presence of source strings.
 *
 * WHAT CHANGED, AND WHY THESE TESTS WERE REWRITTEN
 * ────────────────────────────────────────────────
 * The previous suite asserted the OLD product: Pro facilities received
 * inquiries and everyone else got DIRECT_CONTACT_REQUIRED with nothing
 * persisted. That behaviour is intentionally gone, so those tests were not
 * "fixed" — they were replaced. Keeping them green would have meant keeping
 * the old behaviour.
 *
 * THE CONTRACT NOW
 *   • ANY approved, non-suspended facility may receive an inquiry. Pro,
 *     Free, Featured-only and unclaimed are all eligible, on identical terms.
 *   • Entitlement does not appear in the eligibility decision at all.
 *   • Every inquiry is pinned to `leads.facility_id` = the selected facility.
 *     Never a second facility, never Concierge, never an advisor, never a
 *     redistribution queue.
 *   • An UNCLAIMED listing has no verified recipient, so the inquiry is
 *     stored but NO PII is emailed anywhere, and the seeker is told the
 *     truth via deliveryState="stored_pending_claim".
 *   • Rejections for missing/unapproved/suspended facilities still happen
 *     BEFORE any PII-dependent processing.
 */
import { describe, it, expect } from "vitest";
import { loadEdgeHandler, postJson, type SupabaseStubOptions } from "./helpers/edgeFunctionHarness";

const FN = "supabase/functions/submit-qualified-lead/index.ts";

const PRO_FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const FREE_FACILITY_ID = "22222222-2222-4222-8222-222222222222";
const FEATURED_FACILITY_ID = "33333333-3333-4333-8333-333333333333";
const UNCLAIMED_FACILITY_ID = "44444444-4444-4444-8444-444444444444";
const UNKNOWN_FACILITY_ID = "55555555-5555-4555-8555-555555555555";

/** Tables/functions only the retired concierge/placement product ever touched. */
const CONCIERGE_TABLES = ["concierge_inquiries", "concierge_case_events", "concierge_introductions"];
const ADVISOR_TABLES = ["admin_user_profiles"];
const REDISTRIBUTION_TABLES = ["lead_distributions"];
const RETIRED_FUNCTIONS = [
  "notify-free-tier-inquiry-redirect",
  "process-lead-redistribution",
  "match-concierge-intake",
  "send-concierge-introduction",
];

interface FacilityShape {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
  status: string;
  suspended: boolean;
  reply_email: string | null;
  reply_email_verified: boolean;
}

function facilityRow(over: Partial<FacilityShape> & { id: string; name: string }): FacilityShape {
  return {
    email: "admissions@example.org",
    user_id: "owner-1",
    status: "approved",
    suspended: false,
    reply_email: null,
    reply_email_verified: false,
    ...over,
  };
}

interface ScenarioOptions {
  facility?: FacilityShape | null;
  facilityError?: { message: string } | null;
  isPro?: boolean;
  emailVerified?: boolean;
  blocked?: boolean;
  existingLeadCount?: number;
  idempotentHit?: { id: string } | null;
}

function buildStubOptions(scenario: ScenarioOptions = {}): SupabaseStubOptions {
  const facility =
    scenario.facility === undefined
      ? facilityRow({ id: PRO_FACILITY_ID, name: "Cascadia Recovery Center" })
      : scenario.facility;

  return {
    onRpc: (name) => {
      // has_active_pro may or may not be called — the point of 3.1.0 is that
      // eligibility does not depend on it. Answer honestly if asked.
      if (name === "has_active_pro") return { data: scenario.isPro ?? false, error: null };
      if (name === "is_identifier_blocked") return { data: scenario.blocked ?? false, error: null };
      if (name === "is_email_verified") return { data: scenario.emailVerified ?? true, error: null };
      return { data: null, error: null };
    },
    onSelect: (table) => {
      if (table === "facilities") {
        if (scenario.facilityError) return { data: null, error: scenario.facilityError };
        return { data: facility, error: null };
      }
      if (table === "leads") {
        if (scenario.idempotentHit) return { data: scenario.idempotentHit, error: null, count: 0 };
        return { data: null, error: null, count: scenario.existingLeadCount ?? 0 };
      }
      if (table === "notification_preferences") return { data: null, error: null };
      if (table === "profiles") return { data: { email: "owner@example.org" }, error: null };
      return { data: null, error: null, count: 0 };
    },
    onInsert: (table) => {
      if (table === "leads") return { data: { id: "lead-123" }, error: null };
      return { data: { id: `${table}-row` }, error: null };
    },
  };
}

/** A complete, valid seeker payload. */
function seekerPayload(facilityId: string, over: Record<string, unknown> = {}) {
  return {
    facilityId,
    name: "Jordan Rivera",
    firstName: "Jordan",
    lastName: "Rivera",
    email: "jordan.rivera@example.com",
    phone: "5035550142",
    preferredContact: "call",
    urgency: "immediate",
    levelOfCare: "residential",
    insuranceType: "private",
    locationCityState: "Portland, OR",
    source: "facility_profile",
    idempotencyKey: "idem-abc-123",
    ...over,
  };
}

/** Assert the request produced no placement-era side effects of any kind. */
function expectNoLegacyRouting(supabase: {
  insertedTables(): string[];
  selectedTables(): string[];
  invokedFunctions(): string[];
}) {
  for (const table of [...CONCIERGE_TABLES, ...ADVISOR_TABLES, ...REDISTRIBUTION_TABLES]) {
    expect(supabase.insertedTables()).not.toContain(table);
    expect(supabase.selectedTables()).not.toContain(table);
  }
  for (const fn of RETIRED_FUNCTIONS) {
    expect(supabase.invokedFunctions()).not.toContain(fn);
  }
}

const leadInsertOf = (supabase: { calls: Array<{ kind: string; target: string; payload?: unknown }> }) =>
  supabase.calls.find((c) => c.kind === "insert" && c.target === "leads");

describe("submit-qualified-lead — universal selected-facility inquiries", () => {
  // ── CASE A — CLAIMED FREE FACILITY ──────────────────────────────────────
  describe("CASE A — claimed Free (non-Pro) facility", () => {
    const scenario = () =>
      buildStubOptions({
        isPro: false,
        facility: facilityRow({
          id: FREE_FACILITY_ID,
          name: "Riverbend Wellness",
          user_id: "owner-2",
        }),
      });

    it("accepts the inquiry and pins it to the selected facility", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, scenario());
      const { status, json } = await postJson(handler, seekerPayload(FREE_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.success).toBe(true);
      // The whole point of the amendment: NOT a direct-contact refusal.
      expect(json.action).toBeUndefined();
      expect(json.direct_contact_required).toBeUndefined();

      const insert = leadInsertOf(supabase);
      expect(insert, "no inquiry row was inserted for a Free facility").toBeTruthy();
      expect((insert!.payload as Record<string, unknown>).facility_id).toBe(FREE_FACILITY_ID);
    });

    it("reports delivery to the provider and notifies them", async () => {
      const { handler, supabase, emails } = await loadEdgeHandler(FN, scenario());
      const { json } = await postJson(handler, seekerPayload(FREE_FACILITY_ID));

      expect(json.deliveryState).toBe("delivered_to_provider");
      expect(supabase.selectedTables()).toContain("notification_preferences");
      expect(emails.length).toBeGreaterThan(0);
    });

    it("creates exactly one inquiry row and no second destination", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, scenario());
      await postJson(handler, seekerPayload(FREE_FACILITY_ID));

      const leadInserts = supabase.calls.filter((c) => c.kind === "insert" && c.target === "leads");
      expect(leadInserts).toHaveLength(1);
      expectNoLegacyRouting(supabase);
    });

    it("uses inquiry language, not lead-sale language, in the provider email", async () => {
      const { handler, emails } = await loadEdgeHandler(FN, scenario());
      await postJson(handler, seekerPayload(FREE_FACILITY_ID));

      const providerEmail = emails.find((e) => JSON.stringify(e.to).includes("owner@example.org"));
      expect(providerEmail, "provider was not notified").toBeTruthy();
      const html = String(providerEmail!.html ?? "");

      expect(html).toMatch(/inquiry/i);
      expect(html).toMatch(/View inquiry/i);
      // Retired sales-era copy.
      expect(html).not.toMatch(/View lead in dashboard/i);
      expect(html).not.toMatch(/7×|7x more leads/i);
      expect(html).not.toMatch(/convert up to/i);
      expect(html).not.toMatch(/buy lead|purchase this lead|unlock/i);
      // Must not imply RehabLookup chose this facility.
      expect(html).not.toMatch(/Connecting families with quality care/i);
    });
  });

  // ── CASE B — ACTIVE PRO ─────────────────────────────────────────────────
  describe("CASE B — active Pro facility", () => {
    it("stores the inquiry with identical semantics — no priority lane", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, buildStubOptions({ isPro: true }));
      const { status, json } = await postJson(handler, seekerPayload(PRO_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.deliveryState).toBe("delivered_to_provider");

      const insert = leadInsertOf(supabase);
      expect((insert!.payload as Record<string, unknown>).facility_id).toBe(PRO_FACILITY_ID);

      // No Pro-only routing field, queue, or escalation.
      const payload = insert!.payload as Record<string, unknown>;
      expect(payload.routing_mode).toBeUndefined();
      expect(payload.priority_tier).toBeUndefined();
      expectNoLegacyRouting(supabase);
    });

    it("never publishes a facility phone number in its response", async () => {
      const { handler } = await loadEdgeHandler(FN, buildStubOptions({ isPro: true }));
      const { json } = await postJson(handler, seekerPayload(PRO_FACILITY_ID));
      // Phone visibility is a READ-path concern; this function must not
      // become a side channel for it on any tier.
      expect(JSON.stringify(json)).not.toMatch(/"phone"/);
    });
  });

  // ── CASE C — FEATURED, NOT PRO ──────────────────────────────────────────
  describe("CASE C — Featured add-on but NOT Pro", () => {
    it("accepts the inquiry exactly like Free, with no Pro-shaped distinction", async () => {
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({
          isPro: false,
          facility: facilityRow({
            id: FEATURED_FACILITY_ID,
            name: "Beacon Ridge Treatment",
            user_id: "owner-3",
          }),
        }),
      );

      const { status, json } = await postJson(handler, seekerPayload(FEATURED_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.action).toBeUndefined();

      const insert = leadInsertOf(supabase);
      expect((insert!.payload as Record<string, unknown>).facility_id).toBe(FEATURED_FACILITY_ID);
      expectNoLegacyRouting(supabase);
    });
  });

  // ── CASE D — UNCLAIMED ──────────────────────────────────────────────────
  describe("CASE D — approved but UNCLAIMED listing (no verified recipient)", () => {
    const unclaimed = () =>
      buildStubOptions({
        isPro: false,
        facility: facilityRow({
          id: UNCLAIMED_FACILITY_ID,
          name: "Tony Rice Center, INC",
          // The hazard: a populated but UNVERIFIED email from a SAMHSA import.
          email: "scraped-contact@unverified.example",
          user_id: null,
        }),
      });

    it("stores the inquiry pinned to that facility", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, unclaimed());
      const { status, json } = await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.success).toBe(true);
      const insert = leadInsertOf(supabase);
      expect(insert, "unclaimed inquiry was not persisted").toBeTruthy();
      expect((insert!.payload as Record<string, unknown>).facility_id).toBe(UNCLAIMED_FACILITY_ID);
    });

    it("NEVER emails seeker PII to the unverified facilities.email address", async () => {
      const { handler, emails } = await loadEdgeHandler(FN, unclaimed());
      await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));

      const recipients = emails.flatMap((e) => (Array.isArray(e.to) ? e.to : [e.to])).map(String);
      expect(recipients).not.toContain("scraped-contact@unverified.example");
      for (const r of recipients) {
        expect(r).not.toMatch(/unverified\.example/);
      }
    });

    it("reports the truthful delivery state rather than claiming delivery", async () => {
      const { handler } = await loadEdgeHandler(FN, unclaimed());
      const { json } = await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));

      expect(json.deliveryState).toBe("stored_pending_claim");
      expect(String(json.message)).not.toMatch(/sent to/i);
    });

    it("sends the seeker a confirmation that does not claim the facility received it", async () => {
      const { handler, emails } = await loadEdgeHandler(FN, unclaimed());
      await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));

      const seekerEmail = emails.find((e) =>
        JSON.stringify(e.to).includes("jordan.rivera@example.com"),
      );
      expect(seekerEmail).toBeTruthy();
      const html = String(seekerEmail!.html ?? "");
      expect(html).toMatch(/recorded for/i);
      expect(html).not.toMatch(/delivered to/i);
      expect(html).not.toMatch(/an admissions specialist will reach out/i);
    });

    it("never reroutes it to Concierge, an advisor, or another facility", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, unclaimed());
      await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));
      expectNoLegacyRouting(supabase);
    });
  });

  // ── CASES E/F/G/H — REJECTIONS BEFORE PII ───────────────────────────────
  describe("safe rejections happen before PII-dependent processing", () => {
    /** Facility identity only — no name, email, or phone in the body. */
    const identityOnly = (id: string) => ({ facilityId: id });

    it("CASE E — suspended facility is rejected and nothing is persisted", async () => {
      const { handler, supabase, emails } = await loadEdgeHandler(
        FN,
        buildStubOptions({
          facility: facilityRow({ id: FREE_FACILITY_ID, name: "Suspended House", suspended: true }),
        }),
      );
      const { status, json } = await postJson(handler, identityOnly(FREE_FACILITY_ID));

      expect(status).toBe(400);
      expect(json.code).toBe("facility_not_accepting");
      expect(supabase.insertedTables()).toEqual([]);
      expect(emails).toEqual([]);
    });

    it("CASE F — unapproved facility is rejected and nothing is persisted", async () => {
      const { handler, supabase, emails } = await loadEdgeHandler(
        FN,
        buildStubOptions({
          facility: facilityRow({ id: FREE_FACILITY_ID, name: "Pending House", status: "pending" }),
        }),
      );
      const { status, json } = await postJson(handler, identityOnly(FREE_FACILITY_ID));

      expect(status).toBe(400);
      expect(json.code).toBe("facility_not_accepting");
      expect(supabase.insertedTables()).toEqual([]);
      expect(emails).toEqual([]);
    });

    it("CASE G — unknown facility is rejected safely", async () => {
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({ facility: null }),
      );
      const { status, json } = await postJson(handler, identityOnly(UNKNOWN_FACILITY_ID));

      expect(status).toBe(404);
      expect(json.code).toBe("facility_not_found");
      expect(supabase.insertedTables()).toEqual([]);
    });

    it("CASE H — malformed facility id is rejected before any lookup", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, buildStubOptions());
      const { status, json } = await postJson(handler, { facilityId: "not-a-uuid" });

      expect(status).toBe(400);
      expect(json.code).toBe("invalid_facility_id");
      expect(supabase.selectedTables()).not.toContain("facilities");
      expect(supabase.insertedTables()).toEqual([]);
    });

    it("rejects a missing facility id outright", async () => {
      const { handler } = await loadEdgeHandler(FN, buildStubOptions());
      const { status, json } = await postJson(handler, {});
      expect(status).toBe(400);
      expect(json.code).toBe("facility_required");
    });
  });

  // ── CASE I — IDEMPOTENCY ────────────────────────────────────────────────
  describe("CASE I — idempotency", () => {
    it("does not create a second inquiry for a repeated idempotency key", async () => {
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({ isPro: false, idempotentHit: { id: "existing-lead-1" } }),
      );
      const { status, json } = await postJson(handler, seekerPayload(PRO_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(supabase.insertedTables()).not.toContain("leads");
    });
  });

  // ── CASE J — RATE LIMITING ──────────────────────────────────────────────
  describe("CASE J — rate limiting is preserved", () => {
    it("refuses once the per-email hourly threshold is exceeded", async () => {
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({ existingLeadCount: 50 }),
      );
      const { status, json } = await postJson(handler, seekerPayload(PRO_FACILITY_ID));

      expect(status).toBe(429);
      expect(String(json.code)).toMatch(/rate_limit|duplicate/);
      expect(supabase.insertedTables()).not.toContain("leads");
    });
  });

  // ── CASE K — BLOCKED IDENTIFIER ─────────────────────────────────────────
  describe("CASE K — blocked identifiers are preserved", () => {
    it("does not persist an inquiry from a blocked identifier", async () => {
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({ blocked: true }),
      );
      const { status } = await postJson(handler, seekerPayload(PRO_FACILITY_ID));

      // Returns a success-shaped body on purpose, to avoid revealing the block.
      expect(status).toBe(200);
      expect(supabase.insertedTables()).not.toContain("leads");
    });
  });

  // ── CASE L — EMAIL VERIFICATION ─────────────────────────────────────────
  describe("CASE L — server-side email verification is still enforced", () => {
    it("refuses an unverified email even for an eligible facility", async () => {
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({ emailVerified: false }),
      );
      const { status, json } = await postJson(handler, seekerPayload(PRO_FACILITY_ID));

      expect(status).toBe(403);
      expect(json.code).toBe("email_not_verified");
      expect(supabase.insertedTables()).not.toContain("leads");
    });
  });

  // ── CASE M — PII LOGGING ────────────────────────────────────────────────
  describe("CASE M — seeker PII stays out of routine logs", () => {
    it("does not write the seeker's full name, email or phone to console logs", async () => {
      const original = { log: console.log, warn: console.warn, error: console.error };
      const captured: string[] = [];
      const capture =
        () =>
        (...args: unknown[]) =>
          captured.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
      console.log = capture();
      console.warn = capture();
      console.error = capture();
      try {
        const { handler } = await loadEdgeHandler(FN, buildStubOptions({ isPro: false }));
        await postJson(handler, seekerPayload(FREE_FACILITY_ID));
      } finally {
        console.log = original.log;
        console.warn = original.warn;
        console.error = original.error;
      }

      const logText = captured.join("\n");
      expect(logText).not.toContain("jordan.rivera@example.com");
      expect(logText).not.toContain("5035550142");
      expect(logText).not.toContain("Jordan Rivera");
    });
  });

  // ── CASE N — REDISTRIBUTION ─────────────────────────────────────────────
  describe("CASE N — a new inquiry cannot enter automated redistribution", () => {
    it("writes no redistribution ledger row and no redistribution-selection columns", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, buildStubOptions({ isPro: false }));
      await postJson(handler, seekerPayload(FREE_FACILITY_ID));

      expect(supabase.insertedTables()).not.toContain("lead_distributions");
      expect(supabase.invokedFunctions()).not.toContain("process-lead-redistribution");

      // process-lead-redistribution selects on these columns. A row that never
      // sets them cannot satisfy its selection criteria.
      const payload = leadInsertOf(supabase)!.payload as Record<string, unknown>;
      for (const col of [
        "exclusive_until",
        "extended_until",
        "redistribution_status",
        "redistributed_at",
        "redistribution_count",
      ]) {
        expect(payload[col]).toBeUndefined();
      }
    });
  });

  // ── DIRECT_CONTACT_REQUIRED IS RETIRED ──────────────────────────────────
  describe("DIRECT_CONTACT_REQUIRED is no longer emitted", () => {
    it.each([
      ["Free", FREE_FACILITY_ID, false],
      ["Featured non-Pro", FEATURED_FACILITY_ID, false],
      ["unclaimed", UNCLAIMED_FACILITY_ID, false],
      ["Pro", PRO_FACILITY_ID, true],
    ])("never returns it for a %s facility", async (_label, id, isPro) => {
      const { handler } = await loadEdgeHandler(
        FN,
        buildStubOptions({
          isPro,
          facility: facilityRow({
            id,
            name: "Any Facility",
            user_id: id === UNCLAIMED_FACILITY_ID ? null : "owner-x",
          }),
        }),
      );
      const { json } = await postJson(handler, seekerPayload(id));

      expect(json.action).not.toBe("DIRECT_CONTACT_REQUIRED");
      expect(json.direct_contact_required).toBeUndefined();
      expect(json.success).toBe(true);
    });
  });
});

// ── CASE O — PROVIDER NOTIFICATION FAN-OUT + INSTANT-EMAIL AUDIT ──────────
//
// POST-ROLLOUT STAGE 2 HOTFIX #1.
//
// Two defects were found in production verification, both in the block that
// runs AFTER the lead row is safely persisted:
//
//   1. The `notification_events` insert ran unconditionally with
//      `user_id: facility.user_id`. For an unclaimed listing that is NULL and
//      production's column is NOT NULL, so every unclaimed inquiry hit a
//      guaranteed constraint failure whose catch then raised the admin alert
//      "Lead notification audit trail missing" — a FALSE operational failure
//      for a provider notification that was correctly never sent.
//
//   2. Even for a claimed listing the row hardcoded `channel:"email",
//      event_type:"sent"` regardless of whether the email was disabled,
//      unaddressed, suppressed, rejected or thrown.
//
// These tests execute the real handler, so they prove behaviour — the
// recorded inserts, reads and email attempts — not the presence of comments.
describe("submit-qualified-lead — provider notification fan-out and instant-email audit", () => {
  const CLAIMED_FACILITY_ID = FREE_FACILITY_ID;
  const PROVIDER_USER_ID = "owner-1";
  const PROVIDER_EMAIL = "owner@example.org";
  const SEEKER_EMAIL = "jordan.rivera@example.com";

  interface NotifScenario {
    facility: FacilityShape;
    /** notification_preferences row; `null` = no row (defaults apply). */
    prefs?: Record<string, boolean> | null;
    /** profiles.email for the provider; `null` = no profile email resolved. */
    profileEmail?: string | null;
    /** Addresses `suppressed_emails` should report as suppressed. */
    suppressed?: string[];
  }

  const claimedFacility = () =>
    facilityRow({
      id: CLAIMED_FACILITY_ID,
      name: "Cascadia Recovery Center",
      email: "admissions@example.org",
      user_id: PROVIDER_USER_ID,
    });

  const unclaimedFacility = () =>
    facilityRow({
      id: UNCLAIMED_FACILITY_ID,
      name: "Tony Rice Center, INC",
      // A populated but UNVERIFIED address from a SAMHSA import.
      email: "scraped-contact@unverified.example",
      user_id: null,
    });

  function notifStub(scenario: NotifScenario): SupabaseStubOptions {
    return {
      onRpc: (name) => {
        if (name === "has_active_pro") return { data: false, error: null };
        if (name === "is_identifier_blocked") return { data: false, error: null };
        if (name === "is_email_verified") return { data: true, error: null };
        return { data: null, error: null };
      },
      onSelect: (table, filters) => {
        if (table === "facilities") return { data: scenario.facility, error: null };
        if (table === "leads") return { data: null, error: null, count: 0 };
        if (table === "notification_preferences") return { data: scenario.prefs ?? null, error: null };
        if (table === "profiles") {
          const email = scenario.profileEmail === undefined ? PROVIDER_EMAIL : scenario.profileEmail;
          return { data: email === null ? null : { email }, error: null };
        }
        if (table === "suppressed_emails") {
          const target = String(
            filters.find((f) => f.method === "eq" && f.args[0] === "email")?.args[1] ?? "",
          );
          return (scenario.suppressed ?? []).includes(target)
            ? { data: { email: target }, error: null }
            : { data: null, error: null };
        }
        return { data: null, error: null, count: 0 };
      },
      onInsert: (table, payload) => {
        if (table === "leads") return { data: { id: "lead-123" }, error: null };
        // Mirrors the LIVE production schema: notification_events.user_id is
        // NOT NULL. Any row written on behalf of an unclaimed listing is
        // rejected by the database, which is exactly what used to manufacture
        // the false "audit trail missing" admin alert.
        if (table === "notification_events") {
          const row = payload as Record<string, unknown>;
          if (row.user_id === null || row.user_id === undefined) {
            return {
              data: null,
              error: {
                code: "23502",
                message: 'null value in column "user_id" violates not-null constraint',
              },
            };
          }
        }
        return { data: { id: `${table}-row` }, error: null };
      },
    };
  }

  const insertsInto = (
    supabase: { calls: Array<{ kind: string; target: string; payload?: unknown }> },
    table: string,
  ) => supabase.calls.filter((c) => c.kind === "insert" && c.target === table);

  const recipientsOf = (emails: Array<Record<string, unknown>>) =>
    emails.flatMap((e) => (Array.isArray(e.to) ? e.to : [e.to])).map(String);

  // ── A. UNCLAIMED LISTING — an expected state, never an incident ────────
  describe("unclaimed listing", () => {
    it("still stores exactly one lead pinned to the selected facility", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, notifStub({ facility: unclaimedFacility() }));
      const { status, json } = await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.success).toBe(true);
      const leadInserts = insertsInto(supabase, "leads");
      expect(leadInserts).toHaveLength(1);
      expect((leadInserts[0].payload as Record<string, unknown>).facility_id).toBe(UNCLAIMED_FACILITY_ID);
      expect(json.deliveryState).toBe("stored_pending_claim");
    });

    it("opens no provider-notification branch at all", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, notifStub({ facility: unclaimedFacility() }));
      await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));

      // No preference read and no provider-profile read for a provider that
      // does not exist — these used to run as `.eq("user_id", null)`.
      expect(supabase.selectedTables()).not.toContain("notification_preferences");
      expect(supabase.selectedTables()).not.toContain("profiles");
      // No provider email, no in-app alert.
      expect(supabase.insertedTables()).not.toContain("provider_notifications");
      // And nothing was handed to the SMS function either.
      expect(supabase.invokedFunctions()).not.toContain("send-sms-notification");
    });

    it("never resolves a provider notification email or leaks seeker PII to the import address", async () => {
      const { handler, emails } = await loadEdgeHandler(FN, notifStub({ facility: unclaimedFacility() }));
      await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));

      const recipients = recipientsOf(emails);
      // The seeker's own confirmation is the ONLY mail this request sends.
      expect(recipients).toEqual([SEEKER_EMAIL]);
      expect(recipients).not.toContain("scraped-contact@unverified.example");
    });

    it("writes no instant-email audit row claiming a provider notification was sent", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, notifStub({ facility: unclaimedFacility() }));
      await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));

      expect(supabase.insertedTables()).not.toContain("notification_events");
    });

    it("raises NO admin failure alert merely because the listing is unclaimed", async () => {
      const { handler, supabase, logs } = await loadEdgeHandler(
        FN,
        notifStub({ facility: unclaimedFacility() }),
      );
      await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));

      expect(supabase.insertedTables()).not.toContain("admin_notifications");
      const joined = logs.join("\n");
      expect(joined).not.toMatch(/audit trail missing/i);
      expect(joined).not.toMatch(/Failed to track notification event/i);
      expect(joined).not.toMatch(/Facility email sent/);
    });

    it("routes nowhere else — no concierge, advisor, matching or redistribution", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, notifStub({ facility: unclaimedFacility() }));
      await postJson(handler, seekerPayload(UNCLAIMED_FACILITY_ID));
      expectNoLegacyRouting(supabase);
    });
  });

  // ── B. CLAIMED LISTING — the audit row must be earned ──────────────────
  describe("claimed listing — instant-email audit row", () => {
    it("is written, as a truthful email/sent record, when the provider email actually sends", async () => {
      const { handler, supabase, emails } = await loadEdgeHandler(
        FN,
        notifStub({ facility: claimedFacility() }),
      );
      const { json } = await postJson(handler, seekerPayload(CLAIMED_FACILITY_ID));

      expect(json.deliveryState).toBe("delivered_to_provider");
      expect(recipientsOf(emails)).toContain(PROVIDER_EMAIL);

      const events = insertsInto(supabase, "notification_events");
      expect(events).toHaveLength(1);
      const row = events[0].payload as Record<string, unknown>;
      expect(row).toMatchObject({
        lead_id: "lead-123",
        facility_id: CLAIMED_FACILITY_ID,
        user_id: PROVIDER_USER_ID,
        notification_stage: "instant",
        channel: "email",
        event_type: "sent",
      });
      expect(supabase.insertedTables()).not.toContain("admin_notifications");
    });

    it("is NOT written when the email channel is switched off by preference", async () => {
      const { handler, supabase, emails, logs } = await loadEdgeHandler(
        FN,
        notifStub({
          facility: claimedFacility(),
          prefs: { notify_new_leads: true, email_lead_alerts: false },
        }),
      );
      const { json } = await postJson(handler, seekerPayload(CLAIMED_FACILITY_ID));

      expect(recipientsOf(emails)).not.toContain(PROVIDER_EMAIL);
      expect(supabase.insertedTables()).not.toContain("notification_events");
      expect(logs.join("\n")).not.toMatch(/Facility email sent/);
      // Delivery semantics are unchanged: the inquiry is in the provider inbox
      // whether or not they asked to be emailed about it.
      expect(json.deliveryState).toBe("delivered_to_provider");
      expect(supabase.insertedTables()).toContain("provider_notifications");
    });

    it("is NOT written when no provider notification email can be resolved", async () => {
      const { handler, supabase, emails } = await loadEdgeHandler(
        FN,
        notifStub({
          facility: facilityRow({
            id: CLAIMED_FACILITY_ID,
            name: "Cascadia Recovery Center",
            email: null,
            user_id: PROVIDER_USER_ID,
          }),
          profileEmail: null,
        }),
      );
      const { json } = await postJson(handler, seekerPayload(CLAIMED_FACILITY_ID));

      expect(recipientsOf(emails)).toEqual([SEEKER_EMAIL]);
      expect(supabase.insertedTables()).not.toContain("notification_events");
      expect(json.deliveryState).toBe("delivered_to_provider");
    });

    it("is NOT written when the provider address is suppressed", async () => {
      const { handler, supabase, logs } = await loadEdgeHandler(
        FN,
        notifStub({ facility: claimedFacility(), suppressed: [PROVIDER_EMAIL] }),
      );
      await postJson(handler, seekerPayload(CLAIMED_FACILITY_ID));

      expect(supabase.insertedTables()).not.toContain("notification_events");
      const joined = logs.join("\n");
      expect(joined).toMatch(/Facility email not sent/);
      expect(joined).not.toMatch(/Facility email sent/);
    });

    it("is NOT written when Resend permanently rejects the provider email", async () => {
      const { handler, supabase, logs } = await loadEdgeHandler(
        FN,
        notifStub({ facility: claimedFacility() }),
        {
          onSend: (payload) =>
            JSON.stringify(payload.to).includes(PROVIDER_EMAIL)
              ? { error: { message: "validation_error: recipient rejected" } }
              : undefined,
        },
      );
      await postJson(handler, seekerPayload(CLAIMED_FACILITY_ID));

      expect(supabase.insertedTables()).not.toContain("notification_events");
      expect(logs.join("\n")).not.toMatch(/Facility email sent/);
    });

    it("is NOT written when the provider email send throws", async () => {
      const { handler, supabase, logs } = await loadEdgeHandler(
        FN,
        notifStub({ facility: claimedFacility() }),
        {
          onSend: (payload) => {
            if (JSON.stringify(payload.to).includes(PROVIDER_EMAIL)) {
              throw new Error("resend transport exploded");
            }
            return undefined;
          },
        },
      );
      const { json } = await postJson(handler, seekerPayload(CLAIMED_FACILITY_ID));

      expect(json.success).toBe(true);
      expect(supabase.insertedTables()).not.toContain("notification_events");
      expect(logs.join("\n")).not.toMatch(/Facility email sent/);
    });
  });

  // ── C. INVARIANTS THE HOTFIX MUST NOT HAVE MOVED ──────────────────────
  describe("inquiry-destination invariants are untouched by the notification fix", () => {
    it.each([
      ["claimed", CLAIMED_FACILITY_ID, PROVIDER_USER_ID, "delivered_to_provider"],
      ["unclaimed", UNCLAIMED_FACILITY_ID, null, "stored_pending_claim"],
    ])(
      "pins a %s inquiry to the selected facility and reports %s",
      async (_label, facilityId, userId, expectedState) => {
        const { handler, supabase } = await loadEdgeHandler(
          FN,
          notifStub({
            facility: facilityRow({
              id: facilityId as string,
              name: "Any Facility",
              user_id: userId as string | null,
            }),
          }),
        );
        const { json } = await postJson(handler, seekerPayload(facilityId as string));

        expect(json.deliveryState).toBe(expectedState);
        expect(json.facilityId).toBe(facilityId);
        const leadInserts = insertsInto(supabase, "leads");
        expect(leadInserts).toHaveLength(1);
        expect((leadInserts[0].payload as Record<string, unknown>).facility_id).toBe(facilityId);
        expectNoLegacyRouting(supabase);
      },
    );

    it("never lets Pro or Featured state decide inquiry eligibility or notification", async () => {
      for (const isPro of [false, true]) {
        const base = notifStub({ facility: claimedFacility() });
        const { handler, supabase } = await loadEdgeHandler(FN, {
          ...base,
          onRpc: (name, args) =>
            name === "has_active_pro" ? { data: isPro, error: null } : base.onRpc!(name, args),
        });
        const { status, json } = await postJson(handler, seekerPayload(CLAIMED_FACILITY_ID));

        expect(status).toBe(200);
        expect(json.deliveryState).toBe("delivered_to_provider");
        // Identical audit outcome regardless of entitlement.
        expect(insertsInto(supabase, "notification_events")).toHaveLength(1);
      }
    });
  });
});
