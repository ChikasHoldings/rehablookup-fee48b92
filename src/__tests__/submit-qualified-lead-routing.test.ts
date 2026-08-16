// @vitest-environment node
//
// Runs in the node environment (not the suite-wide jsdom default): the edge
// function is transpiled with esbuild, which asserts that `TextEncoder`
// produces a real `Uint8Array` — jsdom's cross-realm typed arrays break that
// invariant. The handler itself only needs fetch-API globals, which Node has.
/**
 * Directory cutover stage 2 — `submit-qualified-lead` routing contract.
 *
 * These tests execute the REAL edge-function handler in-process (see
 * helpers/edgeFunctionHarness.ts) against recording stubs, so they prove
 * behaviour and ordering rather than the presence of source strings:
 *
 *   A  active Pro                 → lead inserted, no concierge side effects
 *   B  Free / non-Pro             → DIRECT_CONTACT_REQUIRED, zero persistence
 *   C  has_active_pro() errors    → DIRECT_CONTACT_REQUIRED (fail-safe)
 *   D  Featured but not Pro       → DIRECT_CONTACT_REQUIRED
 *   E  unapproved / suspended     → existing safe rejection preserved
 *   F  grace-period Pro           → normal Pro lead path preserved
 *
 * The critical invariant is that B/C/D short-circuit BEFORE any
 * PII-dependent processing: a request carrying only a facility id — no
 * name, no email, no phone — must still reach DIRECT_CONTACT_REQUIRED,
 * because the platform does not accept those fields for that facility.
 */
import { describe, it, expect } from "vitest";
import { loadEdgeHandler, postJson, type SupabaseStubOptions } from "./helpers/edgeFunctionHarness";

const FN = "supabase/functions/submit-qualified-lead/index.ts";

const PRO_FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const FREE_FACILITY_ID = "22222222-2222-4222-8222-222222222222";

/** Tables/functions that only the retired concierge redirect ever touched. */
const CONCIERGE_TABLES = ["concierge_inquiries", "concierge_case_events"];
const ADVISOR_TABLES = ["admin_user_profiles"];

interface ScenarioOptions {
  isPro?: boolean | null;
  proRpcError?: { message: string } | null;
  facility?: Record<string, unknown> | null;
  facilityError?: { message: string } | null;
}

function buildStubOptions(scenario: ScenarioOptions): SupabaseStubOptions {
  const facility =
    scenario.facility === undefined
      ? {
          id: PRO_FACILITY_ID,
          name: "Cascadia Recovery Center",
          email: "admissions@cascadia.example",
          user_id: "owner-1",
          status: "approved",
          suspended: false,
          reply_email: null,
          reply_email_verified: false,
        }
      : scenario.facility;

  return {
    onRpc: (name) => {
      if (name === "has_active_pro") {
        if (scenario.proRpcError) return { data: null, error: scenario.proRpcError };
        return { data: scenario.isPro ?? false, error: null };
      }
      // Not blocked; email verified — so a Pro run can proceed end-to-end.
      if (name === "is_identifier_blocked") return { data: false, error: null };
      if (name === "is_email_verified") return { data: true, error: null };
      return { data: null, error: null };
    },
    onSelect: (table) => {
      if (table === "facilities") {
        if (scenario.facilityError) return { data: null, error: scenario.facilityError };
        return { data: facility, error: null };
      }
      // No prior leads: no idempotency hit, no duplicate, no rate limit.
      if (table === "leads") return { data: null, error: null, count: 0 };
      if (table === "notification_preferences") return { data: null, error: null };
      if (table === "profiles") return { data: { email: "owner@cascadia.example" }, error: null };
      return { data: null, error: null, count: 0 };
    },
    onInsert: (table) => {
      if (table === "leads") return { data: { id: "lead-123" }, error: null };
      return { data: { id: `${table}-row` }, error: null };
    },
  };
}

/** A complete, valid seeker payload (only ever accepted for active Pro). */
function proPayload(facilityId: string) {
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
  };
}

