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
// with a clear, user-facing error when a required field is missing.
// We assert on the error message so a regression in copy fails loudly.
type RequiredFieldProbe = {
  name: string;
  fn: "confirm-placement" | "admin-manage-invoice";
  body: Record<string, unknown>;
  /** Substring(s) the error message must contain (case-insensitive). */
  expect: string[];
};
const REQUIRED_FIELD_PROBES: RequiredFieldProbe[] = [
  {
    name: "confirm-placement: missing inquiryId",
    fn: "confirm-placement",
    body: { facilityId: "00000000-0000-0000-0000-000000000000", confirmationType: "admin" },
    expect: ["required"],
  },
  {
    name: "confirm-placement: missing facilityId",
    fn: "confirm-placement",
    body: { inquiryId: "00000000-0000-0000-0000-000000000000", confirmationType: "admin" },
    expect: ["required"],
  },
  {
    name: "confirm-placement: missing confirmationType",
    fn: "confirm-placement",
    body: {
      inquiryId: "00000000-0000-0000-0000-000000000000",
      facilityId: "00000000-0000-0000-0000-000000000000",
    },
    expect: ["required"],
  },
  {
    name: "admin-manage-invoice: missing invoiceId",
    fn: "admin-manage-invoice",
    body: { action: "waive", reason: "smoke test reason" },
    expect: ["required"],
  },
  {
    name: "admin-manage-invoice: waive without reason",
    fn: "admin-manage-invoice",
    body: { invoiceId: "00000000-0000-0000-0000-000000000000", action: "waive" },
    expect: ["reason"],
  },
  {
    name: "admin-manage-invoice: override without amount",
    fn: "admin-manage-invoice",
    body: {
      invoiceId: "00000000-0000-0000-0000-000000000000",
      action: "override",
      reason: "smoke test reason",
    },
    expect: ["amount", "required"],
  },
];

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
    const step = await timed(`transition: ${from} → ${to}`, async () => {
      const { data, error } = await testAdminClient
        .from("concierge_inquiries")
        .update({ status: to })
        .eq("id", inquiryId!)
        .eq("status", from)
        .select("status")
        .single();
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
    const step = await timed(`reject: ${probe.from} → ${probe.to}`, async () => {
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

      const { error: updateErr } = await testAdminClient
        .from("concierge_inquiries")
        .update({ status: probe.to })
        .eq("id", probeId);

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
  // Each MUST fail with an error message that names the missing field clearly.
  // We invoke as the seeded test admin to exercise real auth + validation.
  const testAdminToken = signIn.session?.access_token;
  for (const probe of REQUIRED_FIELD_PROBES) {
    const step = await timed(`required-field: ${probe.name}`, async () => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${probe.fn}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testAdminToken}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify(probe.body),
      });
      const text = await res.text();

      if (res.ok) {
        throw new Error(`Expected failure but got HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      // Parse error message — fall back to raw text if non-JSON.
      let message = text;
      try {
        const parsed = JSON.parse(text);
        message = String(parsed.error ?? parsed.message ?? text);
      } catch {
        // keep raw text
      }

      const lower = message.toLowerCase();
      const matched = probe.expect.some((kw) => lower.includes(kw.toLowerCase()));
      if (!matched) {
        throw new Error(
          `Error message did not mention any of [${probe.expect.join(", ")}]. ` +
            `Got: "${message.slice(0, 200)}"`,
        );
      }
      return `HTTP ${res.status}: ${message.slice(0, 120)}`;
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
    const teardown = await timed("teardown: delete ephemeral inquiry", async () => {
      const { error } = await admin.from("concierge_inquiries").delete().eq("id", inquiryId);
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
