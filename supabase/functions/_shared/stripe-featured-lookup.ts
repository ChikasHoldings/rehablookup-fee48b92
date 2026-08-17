// ============================================================================
// Canonical "does this email hold paid Featured?" Stripe lookup.
//
// WHY THIS MODULE EXISTS
// ──────────────────────
// get-featured-facilities carried its own Stripe compatibility lookup:
//
//     const customers = await stripe.customers.list({ email, limit: 1 });
//     const subs = await stripe.subscriptions.list({
//       customer: customers.data[0].id, status: "active", limit: 1,
//     });
//     const productId = subs.data[0].items.data[0].price.product;
//     if (FEATURED_PRODUCT_IDS.includes(productId)) { /* Featured */ }
//
// Four independent defects, each of which silently DROPS a real Featured
// purchase or re-defines entitlement:
//
//   1. A second definition of Pro/Featured identity. The function declared its
//      own FEATURED_PRODUCT_IDS and PRO_PRODUCT_IDS, so the Stage-3 contract
//      lived in two places and could drift from the canonical classifier.
//   2. Modern lookup-key purchases were invisible. The live Featured SKUs bill
//      on prices carrying `rl_featured_monthly_v1` / `rl_featured_annual_v1`
//      against products the local id list has never heard of, so every modern
//      Featured subscription classified as "not Featured".
//   3. `limit: 1` on customers. Stripe permits several customer objects with
//      the same email; the Featured one need not be the first returned.
//   4. `limit: 1` on subscriptions and `items.data[0]`. Featured on the second
//      subscription, or as the second item of a Pro+Featured subscription, was
//      dropped — and a Pro item in position 0 actively masked it.
//
// The live audit found zero active subscriptions, so no current provider is
// mis-classified. This module is about making the NEXT purchase correct.
//
// WHAT THIS MODULE DOES NOT DO
// ────────────────────────────
// It answers exactly one question — "is there an active Featured subscription
// for this email?" — and nothing else. It never decides Pro. Canonical Pro
// identity is `public_facilities.is_pro` (= `has_active_pro(id)`) and is read
// from the database by the caller, never reconstructed from Stripe here.
//
// Classification semantics are NOT reimplemented: both recognised paths are
// imported from stripe-product-classification.ts, the single source of truth
// the webhook also uses. This module owns enumeration; that module owns
// meaning.
//
// The Stripe client is a structural interface rather than the esm.sh Stripe
// import, so the Vitest suite can drive the real enumeration logic with a fake
// client. A real `Stripe` instance satisfies the shape.
// ============================================================================

import {
  classifySubscriptionProducts,
  deriveTierFlagsFromSubscription,
  type ClassifiableSubscriptionItem,
} from "./stripe-product-classification.ts";

/** One page of a Stripe `list` response. */
export interface StripeListPage<T> {
  data: T[];
  has_more?: boolean;
}

/** The parts of a Stripe customer this lookup reads. */
export interface FeaturedLookupCustomer {
  id: string;
}

/**
 * The parts of a Stripe subscription this lookup reads.
 *
 * `items.has_more` matters: Stripe embeds only the first page of items on the
 * subscription object, so a subscription with many items can hide Featured
 * beyond the embedded window.
 */
export interface FeaturedLookupSubscription {
  id: string;
  items: { data: ReadonlyArray<ClassifiableSubscriptionItem>; has_more?: boolean };
  metadata?: Record<string, string> | null;
}

/** Subscription items are paginated separately when `items.has_more` is set. */
export type FeaturedLookupSubscriptionItem = ClassifiableSubscriptionItem & { id?: string };

/**
 * Structural subset of the Stripe SDK this lookup needs. A real `Stripe`
 * instance satisfies it; tests inject a fake.
 */
