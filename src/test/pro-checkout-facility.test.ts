/**
 * Regression guard for the Pro-upgrade activation contract.
 *
 * THE BUG THIS LOCKS DOWN
 * -----------------------
 * `create-checkout` emitted `facility_id: facilityId || ""` into Stripe
 * session metadata, and both of its callers — the onboarding PlanStep
 * ("Continue with Pro") and the UpgradeDialog — invoked it without a
 * facilityId. Stripe metadata values are strings, so "absent" arrived as `""`.
 *
 * The stripe-webhook `checkout.session.completed` handler then ran
 * `if (subscriptionId && facilityId && userId)` — and `""` is falsy, so it
 * skipped the ONLY `facility_subscriptions` upsert in the codebase and
 * returned 200. Net effect: the provider was charged $99/mo, but every Pro
 * entitlement gate (useProStatus, useFacilitySubscription, has_active_pro)
 * reads that missing row, so they stayed on Free. PlanStep's 30s confirmation
 * poll queries the same table, so it always timed out.
 *
 * The selector lives in the edge-function _shared layer; we import it directly
 * here the same way stripe-price-resolution.test.ts exercises its helper.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeFacilityIdMetadata,
  resolveProFacilityId,
  isRecordableProCheckoutMetadata,
} from "../../supabase/functions/_shared/pro-checkout-facility";

const FACILITY = "3f8c1d2e-0000-4000-8000-000000000001";
const OWNED = "3f8c1d2e-0000-4000-8000-000000000002";
const USER = "9a2b3c4d-0000-4000-8000-00000000000a";

describe("normalizeFacilityIdMetadata", () => {
  it("treats the empty string the same as absent — the exact shape that caused the silent skip", () => {
    expect(normalizeFacilityIdMetadata("")).toBeNull();
    expect(normalizeFacilityIdMetadata("   ")).toBeNull();
    expect(normalizeFacilityIdMetadata(undefined)).toBeNull();
    expect(normalizeFacilityIdMetadata(null)).toBeNull();
  });

  it("passes a real id through, trimmed", () => {
    expect(normalizeFacilityIdMetadata(FACILITY)).toBe(FACILITY);
    expect(normalizeFacilityIdMetadata(`  ${FACILITY}  `)).toBe(FACILITY);
  });
});

describe("resolveProFacilityId", () => {
  it("prefers metadata so a webhook redelivery lands on the same row", () => {
    const r = resolveProFacilityId({ metadataFacilityId: FACILITY, ownedFacilityId: OWNED });
    expect(r).toEqual({ facilityId: FACILITY, source: "metadata" });
  });

  it("falls back to the owned facility when metadata is the legacy empty string", () => {
    const r = resolveProFacilityId({ metadataFacilityId: "", ownedFacilityId: OWNED });
    expect(r).toEqual({ facilityId: OWNED, source: "owner-fallback" });
  });

  it("falls back when metadata is missing entirely", () => {
    const r = resolveProFacilityId({ ownedFacilityId: OWNED });
    expect(r).toEqual({ facilityId: OWNED, source: "owner-fallback" });
  });

  it("reports unresolved when the provider owns nothing (unapproved claim)", () => {
    // facilities.user_id is set by the claim-approval trigger, not at claim
    // submission — so a claim-only provider genuinely has no facility to
    // attach a subscription to. Callers must refuse, not charge.
    const r = resolveProFacilityId({ metadataFacilityId: "", ownedFacilityId: null });
    expect(r).toEqual({ facilityId: null, source: "unresolved" });
  });

  it("never yields an empty string as a facility id", () => {
    for (const metadataFacilityId of ["", "  ", undefined, null]) {
      for (const ownedFacilityId of ["", "  ", undefined, null]) {
        const { facilityId } = resolveProFacilityId({ metadataFacilityId, ownedFacilityId });
        expect(facilityId).toBeNull();
      }
    }
  });
});

describe("isRecordableProCheckoutMetadata — outgoing Checkout session contract", () => {
  it("rejects the exact metadata create-checkout used to emit for PlanStep/UpgradeDialog", () => {
    expect(
      isRecordableProCheckoutMetadata({
        user_id: USER,
        type: "pro_subscription",
        facility_id: "", // facilityId || "" with no facilityId supplied
        plan: "pro",
      }),
    ).toBe(false);
  });

  it("accepts metadata carrying a resolved facility id", () => {
    expect(
      isRecordableProCheckoutMetadata({
        user_id: USER,
        type: "pro_subscription",
        facility_id: FACILITY,
        plan: "pro",
      }),
    ).toBe(true);
  });

  it("accepts the legacy provider_user_id key the webhook still honours", () => {
    expect(
      isRecordableProCheckoutMetadata({
        provider_user_id: USER,
        type: "pro_subscription",
        facility_id: FACILITY,
      }),
    ).toBe(true);
  });

  it("rejects when the user id is missing — the webhook keys the row on it", () => {
    expect(
      isRecordableProCheckoutMetadata({ type: "pro_subscription", facility_id: FACILITY }),
    ).toBe(false);
  });

  it("rejects non-Pro metadata so add-on sessions can't be mistaken for Pro", () => {
    expect(
      isRecordableProCheckoutMetadata({
        user_id: USER,
        type: "featured_addon",
        facility_id: FACILITY,
      }),
    ).toBe(false);
  });
});
