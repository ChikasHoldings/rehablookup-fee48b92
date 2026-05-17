// provider-self-cancel-subscription
// ──────────────────────────────────
// Self-service cancellation endpoint for providers. Wraps the shared
// cancelSubscriptionAndRefund executor — same logic the admin endpoint
// uses, but the caller is the provider themselves and ownership is
// checked against facilities.user_id = auth.uid().
//
// triggeredBy stays = user.id so Stripe refund.reason gets tagged
// 'duplicate' (which Stripe interprets as a non-customer-initiated
// refund). For self-cancellation, we tag it 'requested_by_customer'
// which is the proper reason when the customer self-cancels.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { z } from "https://esm.sh/zod@3.23.8?target=denonext";
import { cancelSubscriptionAndRefund } from "../_shared/cancel-subscription.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  subscription_id: z.string().uuid(),
  scope: z.enum(["all", "addon-featured", "addon-concierge"]),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
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
    return new Response(JSON.stringify({ error: "Unauthorized", code: "auth_failed" }), {
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
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: parsed.error.issues }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Ownership: verify the caller is the provider on this subscription.
  const { data: subOwner } = await admin
    .from("facility_subscriptions")
    .select("provider_id")
    .eq("id", parsed.data.subscription_id)
    .maybeSingle();
  if (!subOwner) {
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (subOwner.provider_id !== user.id) {
    return new Response(JSON.stringify({ error: "Not your subscription", code: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const result = await cancelSubscriptionAndRefund(parsed.data.subscription_id, {
      scope: parsed.data.scope,
      // Self-cancellation reason — Stripe's "requested_by_customer" reason.
      reason: parsed.data.reason
        ? `self-cancel: ${parsed.data.reason}`
        : "self-cancel: provider initiated",
      // triggeredBy stays null on self-cancellations so the Stripe refund
      // reason maps to 'requested_by_customer' (rather than 'duplicate'
      // which we use for admin-initiated refunds).
      triggeredBy: null,
    });
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[provider-self-cancel-subscription] failed", err);

    // Round-30 split-brain guard: cancelSubscriptionAndRefund may have
    // issued the Stripe refund(s) before throwing. If the DB write to
    // mark the row 'canceled' didn't happen, the user keeps Pro/Featured/
    // Concierge benefits AFTER getting refunded. Attempt a synchronous
    // fallback that just flips the status flag, then surface to admin
    // so a human reconciles whatever state Stripe is in vs the DB.
    const errMessage = err instanceof Error ? err.message : String(err);
    let fallbackOk = false;
    try {
      const { error: fbErr } = await admin
        .from("facility_subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", parsed.data.subscription_id);
      fallbackOk = !fbErr;
      if (fbErr) {
        console.error("[provider-self-cancel-subscription] fallback DB update failed", fbErr);
      }
    } catch (fbCatch) {
      console.error("[provider-self-cancel-subscription] fallback DB update threw", fbCatch);
    }
    try {
      await admin.from("admin_notifications").insert({
        type: "cancellation_split_brain",
        title: "Self-cancel failed mid-flight",
        message:
          `cancelSubscriptionAndRefund threw for subscription ${parsed.data.subscription_id} ` +
          `(scope=${parsed.data.scope}, user=${user.id}). Error: ${errMessage}. ` +
          `Fallback row-status update ${fallbackOk ? "succeeded" : "ALSO FAILED"}. ` +
          `Reconcile with Stripe.`,
        metadata: {
          subscription_id: parsed.data.subscription_id,
          scope: parsed.data.scope,
          user_id: user.id,
          last_error: errMessage,
          fallback_ok: fallbackOk,
        } as Record<string, unknown>,
      });
    } catch (adminErr) {
      console.error("[provider-self-cancel-subscription] admin_notifications insert failed", adminErr);
    }

    return new Response(
      JSON.stringify({
        error: errMessage,
        code: "execution_failed",
        partial_recovery: fallbackOk,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
