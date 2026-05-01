// ============================================================================
// verify-unlock-payment
// Audit fix M1.
//
// Reconciles a Stripe-paid lead unlock when the user lands back on
// /provider/inquiries?unlock_success=true&lead=…&session_id=cs_… If the
// `stripe-webhook` listener has already created the `lead_unlocks` row, this
// fn confirms it. If the webhook is delayed/lost, we create the row here as a
// fallback so the UI doesn't show a still-locked card after the user paid.
//
// This is idempotent:
//   - If the row exists → return success.
//   - If the Stripe session is paid AND no row exists → create it.
//   - Otherwise → return paid:false / status.
// ============================================================================

import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (id: string, step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-UNLOCK-PAYMENT] [${VERSION}] [${id}] ${step}${d}`);
};

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!stripeKey || !supabaseUrl || !serviceKey || !anonKey) {
      throw new Error("Missing required environment configuration");
    }

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse + validate body
    const body = await req.json().catch(() => ({}));
    const { sessionId, leadId } = body as { sessionId?: string; leadId?: string };

    if (!sessionId || typeof sessionId !== "string" ||
        !sessionId.startsWith("cs_") || sessionId.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid sessionId", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!leadId || !uuidRegex.test(leadId)) {
      return new Response(JSON.stringify({ error: "Invalid leadId", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log(requestId, "verifying", { sessionId, leadId, userId: user.id });

    const admin = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 1. Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Defence-in-depth: confirm metadata matches caller and lead
    const meta = session.metadata ?? {};
    if (meta.type !== "lead_unlock") {
      return new Response(JSON.stringify({ error: "Wrong session type", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (meta.user_id !== user.id) {
      log(requestId, "user_id mismatch", { metaUser: meta.user_id, caller: user.id });
      return new Response(JSON.stringify({ error: "Session does not belong to caller", requestId }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (meta.lead_id !== leadId) {
      log(requestId, "lead_id mismatch", { metaLead: meta.lead_id, paramLead: leadId });
      return new Response(JSON.stringify({ error: "Session does not match lead", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const facilityId = meta.facility_id as string | undefined;
    if (!facilityId || !uuidRegex.test(facilityId)) {
      return new Response(JSON.stringify({ error: "Session missing facility_id", requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Has the webhook already created the unlock row?
    const { data: existing } = await admin
      .from("lead_unlocks")
      .select("id, unlocked_at, unlock_price_cents")
      .eq("lead_id", leadId)
      .eq("facility_id", facilityId)
      .maybeSingle();

    if (existing) {
      log(requestId, "already unlocked (webhook ran)", { unlockId: existing.id });
      return new Response(JSON.stringify({
        paid: true,
        alreadyUnlocked: true,
        unlock: existing,
        requestId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. No row yet — only proceed if Stripe says paid
    if (session.payment_status !== "paid") {
      log(requestId, "session not paid", { status: session.payment_status });
      return new Response(JSON.stringify({
        paid: false,
        status: session.payment_status,
        requestId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Webhook was delayed/lost. Create the unlock row as fallback.
    // Verify facility ownership before writing.
    const { data: facility } = await admin
      .from("facilities")
      .select("id, user_id")
      .eq("id", facilityId)
      .single();
    if (!facility || facility.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Facility not found or unauthorized", requestId }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCents = session.amount_total ?? 0;
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    const { data: unlock, error: insertErr } = await admin
      .from("lead_unlocks")
      .insert({
        lead_id: leadId,
        provider_id: user.id,
        facility_id: facilityId,
        unlock_price_cents: amountCents,
        payment_method: "stripe",
        stripe_payment_intent_id: paymentIntentId,
      })
      .select("id, unlocked_at, unlock_price_cents")
      .single();

    if (insertErr) {
      // Race: webhook may have just inserted between our check and write.
      const { data: late } = await admin
        .from("lead_unlocks")
        .select("id, unlocked_at, unlock_price_cents")
        .eq("lead_id", leadId)
        .eq("facility_id", facilityId)
        .maybeSingle();
      if (late) {
        log(requestId, "race resolved — webhook won", { unlockId: late.id });
        return new Response(JSON.stringify({
          paid: true,
          alreadyUnlocked: true,
          unlock: late,
          requestId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      log(requestId, "ERROR insert failed", { error: insertErr.message });
      return new Response(JSON.stringify({ error: "Failed to record unlock", requestId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update lead status (best-effort, mirrors unlock-lead happy path)
    await admin
      .from("leads")
      .update({ status: "unlocked" })
      .eq("id", leadId)
      .in("status", ["new", "expired"]);

    log(requestId, "fallback unlock created", { unlockId: unlock.id, amountCents });

    return new Response(JSON.stringify({
      paid: true,
      reconciled: true,
      unlock,
      requestId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log(requestId, "ERROR", { message });
    return new Response(JSON.stringify({ error: "Verification failed", requestId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