export interface FeaturedLookupStripeClient {
  customers: {
    list(params: {
      email: string;
      limit: number;
      starting_after?: string;
    }): Promise<StripeListPage<FeaturedLookupCustomer>>;
  };
  subscriptions: {
    list(params: {
      customer: string;
      status: "active";
      limit: number;
      starting_after?: string;
    }): Promise<StripeListPage<FeaturedLookupSubscription>>;
  };
  subscriptionItems: {
    list(params: {
      subscription: string;
      limit: number;
      starting_after?: string;
    }): Promise<StripeListPage<FeaturedLookupSubscriptionItem>>;
  };
}

export interface FeaturedLookupOptions {
  /** Stripe page size. 100 is Stripe's maximum. */
  pageSize?: number;
  /**
   * Operational failure sink. Receives a stage label and a short reason.
   * Never receives the email, customer ids, or raw Stripe error objects — see
   * `safeReason`.
   */
  onError?: (stage: string, reason: string) => void;
}

/** Stripe's maximum page size. */
const DEFAULT_PAGE_SIZE = 100;

/**
 * Hard bound on pages per list. Not an expected limit — 50 × 100 = 5,000
 * objects per dimension — but a loop that cannot terminate is a worse failure
 * than an incomplete answer, and a Stripe response that always reports
 * `has_more` would otherwise hang the homepage function forever.
 */
const MAX_PAGES = 50;

/**
 * Reduce an unknown thrown value to a short, non-sensitive label.
 *
 * Stripe errors can carry the request payload — which contains the provider's
 * email — plus `Authorization` headers in some serializations. Only the error
 * type/name and message are logged, and the message is truncated. Callers get
 * enough to page an operator, nothing that leaks a credential or a customer.
 */
function safeReason(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as { type?: unknown; name?: unknown; message?: unknown };
    const kind = typeof o.type === "string" ? o.type : typeof o.name === "string" ? o.name : "Error";
    const msg = typeof o.message === "string" ? o.message.slice(0, 120) : "";
    return msg ? `${kind}: ${msg}` : kind;
  }
  return "unknown error";
}

/**
 * True when a fully materialized subscription grants Featured.
 *
 * The ONLY two ways Featured can be granted, both owned by the canonical
 * classifier:
 *
 *   A. modern lookup keys — `deriveTierFlagsFromSubscription().has_featured`
 *      (rl_featured_monthly_v1 / rl_featured_annual_v1)
 *   B. legacy product ids — `classifySubscriptionProducts().hasLegacyFeaturedProduct`
 *
 * Everything else is false by construction: Pro keys, legacy Pro product ids,
 * Concierge keys, unknown products, and metadata all fail to satisfy either
 * predicate. `has_featured` in particular is derived only from FEATURED_KEYS,
 * so no metadata claim can invent a Featured entitlement.
 *
 * Note this reads the COMPLETE item set, so Featured in position 2+ counts and
 * a Pro item in position 0 cannot mask it.
 */
export function subscriptionGrantsFeatured(sub: {
  items: { data: ReadonlyArray<ClassifiableSubscriptionItem> };
  metadata?: Record<string, string> | null;
}): boolean {
  const items = sub.items?.data ?? [];
  if (deriveTierFlagsFromSubscription({ items: { data: items }, metadata: sub.metadata })
    .has_featured === true) {
    return true;
  }
  return classifySubscriptionProducts(items).hasLegacyFeaturedProduct === true;
}

/**
 * Advance a cursor to the last object id of a page.
 *
 * Returns null when the page is empty or its last object has no usable id —
 * both cases mean "cannot advance safely", and the caller stops rather than
 * re-requesting page 1 forever.
 */
function nextCursor(data: ReadonlyArray<{ id?: string }>): string | null {
  if (data.length === 0) return null;
  const last = data[data.length - 1];
  return typeof last?.id === "string" && last.id ? last.id : null;
}

/**
 * Complete a subscription's item set when Stripe embedded only the first page.
 *
 * Called ONLY after the embedded items have already failed to grant Featured,
 * so the common case costs no extra request. On failure the embedded verdict
 * stands (false) — an incomplete read never invents Featured.
 */
