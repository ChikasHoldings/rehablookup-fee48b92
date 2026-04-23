// Smoke test runner for the Admin Panel.
// Walks the full concierge_inquiries status lifecycle end-to-end against staging.
//
// Auth model:
//   • Caller must be authenticated AND have admin_role = 'super_admin'.
//   • Service role is used for fixture setup/teardown only.
//   • Status transitions are performed as a seeded test admin user
//     (SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD), so RLS + trigger
//     validators are exercised exactly as in production.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type RequestInfo = {
  kind: "http" | "db";
  /** Method or DB verb (POST, UPDATE, INSERT, DELETE, SELECT). */
  method: string;
  /** URL or `${schema}.${table}`. */
  target: string;
  /** Body sent with the request (HTTP) or row payload (DB). */
  body?: unknown;
  /** Filter / WHERE clause for DB ops. */
  filter?: Record<string, unknown>;
};

type ResponseInfo = {
  /** HTTP status code (HTTP) or null (DB ops without status). */
  status?: number | null;
  /** Parsed body, raw text, or returned row(s). */
  body?: unknown;
  /** Postgres error code if a DB op failed. */
  code?: string | null;
};

type StepResult = {
  name: string;
  ok: boolean;
  durationMs: number;
  detail?: string;
  error?: string;
  /** Captured request payload for diagnostics. */
  request?: RequestInfo;
  /** Captured response payload for diagnostics. */
  response?: ResponseInfo;
  /** JS stack trace when the step threw. */
  stack?: string;
};

// Full happy path through validate_concierge_status_transition.
// Each tuple is [from, to]. We start from 'intake_submitted' (the seed value).
const HAPPY_PATH: Array<[string, string]> = [
  ["intake_submitted", "intake_reviewed"],
  ["intake_reviewed", "advisor_assigned"],
  ["advisor_assigned", "matching_providers"],
  ["matching_providers", "provider_prequalification"],
  ["provider_prequalification", "providers_accepted"],
  ["providers_accepted", "presented_to_seeker"],
  ["presented_to_seeker", "seeker_selected"],
  ["seeker_selected", "admission_in_progress"],
  ["admission_in_progress", "admitted"],
  ["admitted", "billed"],
  ["billed", "completed"],
];

// Negative-path probes: each must be REJECTED by the trigger.
const ILLEGAL_PROBES: Array<{ from: string; to: string }> = [
  { from: "intake_submitted", to: "admitted" }, // skip ahead
  { from: "intake_reviewed", to: "intake_submitted" }, // backwards
  { from: "completed", to: "closed" }, // out of terminal
];

// Required-field probes: each call to a transition edge function MUST fail
// with the expected HTTP status AND a structured error envelope:
//   { error: { code: string, message: string }, ...extras }
// We assert on the envelope shape, the status code, the error.code, and that
// error.message contains AT LEAST ONE keyword from a per-action keyword map.
//
// The keyword map exists so minor copy edits ("inquiryId is required" vs
// "Missing inquiry_id" vs "Provide an inquiry id") don't break the suite —
// we just need confidence that the message names the correct field.
type EdgeFn =
  | "confirm-placement"
  | "admin-manage-invoice"
  | "charge-placement-fee"
  | "unlock-lead"
  | "send-concierge-introduction"
  | "respond-international-case";

/**
 * Per-action keyword map. Each entry lists acceptable substrings (case-
 * insensitive); error.message must contain at least one. Add synonyms here
 * whenever a function's copy evolves so the suite stays resilient to wording
 * changes without losing field-level assertion strength.
 */
