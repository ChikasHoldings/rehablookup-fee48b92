// set-renewal-switch-flag
// ────────────────────────
// Toggles `switch_to_monthly_at_renewal` on a facility_subscription.
// Used by the renewal-reminder banner UI: annual subscribers can opt
// to switch to monthly at their next renewal. The renewal invoice
// handler reads this flag and creates a monthly subscription instead
// of renewing the annual one.
//
// Only valid for currently-annual subscribers. Monthly subscribers
// use the switch-to-annual flow instead (which is immediate at
// period_end, not at "renewal").

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  subscription_id: z.string().uuid(),
  switch_at_renewal: z.boolean(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST, OPTIONS" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: sub } = await admin
    .from("facility_subscriptions")
    .select("provider_id, billing_period, tier")
    .eq("id", parsed.data.subscription_id)
    .maybeSingle();
  if (!sub) {
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (sub.provider_id !== user.id) {
    return new Response(JSON.stringify({ error: "Not your subscription", code: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // PRO-ONLY OPERATION — stated, not inferred.
  //
  // `switch_to_monthly_at_renewal` controls how the PRO subscription renews.
  // Since 20260902000000 a row can be a Featured-only row (tier='free'), and
  // this function previously read only provider_id + billing_period — it never
  // established that a Pro subscription existed at all.
  //
  // Today a Featured-only row is refused only as a side effect: the Featured
  // insert omits billing_period, so it takes the column DEFAULT 'monthly' and
  // trips the not_annual check below. That is not a decision, it is a default
  // value doing safety work. A Featured ANNUAL purchase that recorded
  // billing_period='annual' on the same row — a reasonable future change —
  // would pass every existing guard and write Pro renewal state onto a
  // facility that has no Pro subscription. Require Pro explicitly.
  if (sub.tier !== "pro") {
    return new Response(
      JSON.stringify({
        error: "This is not a Pro subscription. Featured advertising renews on its own schedule.",
        code: "not_pro_subscription",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (sub.billing_period !== "annual") {
    return new Response(
      JSON.stringify({
        error: "Only annual subscriptions can set the switch-to-monthly-at-renewal flag",
        code: "not_annual",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { error: updErr } = await admin
    .from("facility_subscriptions")
    .update({
      switch_to_monthly_at_renewal: parsed.data.switch_at_renewal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.subscription_id);
  if (updErr) {
    console.error("[set-renewal-switch-flag] update failed", updErr);
    return new Response(JSON.stringify({ error: "Failed to update flag" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ ok: true, switch_to_monthly_at_renewal: parsed.data.switch_at_renewal }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
