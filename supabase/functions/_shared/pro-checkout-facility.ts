// Facility resolution for Pro subscription checkouts.
//
// WHY THIS EXISTS
// ---------------
// `facility_subscriptions` is keyed on facility_id (NOT NULL, unique) and the
// stripe-webhook `checkout.session.completed` handler is the ONLY writer of
// that row. It takes the id from `session.metadata.facility_id`.
//
// create-checkout previously emitted `facility_id: facilityId || ""` and its
// two callers — the onboarding PlanStep and the UpgradeDialog — never passed
// one. An empty string is falsy, so the webhook's
// `if (subscriptionId && facilityId && userId)` guard skipped the upsert
// entirely: Stripe charged $99/mo, activateProBenefits flipped profiles.plan
// and facilities.featured, but every Pro entitlement gate in the product
// (useProStatus, useFacilitySubscription, has_active_pro) reads the row that
// was never written — so the provider stayed on Free after paying.
//
// The helpers below keep the "what counts as a usable facility id" rule in one
// place so create-checkout (which resolves before opening Checkout) and
// stripe-webhook (which re-resolves as a repair path for sessions opened
// before that fix shipped) cannot drift apart again.

/**
 * Normalize a facility id read from Stripe metadata.
 *
 * Stripe metadata values are always strings, so an "absent" id arrives as ""
 * rather than undefined. Both mean "not supplied" and must be treated the
 * same — collapsing them to null is what stops `""` from being mistaken for a
 * legitimate value by a truthiness check.
 */
export function normalizeFacilityIdMetadata(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type ProFacilitySource = "metadata" | "owner-fallback" | "unresolved";

export interface ProFacilityResolution {
  facilityId: string | null;
  source: ProFacilitySource;
}

/**
 * Decide which facility a Pro subscription should be recorded against.
 *
 * Metadata wins when present so a webhook redelivery lands on exactly the row
 * the original delivery did. The owner fallback only applies when metadata is
 * blank — i.e. a Checkout session created before create-checkout started
 * resolving the id itself.
 *
 * `unresolved` is a real outcome, not an error to swallow: a provider whose
 * only listing is an unapproved claim owns no facility row (facilities.user_id
 * is set by the claim-approval trigger, not at claim submission), so there is
 * genuinely nothing to attach a subscription to. Callers must refuse the
 * checkout (create-checkout) or raise an ops alert (stripe-webhook) rather
 * than silently continue.
 */
export function resolveProFacilityId(args: {
  metadataFacilityId?: string | null;
  ownedFacilityId?: string | null;
}): ProFacilityResolution {
  const fromMetadata = normalizeFacilityIdMetadata(args.metadataFacilityId);
  if (fromMetadata) return { facilityId: fromMetadata, source: "metadata" };

  const fromOwner = normalizeFacilityIdMetadata(args.ownedFacilityId);
  if (fromOwner) return { facilityId: fromOwner, source: "owner-fallback" };

  return { facilityId: null, source: "unresolved" };
}

/**
 * Guard for the metadata written onto a Pro Checkout session.
 *
 * Returns true only when the webhook will be able to record the subscription.
 * Use it to assert the outgoing metadata contract at the point of creation —
 * the failure this prevents is invisible until after the customer is charged.
 */
export function isRecordableProCheckoutMetadata(
  metadata: Record<string, string | null | undefined> | null | undefined,
): boolean {
  if (!metadata) return false;
  if (metadata.type !== "pro_subscription") return false;
  if (!normalizeFacilityIdMetadata(metadata.user_id ?? metadata.provider_user_id)) return false;
  return normalizeFacilityIdMetadata(metadata.facility_id) !== null;
}