const FIELD_KEYWORDS: Record<EdgeFn, Record<string, string[]>> = {
  "confirm-placement": {
    inquiryId:        ["inquiryid", "inquiry_id", "inquiry id"],
    facilityId:       ["facilityid", "facility_id", "facility id"],
    confirmationType: ["confirmationtype", "confirmation_type", "confirmation type"],
  },
  "admin-manage-invoice": {
    invoiceId: ["invoiceid", "invoice_id", "invoice id"],
    reason:    ["reason"],
    amount:    ["amount", "newamount", "new_amount", "new amount"],
  },
  "charge-placement-fee": {
    inquiryId:  ["inquiryid", "inquiry_id", "inquiry id"],
    facilityId: ["facilityid", "facility_id", "facility id"],
  },
  "unlock-lead": {
    leadId:     ["leadid", "lead_id", "lead id"],
    facilityId: ["facilityid", "facility_id", "facility id"],
  },
  "send-concierge-introduction": {
    inquiryId:      ["inquiryid", "inquiry_id", "inquiry id"],
    facilityId:     ["facilityid", "facility_id", "facility id"],
    introductionId: ["introductionid", "introduction_id", "introduction id"],
  },
  "respond-international-case": {
    action:  ["action"],
    matchId: ["matchid", "match_id", "match id"],
  },
};

type RequiredFieldProbe = {
  name: string;
  fn: EdgeFn;
  body: Record<string, unknown>;
  /** Expected HTTP status (validation errors should be 4xx, typically 400). */
  expectStatus: number;
  /** Exact `error.code` the function must return. */
  expectCode: string;
  /** Logical field name; resolved against FIELD_KEYWORDS[fn] to a list of
   *  acceptable substrings. error.message must contain at least one. */
  expectField: string;
};
const REQUIRED_FIELD_PROBES: RequiredFieldProbe[] = [
  {
    name: "confirm-placement: missing inquiryId",
    fn: "confirm-placement",
    body: { facilityId: "00000000-0000-0000-0000-000000000000", confirmationType: "admin" },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_INQUIRY_ID",
    expectField: "inquiryId",
  },
  {
    name: "confirm-placement: missing facilityId",
    fn: "confirm-placement",
    body: { inquiryId: "00000000-0000-0000-0000-000000000000", confirmationType: "admin" },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_FACILITY_ID",
    expectField: "facilityId",
  },
  {
    name: "confirm-placement: missing confirmationType",
    fn: "confirm-placement",
    body: {
      inquiryId: "00000000-0000-0000-0000-000000000000",
      facilityId: "00000000-0000-0000-0000-000000000000",
    },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_CONFIRMATION_TYPE",
    expectField: "confirmationType",
  },
  {
    name: "admin-manage-invoice: missing invoiceId",
    fn: "admin-manage-invoice",
    body: { action: "waive", reason: "smoke test reason" },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_INVOICE_ID",
    expectField: "invoiceId",
  },
  {
    name: "admin-manage-invoice: waive without reason",
    fn: "admin-manage-invoice",
    body: { invoiceId: "00000000-0000-0000-0000-000000000000", action: "waive" },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_REASON",
    expectField: "reason",
  },
  {
    name: "admin-manage-invoice: override without amount",
    fn: "admin-manage-invoice",
    body: {
      invoiceId: "00000000-0000-0000-0000-000000000000",
      action: "override",
      reason: "smoke test reason",
    },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_AMOUNT",
    expectField: "amount",
  },
  // ── charge-placement-fee ──
  {
    name: "charge-placement-fee: missing inquiryId",
    fn: "charge-placement-fee",
    body: { facilityId: "00000000-0000-0000-0000-000000000000" },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_INQUIRY_ID",
    expectField: "inquiryId",
  },
  {
    name: "charge-placement-fee: missing facilityId",
    fn: "charge-placement-fee",
    body: { inquiryId: "00000000-0000-0000-0000-000000000000" },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_FACILITY_ID",
    expectField: "facilityId",
  },
  // ── unlock-lead ──
  {
    name: "unlock-lead: missing leadId",
    fn: "unlock-lead",
    body: { facilityId: "00000000-0000-0000-0000-000000000000" },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_LEAD_ID",
    expectField: "leadId",
  },
  {
    name: "unlock-lead: missing facilityId",
    fn: "unlock-lead",
    body: { leadId: "11111111-1111-1111-8111-111111111111" },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_FACILITY_ID",
    expectField: "facilityId",
  },
  // ── send-concierge-introduction ──
  {
    name: "send-concierge-introduction: missing inquiryId",
    fn: "send-concierge-introduction",
    body: {
      facilityId: "11111111-1111-1111-8111-111111111111",
      introductionId: "11111111-1111-1111-8111-111111111111",
    },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_INQUIRY_ID",
    expectField: "inquiryId",
  },
  {
    name: "send-concierge-introduction: missing facilityId",
    fn: "send-concierge-introduction",
    body: {
      inquiryId: "11111111-1111-1111-8111-111111111111",
      introductionId: "11111111-1111-1111-8111-111111111111",
    },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_FACILITY_ID",
    expectField: "facilityId",
  },
  {
    name: "send-concierge-introduction: missing introductionId",
    fn: "send-concierge-introduction",
    body: {
      inquiryId: "11111111-1111-1111-8111-111111111111",
      facilityId: "11111111-1111-1111-8111-111111111111",
    },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_INTRODUCTION_ID",
    expectField: "introductionId",
  },
  // ── respond-international-case ──
  {
    name: "respond-international-case: missing action",
    fn: "respond-international-case",
    body: { matchId: "11111111-1111-1111-8111-111111111111" },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_ACTION",
    expectField: "action",
  },
  {
    name: "respond-international-case: missing matchId",
    fn: "respond-international-case",
    body: { action: "respond" },
    expectStatus: 400,
    expectCode: "MISSING_FIELD_MATCH_ID",
    expectField: "matchId",
  },
];

