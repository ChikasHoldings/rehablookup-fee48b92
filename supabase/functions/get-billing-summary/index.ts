// ============================================================================
// get-billing-summary v1.0.0
// ----------------------------------------------------------------------------
// Returns the real Stripe-backed billing summary for a provider's facility so
// the Billing page can show the current payment method + recent invoices
// in-app (not only behind the Stripe customer portal).
//
// Body: { facility_id: uuid }
// Auth: provider JWT; must own the facility.
//
// Resolves the Stripe customer from facility_subscriptions.stripe_customer_id
// (falling back to the caller's email), then returns:
//   - paymentMethod: { brand, last4, expMonth, expYear } | null
//   - invoices: [{ id, number, created, amountPaid, currency, status,
//                  hostedInvoiceUrl, invoicePdf }]  (most recent first)
//
// Read-only against Stripe — never mutates. All upstream calls are wrapped in
// withTimeout so a slow Stripe never holds the invocation open.
// ============================================================================
import Stripe from "https://esm.sh/stripe@18.5.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";
import { withTimeout } from "../_shared/with-timeout.ts";

const VERSION = "1.0.0";
const STRIPE_TIMEOUT_MS = 12_000;
const SUPABASE_TIMEOUT_MS = 8_000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ ...body, _version: VERSION }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SRK || !STRIPE_SECRET_KEY) {
      return json(500, { error: "Server misconfigured", code: "SERVER_MISCONFIGURED" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentication required", code: "AUTH_MISSING" });
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data: u, error: uErr } = await withTimeout(
      anon.auth.getUser(authHeader.replace(/^Bearer\s+/i, "")),
      SUPABASE_TIMEOUT_MS,
      "supabase.auth.getUser",
    );
    if (uErr || !u?.user?.id) return json(401, { error: "Invalid authentication", code: "AUTH_INVALID" });
    const userId = u.user.id;
    const userEmail = u.user.email ?? undefined;

    let body: { facility_id?: string };
    try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON", code: "BAD_JSON" }); }
    const facilityId = String(body.facility_id ?? "").trim();
    if (!UUID_REGEX.test(facilityId)) {
      return json(400, { error: "facility_id must be a valid UUID", code: "INVALID_FACILITY_ID" });
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SRK, { auth: { persistSession: false } });

    // Ownership: the caller must own the facility.
    const { data: facility, error: facErr } = await withTimeout(
      svc.from("facilities").select("id, user_id").eq("id", facilityId).maybeSingle(),
      SUPABASE_TIMEOUT_MS,
      "facilities.lookup",
    );
    if (facErr) return json(500, { error: "Internal error", code: "DB_ERROR" });
    if (!facility) return json(404, { error: "Facility not found", code: "FACILITY_NOT_FOUND" });
    if ((facility as { user_id: string | null }).user_id !== userId) {
      return json(403, { error: "Not the owner of this facility", code: "NOT_OWNER" });
    }

    // Resolve the Stripe customer: stored id first, else by email.
    const { data: sub } = await withTimeout(
      svc.from("facility_subscriptions").select("stripe_customer_id").eq("facility_id", facilityId).maybeSingle(),
      SUPABASE_TIMEOUT_MS,
      "facility_subscriptions.lookup",
    );
    let customerId = (sub as { stripe_customer_id: string | null } | null)?.stripe_customer_id ?? null;

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" });

    if (!customerId && userEmail) {
      const customers = await withTimeout(
        stripe.customers.list({ email: userEmail, limit: 1 }),
        STRIPE_TIMEOUT_MS,
        "stripe.customers.list",
      );
      customerId = customers.data[0]?.id ?? null;
    }

    // No customer yet (e.g. Free, never subscribed) — return empty summary.
    if (!customerId) {
      return json(200, { paymentMethod: null, invoices: [], hasCustomer: false });
    }

    // Default payment method (from the customer's invoice_settings, else the
    // most recent attached card).
    let paymentMethod: Record<string, unknown> | null = null;
    const customer = await withTimeout(
      stripe.customers.retrieve(customerId),
      STRIPE_TIMEOUT_MS,
      "stripe.customers.retrieve",
    );
    const defaultPmId =
      !("deleted" in customer)
        ? (typeof customer.invoice_settings?.default_payment_method === "string"
            ? customer.invoice_settings.default_payment_method
            : customer.invoice_settings?.default_payment_method?.id)
        : undefined;

    const pmId = defaultPmId ?? undefined;
    if (pmId) {
      const pm = await withTimeout(
        stripe.paymentMethods.retrieve(pmId),
        STRIPE_TIMEOUT_MS,
        "stripe.paymentMethods.retrieve",
      );
      if (pm.card) {
        paymentMethod = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        };
      }
    } else {
      // Fall back to the most recent attached card.
      const pms = await withTimeout(
        stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 }),
        STRIPE_TIMEOUT_MS,
        "stripe.paymentMethods.list",
      );
      const card = pms.data[0]?.card;
      if (card) {
        paymentMethod = { brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year };
      }
    }

    // Recent invoices.
    const invList = await withTimeout(
      stripe.invoices.list({ customer: customerId, limit: 6 }),
      STRIPE_TIMEOUT_MS,
      "stripe.invoices.list",
    );
    const invoices = invList.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      created: inv.created,
      amountPaid: inv.amount_paid,
      amountDue: inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
    }));

    return json(200, { paymentMethod, invoices, hasCustomer: true });
  } catch (error) {
    console.error("[get-billing-summary] error", error instanceof Error ? error.message : String(error));
    return json(500, { error: "Couldn't load billing details. Please try again.", code: "UNHANDLED" });
  }
});