describe("submit-qualified-lead — stage 2 inquiry routing", () => {
  // ── CASE A ────────────────────────────────────────────────────────────
  describe("CASE A — active Pro facility", () => {
    it("inserts the lead against the one selected facility and creates no concierge data", async () => {
      const { handler, supabase, emails } = await loadEdgeHandler(
        FN,
        buildStubOptions({ isPro: true }),
      );

      const { status, json } = await postJson(handler, proPayload(PRO_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.action).toBeUndefined();

      // Lead inserted, pinned to the selected facility.
      const leadInsert = supabase.calls.find((c) => c.kind === "insert" && c.target === "leads");
      expect(leadInsert).toBeTruthy();
      expect((leadInsert!.payload as Record<string, unknown>).facility_id).toBe(PRO_FACILITY_ID);

      // Entitlement was resolved through the canonical RPC.
      expect(supabase.rpcNames()).toContain("has_active_pro");

      // No concierge / advisor / redistribution side effects whatsoever.
      for (const table of [...CONCIERGE_TABLES, ...ADVISOR_TABLES]) {
        expect(supabase.insertedTables()).not.toContain(table);
        expect(supabase.selectedTables()).not.toContain(table);
      }
      expect(supabase.invokedFunctions()).not.toContain("notify-free-tier-inquiry-redirect");

      // Provider + seeker notification pipeline still runs.
      expect(supabase.selectedTables()).toContain("notification_preferences");
      expect(emails.length).toBeGreaterThan(0);
    });
  });

  // ── CASE B ────────────────────────────────────────────────────────────
  describe("CASE B — Free / non-Pro facility", () => {
    it("returns DIRECT_CONTACT_REQUIRED for a full payload and persists nothing", async () => {
      const { handler, supabase, emails } = await loadEdgeHandler(
        FN,
        buildStubOptions({
          isPro: false,
          facility: {
            id: FREE_FACILITY_ID,
            name: "Riverbend Wellness",
            email: "info@riverbend.example",
            user_id: "owner-2",
            status: "approved",
            suspended: false,
            reply_email: null,
            reply_email_verified: false,
          },
        }),
      );

      const { status, json } = await postJson(handler, proPayload(FREE_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.action).toBe("DIRECT_CONTACT_REQUIRED");
      expect(json.direct_contact_required).toBe(true);
      expect(json.facility_id).toBe(FREE_FACILITY_ID);
      expect(json.facility_name).toBe("Riverbend Wellness");

      // Not a successful submission, and carries no routing promise.
      expect(json.success).toBeUndefined();
      expect(json.leadId).toBeUndefined();
      expect(json.inquiry_id).toBeUndefined();
      expect(json.confirmation_path).toBeUndefined();
      expect(json.routing_mode).toBeUndefined();

      // No seeker PII echoed back.
      const body = JSON.stringify(json);
      expect(body).not.toContain("jordan.rivera@example.com");
      expect(body).not.toContain("Jordan");
      expect(body).not.toContain("5035550142");

      // Nothing written anywhere.
      expect(supabase.insertedTables()).toEqual([]);
      expect(emails).toEqual([]);

      // No concierge, advisor, or free-tier notification side effects.
      for (const table of [...CONCIERGE_TABLES, ...ADVISOR_TABLES, "admin_notifications"]) {
        expect(supabase.selectedTables()).not.toContain(table);
        expect(supabase.insertedTables()).not.toContain(table);
      }
      expect(supabase.invokedFunctions()).toEqual([]);
    });

    it("reaches DIRECT_CONTACT_REQUIRED with facility identity alone — no name, email or phone", async () => {
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({
          isPro: false,
          facility: {
            id: FREE_FACILITY_ID,
            name: "Riverbend Wellness",
            status: "approved",
            suspended: false,
            user_id: "owner-2",
            email: null,
            reply_email: null,
            reply_email_verified: false,
          },
        }),
      );

      // The platform does not accept seeker fields for this facility, so a
      // request must not be required to carry them to learn that.
      const { status, json } = await postJson(handler, { facilityId: FREE_FACILITY_ID });

      expect(status).toBe(200);
      expect(json.action).toBe("DIRECT_CONTACT_REQUIRED");
      expect(json.reason).toBe("facility_not_pro");
      expect(json.error).toBeUndefined();

      // Proves the short-circuit happened before PII-dependent processing:
      // none of the identity/abuse/rate-limit machinery ran.
      expect(supabase.rpcNames()).not.toContain("is_identifier_blocked");
      expect(supabase.rpcNames()).not.toContain("is_email_verified");
      expect(supabase.selectedTables()).not.toContain("leads");
      expect(supabase.insertedTables()).toEqual([]);

      // The only reads were facility identity + the entitlement RPC.
      expect(supabase.selectedTables()).toEqual(["facilities"]);
      expect(supabase.rpcNames()).toEqual(["has_active_pro"]);
    });

    it("does not log seeker PII on the direct-contact branch", async () => {
      const { handler, logs } = await loadEdgeHandler(
        FN,
        buildStubOptions({
          isPro: false,
          facility: {
            id: FREE_FACILITY_ID,
            name: "Riverbend Wellness",
            status: "approved",
            suspended: false,
            user_id: "owner-2",
            email: null,
            reply_email: null,
            reply_email_verified: false,
          },
        }),
      );

      await postJson(handler, proPayload(FREE_FACILITY_ID));

      const joined = logs.join("\n");
      expect(joined).not.toContain("jordan.rivera@example.com");
      expect(joined).not.toContain("Jordan Rivera");
      expect(joined).not.toContain("5035550142");
    });
  });

  // ── CASE C ────────────────────────────────────────────────────────────
  describe("CASE C — entitlement check failure", () => {
    it("fails SAFE to DIRECT_CONTACT_REQUIRED and persists nothing", async () => {
      const { handler, supabase, emails } = await loadEdgeHandler(
        FN,
        buildStubOptions({ proRpcError: { message: "connection reset" } }),
      );

      const { status, json } = await postJson(handler, proPayload(PRO_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.action).toBe("DIRECT_CONTACT_REQUIRED");
      expect(json.reason).toBe("entitlement_unconfirmed");

      // An entitlement failure must never be routed into concierge, and must
      // never deliver PII to a facility we could not confirm.
      expect(supabase.insertedTables()).toEqual([]);
      expect(supabase.invokedFunctions()).toEqual([]);
      expect(emails).toEqual([]);
      expect(json.confirmation_path).toBeUndefined();
      expect(json.routing_mode).toBeUndefined();
    });
  });

  // ── CASE D ────────────────────────────────────────────────────────────
  describe("CASE D — Featured but not Pro", () => {
    it("gets the same direct-contact treatment as any other non-Pro facility", async () => {
      // Featured is a visibility add-on. It is not inquiry entitlement, and
      // the function never reads a `featured` flag to decide routing.
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({
          isPro: false,
          facility: {
            id: FREE_FACILITY_ID,
            name: "Featured Only Center",
            featured: true,
            status: "approved",
            suspended: false,
            user_id: "owner-3",
            email: null,
            reply_email: null,
            reply_email_verified: false,
          },
        }),
      );

      const { status, json } = await postJson(handler, proPayload(FREE_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.action).toBe("DIRECT_CONTACT_REQUIRED");
      expect(supabase.insertedTables()).toEqual([]);
    });
  });

  // ── CASE E ────────────────────────────────────────────────────────────
  describe("CASE E — unapproved / suspended facility", () => {
    it("rejects a suspended facility before resolving entitlement", async () => {
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({
          isPro: true,
          facility: {
            id: PRO_FACILITY_ID,
            name: "Suspended Center",
            status: "approved",
            suspended: true,
            user_id: "owner-4",
            email: null,
            reply_email: null,
            reply_email_verified: false,
          },
        }),
      );

      const { status, json } = await postJson(handler, proPayload(PRO_FACILITY_ID));

      expect(status).toBe(400);
      expect(json.code).toBe("facility_not_accepting");
      expect(supabase.insertedTables()).toEqual([]);
    });

    it("rejects a pending (unapproved) facility", async () => {
      const { handler } = await loadEdgeHandler(
        FN,
        buildStubOptions({
          isPro: true,
          facility: {
            id: PRO_FACILITY_ID,
            name: "Pending Center",
            status: "pending",
            suspended: false,
            user_id: "owner-5",
            email: null,
            reply_email: null,
            reply_email_verified: false,
          },
        }),
      );

      const { status, json } = await postJson(handler, proPayload(PRO_FACILITY_ID));
      expect(status).toBe(400);
      expect(json.code).toBe("facility_not_accepting");
    });

    it("404s an unknown facility", async () => {
      const { handler } = await loadEdgeHandler(FN, buildStubOptions({ facility: null }));
      const { status, json } = await postJson(handler, proPayload(PRO_FACILITY_ID));
      expect(status).toBe(404);
      expect(json.code).toBe("facility_not_found");
    });

    it("rejects a malformed facility id without touching the database", async () => {
      const { handler, supabase } = await loadEdgeHandler(FN, buildStubOptions({ isPro: true }));
      const { status, json } = await postJson(handler, { facilityId: "not-a-uuid" });
      expect(status).toBe(400);
      expect(json.code).toBe("invalid_facility_id");
      expect(supabase.calls).toEqual([]);
    });

    it("rejects a missing facility id", async () => {
      const { handler } = await loadEdgeHandler(FN, buildStubOptions({ isPro: true }));
      const { status, json } = await postJson(handler, { email: "a@b.com" });
      expect(status).toBe(400);
      expect(json.code).toBe("facility_required");
    });
  });

  // ── CASE F ────────────────────────────────────────────────────────────
  describe("CASE F — grace-period Pro", () => {
    it("preserves the direct Pro lead path whenever has_active_pro returns true", async () => {
      // Grace handling (past_due within the dunning window) lives entirely in
      // has_active_pro(). This function must not reimplement it — it simply
      // honours a `true`.
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({ isPro: true }),
      );

      const { status, json } = await postJson(handler, proPayload(PRO_FACILITY_ID));

      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(supabase.insertedTables()).toContain("leads");
      expect(supabase.insertedTables()).not.toContain("concierge_inquiries");
    });

    it("does not read facility_subscriptions or infer Pro from any other source", async () => {
      const { handler, supabase } = await loadEdgeHandler(
        FN,
        buildStubOptions({ isPro: true }),
      );
      await postJson(handler, proPayload(PRO_FACILITY_ID));

      expect(supabase.selectedTables()).not.toContain("facility_subscriptions");
      expect(supabase.rpcNames().filter((n) => n === "has_active_pro")).toHaveLength(1);
    });
  });
});