/** Resolve the keyword list for a probe; falls back to the literal field name. */
function keywordsFor(probe: RequiredFieldProbe): string[] {
  const map = FIELD_KEYWORDS[probe.fn];
  const list = map?.[probe.expectField];
  if (list && list.length > 0) return list.map((k) => k.toLowerCase());
  return [probe.expectField.toLowerCase()];
}

type StepCtx = { request?: RequestInfo; response?: ResponseInfo };

async function timed<T>(
  name: string,
  fn: (ctx: StepCtx) => Promise<T>,
): Promise<StepResult & { value?: T }> {
  const t0 = performance.now();
  const ctx: StepCtx = {};
  try {
    const value = await fn(ctx);
    return {
      name,
      ok: true,
      durationMs: Math.round(performance.now() - t0),
      value,
      request: ctx.request,
      response: ctx.response,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    return {
      name,
      ok: false,
      durationMs: Math.round(performance.now() - t0),
      error: message,
      stack,
      request: ctx.request,
      response: ctx.response,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SMOKE_EMAIL = Deno.env.get("SMOKE_ADMIN_EMAIL");
  const SMOKE_PASSWORD = Deno.env.get("SMOKE_ADMIN_PASSWORD");

  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!SMOKE_EMAIL || !SMOKE_PASSWORD) {
    return new Response(
      JSON.stringify({
        error: "SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD not configured",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ---- Authorize caller ---------------------------------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: callerAuth } = await callerClient.auth.getUser();
  const callerId = callerAuth.user?.id;
  if (!callerId) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: callerProfile } = await admin
    .from("admin_user_profiles")
    .select("admin_role")
    .eq("user_id", callerId)
    .maybeSingle();

  if (callerProfile?.admin_role !== "super_admin") {
    return new Response(JSON.stringify({ error: "Super admin role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- Sign in as the seeded test admin -----------------------------------
  const testAdminClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInErr } = await testAdminClient.auth.signInWithPassword({
    email: SMOKE_EMAIL,
    password: SMOKE_PASSWORD,
  });
  if (signInErr || !signIn.user) {
    return new Response(
      JSON.stringify({
        error: "Test admin sign-in failed",
        detail: signInErr?.message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const results: StepResult[] = [];
  let inquiryId: string | null = null;

  // ---- 1. Setup ----------------------------------------------------------
  const setup = await timed("setup: create ephemeral inquiry", async (ctx) => {
    const tag = `smoke-${crypto.randomUUID()}`;
    const payload = {
      user_name: tag,
      user_email: `${tag}@smoke.test`,
      user_phone: "+15555550100",
      status: "intake_submitted",
      admin_notes: "AUTOMATED SMOKE TEST — safe to delete",
    };
    ctx.request = { kind: "db", method: "INSERT", target: "public.concierge_inquiries", body: payload };
    const { data, error } = await admin
      .from("concierge_inquiries")
      .insert(payload)
      .select("id")
      .single();
    ctx.response = { status: null, body: data, code: error?.code ?? null };
    if (error) throw new Error(error.message);
    return data.id as string;
  });
  results.push(setup);
  if (!setup.ok) {
    return finalize(results, null, admin);
  }
  inquiryId = (setup as { value?: string }).value ?? null;

  // ---- 2. Walk the happy path as the test admin --------------------------
  for (const [from, to] of HAPPY_PATH) {
    const step = await timed(`transition: ${from} → ${to}`, async (ctx) => {
      ctx.request = {
        kind: "db",
        method: "UPDATE",
        target: "public.concierge_inquiries",
        body: { status: to },
        filter: { id: inquiryId, status: from },
      };
      const { data, error } = await testAdminClient
        .from("concierge_inquiries")
        .update({ status: to })
        .eq("id", inquiryId!)
        .eq("status", from)
        .select("status")
        .single();
      ctx.response = { status: null, body: data, code: error?.code ?? null };
      if (error) throw new Error(error.message);
      if (!data || data.status !== to) {
        throw new Error(`Expected status=${to}, got=${data?.status ?? "null"}`);
      }
      return data.status;
    });
    results.push(step);
    if (!step.ok) break;
  }

  // ---- 3. Negative probes (each must throw) ------------------------------
  for (const probe of ILLEGAL_PROBES) {
    const step = await timed(`reject: ${probe.from} → ${probe.to}`, async (ctx) => {
      // Force the row into the source state via service role (bypasses trigger
      // would re-fire) — but the trigger fires on UPDATE regardless of role.
      // Instead, create a sibling row pinned at probe.from.
      const probeId = crypto.randomUUID();
      const { error: insertErr } = await admin.from("concierge_inquiries").insert({
        id: probeId,
        user_name: `smoke-probe-${probeId}`,
        user_email: `probe-${probeId}@smoke.test`,
        user_phone: "+15555550100",
        status: probe.from,
        admin_notes: "AUTOMATED SMOKE TEST PROBE — safe to delete",
      });
      if (insertErr) throw new Error(`Probe seed failed: ${insertErr.message}`);

      ctx.request = {
        kind: "db",
        method: "UPDATE",
        target: "public.concierge_inquiries",
        body: { status: probe.to },
        filter: { id: probeId },
      };
      const { error: updateErr } = await testAdminClient
        .from("concierge_inquiries")
        .update({ status: probe.to })
        .eq("id", probeId);
      ctx.response = { status: null, body: updateErr?.message ?? null, code: updateErr?.code ?? null };

      // Cleanup the probe row regardless of outcome.
      await admin.from("concierge_inquiries").delete().eq("id", probeId);

      if (!updateErr) {
        throw new Error(`Trigger did NOT reject illegal transition ${probe.from} → ${probe.to}`);
      }
      return updateErr.message;
    });
    results.push(step);
  }

  // ---- 4. Required-field probes ------------------------------------------
  // Each MUST fail with the standard JSON envelope:
  //   { error: { code: string, message: string }, ...extras }
  // We invoke as the seeded test admin to exercise real auth + validation.
  const testAdminToken = signIn.session?.access_token;
  for (const probe of REQUIRED_FIELD_PROBES) {
    const step = await timed(`required-field: ${probe.name}`, async (ctx) => {
      const url = `${SUPABASE_URL}/functions/v1/${probe.fn}`;
      ctx.request = { kind: "http", method: "POST", target: url, body: probe.body };

      const acceptedKeywords = keywordsFor(probe);

      // Builds a failure message that always includes WHY it failed plus the
      // exact missing field, accepted keyword set, request body, and response
      // body so a developer can diagnose without re-running the suite.
      const fail = (
        reason: string,
        observed: { status?: number | null; body?: unknown } = {},
      ): never => {
        const diag = {
          reason,
          probe: probe.name,
          fn: probe.fn,
          expected: {
            status: probe.expectStatus,
            errorCode: probe.expectCode,
            missingField: probe.expectField,
            acceptedKeywords,
          },
          observed: {
            status: observed.status ?? null,
            body: observed.body ?? null,
          },
          requestBody: probe.body,
        };
        throw new Error(`${reason}\n${JSON.stringify(diag, null, 2)}`);
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testAdminToken}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify(probe.body),
      });
      const text = await res.text();
      const contentType = res.headers.get("content-type") ?? "";

      // 1. Response MUST be JSON.
      if (!contentType.toLowerCase().includes("application/json")) {
        ctx.response = { status: res.status, body: text };
        fail(
          `Expected JSON response (Content-Type: application/json), got "${contentType}"`,
          { status: res.status, body: text },
        );
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(text);
      } catch (parseErr) {
        ctx.response = { status: res.status, body: text };
        fail(`Response body was not valid JSON: ${(parseErr as Error).message}`, {
          status: res.status,
          body: text,
        });
      }
      ctx.response = { status: res.status, body: parsedBody };

      if (res.ok) {
        fail(`Expected failure but got HTTP ${res.status}`, {
          status: res.status,
          body: parsedBody,
        });
      }

      // 2. HTTP status must match expectation.
      if (res.status !== probe.expectStatus) {
        fail(`Expected HTTP ${probe.expectStatus}, got HTTP ${res.status}`, {
          status: res.status,
          body: parsedBody,
        });
      }

      // 3. Envelope shape: { error: { code, message } }.
      if (typeof parsedBody !== "object" || parsedBody === null) {
        fail(`Expected JSON object envelope, got: ${typeof parsedBody}`, {
          status: res.status,
          body: parsedBody,
        });
      }
      const envelope = parsedBody as Record<string, unknown>;
      const errObj = envelope.error;
      if (typeof errObj !== "object" || errObj === null) {
        fail(
          `Envelope missing "error" object. Found keys: [${Object.keys(envelope).join(", ")}]`,
          { status: res.status, body: parsedBody },
        );
      }
      const errRec = errObj as Record<string, unknown>;
      if (typeof errRec.code !== "string" || errRec.code.length === 0) {
        fail(`Envelope missing string "error.code"`, {
          status: res.status,
          body: parsedBody,
        });
      }
      if (typeof errRec.message !== "string" || errRec.message.length === 0) {
        fail(`Envelope missing string "error.message"`, {
          status: res.status,
          body: parsedBody,
        });
      }

      const code = errRec.code as string;
      const message = errRec.message as string;

      // 4. Exact error.code match.
      if (code !== probe.expectCode) {
        fail(`Expected error.code="${probe.expectCode}", got "${code}"`, {
          status: res.status,
          body: parsedBody,
        });
      }

      // 5. error.message must contain at least one accepted keyword for the
      //    field. The per-action keyword map (FIELD_KEYWORDS) tolerates copy
      //    variants like "inquiryId" / "inquiry_id" / "inquiry id".
      const lowerMsg = message.toLowerCase();
      const matched = acceptedKeywords.some((k) => lowerMsg.includes(k));
      if (!matched) {
        fail(
          `error.message did not name field "${probe.expectField}" — none of [${acceptedKeywords.join(", ")}] found`,
          { status: res.status, body: parsedBody },
        );
      }

      return `HTTP ${res.status} · code=${code} · field="${probe.expectField}"`;
    });
    results.push(step);
  }

  return finalize(results, inquiryId, admin);
});

async function finalize(
  results: StepResult[],
  inquiryId: string | null,
  admin: SupabaseClient,
): Promise<Response> {
  // Teardown: always attempt to delete the ephemeral inquiry.
  if (inquiryId) {
    const teardown = await timed("teardown: delete ephemeral inquiry", async (ctx) => {
      ctx.request = {
        kind: "db",
        method: "DELETE",
        target: "public.concierge_inquiries",
        filter: { id: inquiryId },
      };
      const { error } = await admin.from("concierge_inquiries").delete().eq("id", inquiryId);
      ctx.response = { status: null, body: null, code: error?.code ?? null };
      if (error) throw new Error(error.message);
      return "deleted";
    });
    results.push(teardown);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);

  return new Response(
    JSON.stringify(
      {
        ok: failed === 0,
        summary: { total: results.length, passed, failed, totalMs },
        results,
        runAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    {
      status: failed === 0 ? 200 : 207,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
