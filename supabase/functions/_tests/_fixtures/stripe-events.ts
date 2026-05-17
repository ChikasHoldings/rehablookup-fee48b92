// Fixtures for Stripe webhook payloads we handle.
//
// Each builder returns a (mostly) realistic Stripe.Event JSON suitable
// for POSTing to the stripe-webhook endpoint with a valid signature.
// The shapes match Stripe API 2025-08-27.basil which stripe-webhook
// pins to.
//
// To produce a valid stripe-signature header for the body, use the
// node Stripe lib's `stripe.webhooks.generateTestHeaderString({
//   payload, secret, timestamp })` — see _tests/stripe-webhook-e2e_test.ts.

export interface BuildArgs {
  /** Stripe event id — keep unique per test or rely on the webhook's
   *  claim_stripe_webhook_event dedup to swallow retries. */
  eventId: string;
  /** Unix seconds for the event's created timestamp. */
  createdAt?: number;
  /** Stripe customer id. */
  customerId: string;
  /** Stripe subscription id. */
  subscriptionId: string;
  /** Stripe price id resolved from lookup key (rl_pro_monthly_v1 etc.).
   *  Use any value — the webhook reads price.lookup_key, not the id. */
  priceId: string;
  /** Lookup key — one of rl_pro_monthly_v1 / rl_pro_annual_v1 /
   *  rl_featured_monthly_v1 / rl_featured_annual_v1 /
   *  rl_concierge_monthly_v1 / rl_concierge_annual_v1. */
  priceLookupKey: string;
  /** Recurring interval ("month" or "year"). */
  interval?: "month" | "year";
  /** Unit amount cents (full monthly rate; webhook reconstructs
   *  discounts for annual). */
  unitAmountCents: number;
  /** Optional metadata.type = 'featured_addon' | 'concierge_addon' */
  addonType?: "featured_addon" | "concierge_addon";
  /** Provider's facility id (required when addonType is set). */
  facilityId?: string;
  /** Provider's user id (required when addonType is set). */
  providerUserId?: string;
  /** Current period start/end (Unix seconds). */
  periodStart?: number;
  periodEnd?: number;
  /** For subscription.updated: previous status to test transitions. */
  previousStatus?: "active" | "past_due";
}

interface MinimalSubscription {
  id: string;
  object: "subscription";
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  cancellation_details: { reason: string | null } | null;
  metadata: Record<string, string>;
  items: {
    object: "list";
    data: Array<{
      id: string;
      object: "subscription_item";
      price: {
        id: string;
        object: "price";
        lookup_key: string;
        recurring: { interval: "month" | "year" };
        unit_amount: number;
        currency: string;
        product: string;
      };
      quantity: number;
    }>;
  };
}

function buildSubscription(args: BuildArgs, status: string): MinimalSubscription {
  const now = args.createdAt ?? Math.floor(Date.now() / 1000);
  const periodStart = args.periodStart ?? now;
  const periodEnd = args.periodEnd ?? now + 30 * 24 * 60 * 60;
  const metadata: Record<string, string> = {};
  if (args.addonType && args.facilityId) {
    metadata.type = args.addonType;
    metadata.facility_id = args.facilityId;
    if (args.providerUserId) metadata.provider_user_id = args.providerUserId;
    metadata.billing_period = args.interval === "year" ? "annual" : "monthly";
  }
  return {
    id: args.subscriptionId,
    object: "subscription",
    customer: args.customerId,
    status,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: false,
    cancellation_details: null,
    metadata,
    items: {
      object: "list",
      data: [
        {
          id: `si_${args.subscriptionId.slice(-8)}`,
          object: "subscription_item",
          price: {
            id: args.priceId,
            object: "price",
            lookup_key: args.priceLookupKey,
            recurring: { interval: args.interval ?? "month" },
            unit_amount: args.unitAmountCents,
            currency: "usd",
            product: "prod_test",
          },
          quantity: 1,
        },
      ],
    },
  };
}

function buildEvent(args: BuildArgs, type: string, data: object) {
  return {
    id: args.eventId,
    object: "event" as const,
    api_version: "2025-08-27.basil",
    created: args.createdAt ?? Math.floor(Date.now() / 1000),
    type,
    data: { object: data, previous_attributes: args.previousStatus ? { status: args.previousStatus } : undefined },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  };
}

export function subscriptionCreated(args: BuildArgs) {
  return buildEvent(args, "customer.subscription.created", buildSubscription(args, "active"));
}

export function subscriptionUpdatedRecovery(args: BuildArgs) {
  // status active, previous_attributes.status = past_due → recovery path
  const a = { ...args, previousStatus: "past_due" as const };
  return buildEvent(a, "customer.subscription.updated", buildSubscription(a, "active"));
}

export function subscriptionUpdatedToPastDue(args: BuildArgs) {
  const a = { ...args, previousStatus: "active" as const };
  return buildEvent(a, "customer.subscription.updated", buildSubscription(a, "past_due"));
}

export function subscriptionDeleted(args: BuildArgs) {
  return buildEvent(args, "customer.subscription.deleted", buildSubscription(args, "canceled"));
}

export function checkoutSessionCompletedSubscription(args: BuildArgs) {
  const session = {
    id: `cs_test_${args.subscriptionId.slice(-12)}`,
    object: "checkout.session",
    customer: args.customerId,
    customer_email: null,
    mode: "subscription",
    payment_status: "paid",
    status: "complete",
    subscription: args.subscriptionId,
    metadata: args.addonType
      ? { type: args.addonType, facility_id: args.facilityId ?? "", plan: "addon" }
      : { type: "pro_subscription", plan: "pro" },
  };
  return buildEvent(args, "checkout.session.completed", session);
}

export function invoicePaymentFailed(args: BuildArgs) {
  const invoice = {
    id: `in_test_${args.eventId.slice(-10)}`,
    object: "invoice",
    customer: args.customerId,
    subscription: args.subscriptionId,
    amount_due: args.unitAmountCents,
    amount_paid: 0,
    attempt_count: 1,
    status: "open",
    metadata: {},
  };
  return buildEvent(args, "invoice.payment_failed", invoice);
}

export function invoicePaymentSucceeded(args: BuildArgs) {
  const invoice = {
    id: `in_test_${args.eventId.slice(-10)}`,
    object: "invoice",
    customer: args.customerId,
    subscription: args.subscriptionId,
    amount_due: args.unitAmountCents,
    amount_paid: args.unitAmountCents,
    status: "paid",
    metadata: {},
  };
  return buildEvent(args, "invoice.payment_succeeded", invoice);
}
