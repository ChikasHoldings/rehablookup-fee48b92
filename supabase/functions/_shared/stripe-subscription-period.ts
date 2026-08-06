// Stripe subscription billing-period resolution.
//
// Stripe's Basil API removed the subscription-level `current_period_start` /
// `current_period_end` fields in version 2025-03-31 and moved the billing
// period onto each subscription ITEM (`items.data[].current_period_end`):
// https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end
//
// Every Stripe client in this repo pins a version at or after that change
// (2025-04-30.basil / 2025-08-27.basil), so `subscription.current_period_end`
// is `undefined` at runtime. The old reads failed in two different ways:
//
//   - Unguarded: `new Date(sub.current_period_end * 1000)` → `new Date(NaN)`.
//     `.toISOString()` on that THROWS `RangeError: Invalid time value`, which
//     in stripe-webhook aborted Pro activation before the subscription row was
//     written. Arithmetic uses (renewal/expiry day counts) silently went NaN,
//     so every `daysUntil… <= N` comparison was false and the alert never sent.
//   - Guarded (`x ? … : null`): quietly stored a null period end, so renewal
//     dates disappeared from the provider dashboard.
//
// Neither surfaced at build time: tsconfig.app.json only includes `src`, so
// supabase/functions/ is never typechecked.
//
// Resolution reads the item-level field first and falls back to the legacy
// top-level one, so it stays correct if a client is ever pinned back to a
// pre-Basil version. The logic is split out from the Deno/Stripe-coupled
// index.ts files so it can be unit-tested in isolation — mirroring how
// `_shared/stripe-price.ts` and `_shared/with-timeout.ts` are exercised from
// `src/test/`.

/** Minimal shape of the subscription fields we need for period resolution. */
export interface MinimalStripeSubscription {
  current_period_end?: number | null;
  current_period_start?: number | null;
  items?: {
    data?: ReadonlyArray<{
      current_period_end?: number | null;
      current_period_start?: number | null;
    }> | null;
  } | null;
}

function isUsable(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Returns the subscription's current billing-period end as a Unix timestamp
 * (seconds), or `null` when Stripe reports no usable period.
 *
 * Prefers the item-level field (Basil 2025-03-31+) and falls back to the
 * legacy subscription-level field. When a subscription carries multiple items
 * the latest period end wins, so the subscription is treated as active until
 * its last item lapses.
 */
export function getSubscriptionPeriodEnd(
  subscription: MinimalStripeSubscription | null | undefined,
): number | null {
  if (!subscription) return null;

  let latest: number | null = null;
  for (const item of subscription.items?.data ?? []) {
    const value = item?.current_period_end;
    if (isUsable(value) && (latest === null || value > latest)) latest = value;
  }
  if (latest !== null) return latest;

  return isUsable(subscription.current_period_end)
    ? subscription.current_period_end
    : null;
}

/**
 * Period START counterpart, removed from the subscription resource by the same
 * Basil change. Where multiple items are present the EARLIEST start wins, so
 * the value spans the whole subscription rather than one item's slice.
 */
export function getSubscriptionPeriodStart(
  subscription: MinimalStripeSubscription | null | undefined,
): number | null {
  if (!subscription) return null;

  let earliest: number | null = null;
  for (const item of subscription.items?.data ?? []) {
    const value = item?.current_period_start;
    if (isUsable(value) && (earliest === null || value < earliest)) earliest = value;
  }
  if (earliest !== null) return earliest;

  return isUsable(subscription.current_period_start)
    ? subscription.current_period_start
    : null;
}

/** `getSubscriptionPeriodStart` as a `Date`, or `null`. */
export function getSubscriptionPeriodStartDate(
  subscription: MinimalStripeSubscription | null | undefined,
): Date | null {
  const seconds = getSubscriptionPeriodStart(subscription);
  return seconds === null ? null : new Date(seconds * 1000);
}

/** `getSubscriptionPeriodStart` as an ISO string, or `null`. */
export function getSubscriptionPeriodStartISO(
  subscription: MinimalStripeSubscription | null | undefined,
): string | null {
  return getSubscriptionPeriodStartDate(subscription)?.toISOString() ?? null;
}

/**
 * Same resolution as `getSubscriptionPeriodEnd`, returned as a `Date`, or
 * `null` when there is no usable period. Callers that previously did
 * `new Date(sub.current_period_end * 1000)` should use this and handle null
 * instead of propagating an Invalid Date.
 */
export function getSubscriptionPeriodEndDate(
  subscription: MinimalStripeSubscription | null | undefined,
): Date | null {
  const seconds = getSubscriptionPeriodEnd(subscription);
  return seconds === null ? null : new Date(seconds * 1000);
}

/**
 * Same resolution, returned as an ISO string, or `null` when there is no
 * usable period. Safe drop-in for the old
 * `new Date(sub.current_period_end * 1000).toISOString()` reads, which threw
 * on a missing period.
 */
export function getSubscriptionPeriodEndISO(
  subscription: MinimalStripeSubscription | null | undefined,
): string | null {
  return getSubscriptionPeriodEndDate(subscription)?.toISOString() ?? null;
}
