import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_RELOAD_AMOUNTS = new Set([20000, 50000, 100000]);

// Bonus mapping (must match purchase-credits)
const TIER_BONUSES: Record<number, number> = {
  20000: 0,
  50000: 5000,
  100000: 20000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Helper: build a uniform JSON response. Every rejection path returns
  // { error|skipped, code, reason, details? } so log scraping and dashboards
  // can pivot on a stable machine-readable `code` instead of fuzzy strings.
  // We deliberately never echo the HMAC, service-role key, full provider IDs
  // (only an 8-char prefix), or Stripe customer IDs.
  const json = (
    status: number,
    body: Record<string, unknown>,
  ) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const shortId = (id: string | null | undefined) =>
    typeof id === "string" && id.length >= 8 ? `${id.slice(0, 8)}…` : null;

  try {
    // This function is called internally after a lead unlock.
    // H5: require an HMAC signature derived from SUPABASE_SERVICE_ROLE_KEY so a leaked
    // bearer token alone cannot trigger off-session card charges. The signature covers
    // (providerId|timestamp) and the timestamp must be within a 5-minute window.
    const sigHeader = req.headers.get("X-Internal-Trigger-Sig");
    const tsHeader = req.headers.get("X-Internal-Trigger-Ts");
    if (!sigHeader || !tsHeader) {
      return json(401, {
        error: "Missing internal trigger signature",
        code: "AUTH_MISSING_SIGNATURE",
        reason:
          "auto-reload-credits requires both X-Internal-Trigger-Sig and X-Internal-Trigger-Ts headers",
        details: {
          hasSigHeader: Boolean(sigHeader),
          hasTsHeader: Boolean(tsHeader),
          expectedHeaders: ["X-Internal-Trigger-Sig", "X-Internal-Trigger-Ts"],
        },
      });
    }
    const tsNum = Number(tsHeader);
    const nowMs = Date.now();
    const skewMs = Number.isFinite(tsNum) ? nowMs - tsNum : null;
    const MAX_SKEW_MS = 5 * 60 * 1000;
    if (!Number.isFinite(tsNum) || Math.abs(skewMs ?? Infinity) > MAX_SKEW_MS) {
      return json(401, {
        error: "Stale or invalid trigger timestamp",
        code: !Number.isFinite(tsNum)
          ? "AUTH_TS_NOT_NUMERIC"
          : "AUTH_TS_OUT_OF_WINDOW",
        reason: !Number.isFinite(tsNum)
          ? "X-Internal-Trigger-Ts must be a unix-millis number"
          : `Trigger timestamp must be within ±${MAX_SKEW_MS / 1000}s of server time`,
        details: {
          serverNowMs: nowMs,
          receivedTs: tsHeader,
          skewMs,
          maxSkewMs: MAX_SKEW_MS,
        },
      });
    }

    const { providerId, currentBalanceCents } = await req.json();

    if (!providerId || typeof currentBalanceCents !== "number") {
      return json(400, {
        error: "Missing providerId or currentBalanceCents",
        code: "BAD_REQUEST_BODY",
        reason:
          "Body must include a non-empty `providerId` (uuid) and numeric `currentBalanceCents`",
        details: {
          hasProviderId: Boolean(providerId),
          providerIdType: typeof providerId,
          currentBalanceCentsType: typeof currentBalanceCents,
        },
      });
    }

    // Verify HMAC over `${providerId}|${ts}` using the service-role key.
    {
      const enc = new TextEncoder();
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(serviceRoleKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sigBuf = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        enc.encode(`${providerId}|${tsHeader}`)
      );
      const expected = Array.from(new Uint8Array(sigBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      // Constant-time-ish compare
      if (
        expected.length !== sigHeader.length ||
        !expected.split("").every((c, i) => c === sigHeader[i])
      ) {
        // SECURITY: never echo `expected` — that would let any caller mint a
        // valid signature. We only return shape diagnostics (lengths) so
        // operators can spot encoding issues (e.g. base64 vs hex) without
        // recovering the secret.
        return json(401, {
          error: "Invalid internal trigger signature",
          code: "AUTH_SIGNATURE_MISMATCH",
          reason:
            "HMAC-SHA256 over `${providerId}|${X-Internal-Trigger-Ts}` did not match X-Internal-Trigger-Sig",
          details: {
            providerIdPrefix: shortId(providerId),
            receivedSigLength: sigHeader.length,
            expectedSigLength: expected.length,
            hexCharsetOk: /^[0-9a-f]+$/i.test(sigHeader),
            algorithm: "HMAC-SHA256",
            payloadFormat: "${providerId}|${ts}",
          },
        });
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch auto-reload settings (explicit columns — never select *)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("provider_auto_reload_settings")
      .select("provider_id, facility_id, enabled, threshold_cents, reload_amount_cents")
      .eq("provider_id", providerId)
      .eq("enabled", true)
      .maybeSingle();

    if (settingsError || !settings) {
      return json(200, {
        skipped: true,
        code: settingsError ? "SETTINGS_QUERY_FAILED" : "SETTINGS_NOT_FOUND_OR_DISABLED",
        reason: settingsError
          ? "Failed to load provider_auto_reload_settings row"
          : "No row matched provider_id with enabled=true (either not configured or auto-reload turned off)",
        details: {
          providerIdPrefix: shortId(providerId),
          dbErrorCode: settingsError?.code ?? null,
          dbErrorMessage: settingsError?.message ?? null,
        },
      });
    }

    // Check if balance is below threshold
    if (currentBalanceCents >= settings.threshold_cents) {
      return json(200, {
        skipped: true,
        code: "BALANCE_ABOVE_THRESHOLD",
        reason:
          "Current balance is at or above the configured auto-reload threshold; nothing to do",
        details: {
          currentBalanceCents,
          thresholdCents: settings.threshold_cents,
          differenceCents: currentBalanceCents - settings.threshold_cents,
        },
      });
    }

    // Validate reload amount
    if (!VALID_RELOAD_AMOUNTS.has(settings.reload_amount_cents)) {
      return json(400, {
        error: "Invalid reload amount in settings",
        code: "INVALID_RELOAD_AMOUNT",
        reason:
          "provider_auto_reload_settings.reload_amount_cents is not one of the supported tiers",
        details: {
          configuredAmountCents: settings.reload_amount_cents,
          allowedAmountsCents: [...VALID_RELOAD_AMOUNTS],
        },
      });
    }

    // Get user email for Stripe customer lookup
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(providerId);
    if (!userData?.user?.email) {
      return json(404, {
        error: "User not found",
        code: "USER_NOT_FOUND",
        reason:
          "supabase.auth.admin.getUserById returned no user (or no email) for this provider",
        details: { providerIdPrefix: shortId(providerId) },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find existing Stripe customer
    const customers = await stripe.customers.list({
      email: userData.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      // No Stripe customer = no saved payment method, can't auto-charge
      return json(200, {
        skipped: true,
        code: "NO_STRIPE_CUSTOMER",
        reason:
          "No Stripe customer exists for this provider's email — cannot off-session charge",
        details: { providerIdPrefix: shortId(providerId) },
      });
    }

    const customer = customers.data[0];

    // Get default payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: "card",
      limit: 1,
    });

    if (paymentMethods.data.length === 0) {
      return json(200, {
        skipped: true,
        code: "NO_PAYMENT_METHOD",
        reason:
          "Stripe customer exists but has no card on file — cannot off-session charge",
        details: { providerIdPrefix: shortId(providerId) },
      });
    }

    const paymentMethodId = paymentMethods.data[0].id;
    const amountCents = settings.reload_amount_cents;
    const bonusCents = TIER_BONUSES[amountCents] ?? 0;
    const totalCreditsCents = amountCents + bonusCents;
    const facilityId = settings.facility_id;

    // Idempotency layer 1: per-provider advisory lock (sub-second protection)
    // Two near-simultaneous unlocks would each pass the threshold check and
    // try to charge. The advisory lock guarantees only one charge attempt
    // wins; the loser short-circuits cleanly.
    const { data: lockAcquired } = await supabaseAdmin.rpc(
      "try_acquire_auto_reload_lock",
      { p_provider_id: providerId }
    );

    if (lockAcquired === false) {
      return json(200, {
        skipped: true,
        code: "AUTO_RELOAD_LOCK_HELD",
        reason:
          "Another auto-reload attempt is already in flight for this provider (advisory lock held)",
        details: {
          providerIdPrefix: shortId(providerId),
          lockSource: "try_acquire_auto_reload_lock",
        },
      });
    }

    // Idempotency layer 2: 5-minute window check (catches retries across requests)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentAutoReload } = await supabaseAdmin
      .from("credit_transactions")
      .select("id")
      .eq("provider_id", providerId)
      .eq("transaction_type", "purchase")
      .ilike("description", "%auto-reload%")
      .gte("created_at", fiveMinAgo)
      .limit(1);

    if (recentAutoReload && recentAutoReload.length > 0) {
      return json(200, {
        skipped: true,
        code: "RECENT_AUTO_RELOAD_FOUND",
        reason:
          "An auto-reload purchase was already recorded for this provider in the last 5 minutes",
        details: {
          providerIdPrefix: shortId(providerId),
          windowMinutes: 5,
          windowStart: fiveMinAgo,
        },
      });
    }


    // Create PaymentIntent and confirm immediately (off-session)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: customer.id,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        type: "credit_purchase",
        auto_reload: "true",
        user_id: providerId,
        facility_id: facilityId || "",
        amount_cents: amountCents.toString(),
        bonus_cents: bonusCents.toString(),
        total_credits_cents: totalCreditsCents.toString(),
      },
    });

    if (paymentIntent.status === "succeeded") {
      // Grant credits immediately
      const { error: txError } = await supabaseAdmin.from("credit_transactions").insert({
        provider_id: providerId,
        facility_id: facilityId,
        amount_cents: amountCents,
        transaction_type: "purchase",
        reference_id: `auto_reload_${paymentIntent.id}`,
        description: `Auto-reload: $${(amountCents / 100).toFixed(0)} in credits`,
        stripe_payment_intent_id: paymentIntent.id,
      });

      if (!txError) {
        // Add bonus if applicable
        if (bonusCents > 0) {
          await supabaseAdmin.from("credit_transactions").insert({
            provider_id: providerId,
            facility_id: facilityId,
            amount_cents: bonusCents,
            transaction_type: "bonus",
            reference_id: `auto_reload_${paymentIntent.id}_bonus`,
            description: `Bonus credits from auto-reload ($${(amountCents / 100).toFixed(0)} purchase)`,
            stripe_payment_intent_id: paymentIntent.id,
          });
        }

        // Increment balance atomically
        await supabaseAdmin.rpc("increment_provider_credits", {
          p_provider_id: providerId,
          p_facility_id: facilityId,
          p_amount_cents: totalCreditsCents,
        });
      }

      return json(200, {
        success: true,
        code: "AUTO_RELOAD_CHARGED",
        amountCharged: amountCents,
        bonusCents,
        creditsAdded: totalCreditsCents,
        paymentIntentId: paymentIntent.id,
      });
    }

    return json(200, {
      skipped: true,
      code: "PAYMENT_NOT_SUCCEEDED",
      reason:
        "Stripe PaymentIntent did not reach `succeeded` status on the synchronous off-session attempt",
      details: {
        paymentIntentStatus: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    const err = error as { message?: string; code?: string; type?: string };
    console.error("[auto-reload-credits] Error:", err?.message ?? err);
    return json(500, {
      error: "Auto-reload failed",
      code: "UNHANDLED_EXCEPTION",
      reason: err?.message ?? "Unknown error",
      details: {
        errorCode: err?.code ?? null,
        errorType: err?.type ?? null,
      },
    });
  }
});