async function completeItems(
  stripe: FeaturedLookupStripeClient,
  subscriptionId: string,
  pageSize: number,
  onError?: (stage: string, reason: string) => void,
): Promise<ClassifiableSubscriptionItem[] | null> {
  const all: FeaturedLookupSubscriptionItem[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    let res: StripeListPage<FeaturedLookupSubscriptionItem>;
    try {
      res = await stripe.subscriptionItems.list({
        subscription: subscriptionId,
        limit: pageSize,
        ...(cursor ? { starting_after: cursor } : {}),
      });
    } catch (err) {
      onError?.("subscription_items.list", safeReason(err));
      return null;
    }
    const data = res?.data ?? [];
    all.push(...data);
    if (!res?.has_more) return all;
    const next = nextCursor(data);
    if (!next) {
      onError?.("subscription_items.list", "has_more with no advanceable cursor");
      return all;
    }
    cursor = next;
  }
  onError?.("subscription_items.list", `exceeded ${MAX_PAGES} pages`);
  return all;
}

/**
 * Does `email` hold ANY active Featured Stripe subscription?
 *
 * Enumerates EVERY customer object matching the exact email, EVERY active
 * subscription of each, and EVERY item of each subscription — short-circuiting
 * the moment Featured is proven, since one qualifying subscription is the
 * whole answer.
 *
 * FAIL-CLOSED: any Stripe failure yields `false` for this email and reports
 * through `onError`. An unavailable lookup never fabricates paid placement.
 * The email match is Stripe's own exact-match filter; nothing here is fuzzy.
 */
export async function emailHasActiveFeaturedSubscription(
  stripe: FeaturedLookupStripeClient,
  email: string,
  options: FeaturedLookupOptions = {},
): Promise<boolean> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const onError = options.onError;
  if (!email) return false;

  let customerCursor: string | undefined;
  for (let cPage = 0; cPage < MAX_PAGES; cPage++) {
    let customers: StripeListPage<FeaturedLookupCustomer>;
    try {
      customers = await stripe.customers.list({
        email,
        limit: pageSize,
        ...(customerCursor ? { starting_after: customerCursor } : {}),
      });
    } catch (err) {
      onError?.("customers.list", safeReason(err));
      return false;
    }
    const customerData = customers?.data ?? [];

    for (const customer of customerData) {
      if (!customer?.id) continue;

      let subCursor: string | undefined;
      for (let sPage = 0; sPage < MAX_PAGES; sPage++) {
        let subs: StripeListPage<FeaturedLookupSubscription>;
        try {
          subs = await stripe.subscriptions.list({
            customer: customer.id,
            status: "active",
            limit: pageSize,
            ...(subCursor ? { starting_after: subCursor } : {}),
          });
        } catch (err) {
          onError?.("subscriptions.list", safeReason(err));
          // Fail closed for this customer; a later customer object may still
          // hold a readable Featured subscription.
          break;
        }
        const subData = subs?.data ?? [];

        for (const sub of subData) {
          if (!sub) continue;
          // Embedded items first — the overwhelmingly common case, and enough
          // to prove Featured without a second request.
          if (subscriptionGrantsFeatured(sub)) return true;
          if (sub.items?.has_more === true && sub.id) {
            const complete = await completeItems(stripe, sub.id, pageSize, onError);
            if (complete && subscriptionGrantsFeatured({ items: { data: complete }, metadata: sub.metadata })) {
              return true;
            }
          }
        }

        if (!subs?.has_more) break;
        const nextSub = nextCursor(subData);
        if (!nextSub) {
          onError?.("subscriptions.list", "has_more with no advanceable cursor");
          break;
        }
        subCursor = nextSub;
      }
    }

    if (!customers?.has_more) return false;
    const nextCustomer = nextCursor(customerData);
    if (!nextCustomer) {
      onError?.("customers.list", "has_more with no advanceable cursor");
      return false;
    }
    customerCursor = nextCustomer;
  }
  onError?.("customers.list", `exceeded ${MAX_PAGES} pages`);
  return false;
}
