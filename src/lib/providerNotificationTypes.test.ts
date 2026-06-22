/**
 * Regression guard for the provider notification registry.
 *
 * Bug: the backend emits a `lead_message` notification (send-lead-message),
 * but the registry had no entry for it, so it fell back to the generic
 * "Notification" icon/label and was invisible under every category filter
 * except "All Types". This locks in that `lead_message` is a real Leads entry.
 */
import { describe, it, expect } from "vitest";
import {
  getNotificationEntry,
  getNotificationRoute,
  FALLBACK_ENTRY,
  NOTIFICATION_TYPES,
} from "./providerNotificationTypes";

/**
 * Every provider route mounted under <ProviderShell /> in src/App.tsx. Mirrored
 * here (not imported) to keep the test free of the router/supabase import chain.
 * A notification route NOT in this set is a DEAD LINK — clicking the
 * notification would render the public 404 catch-all instead of a provider page.
 */
const KNOWN_PROVIDER_ROUTES = new Set<string>([
  "/provider/dashboard",
  "/provider/listings",
  "/provider/listings/profile",
  "/provider/add-location",
  "/provider/inquiries",
  "/provider/reviews",
  "/provider/analytics",
  "/provider/billing",
  "/provider/billing/cancel",
  "/provider/billing/placements",
  "/provider/billing/concierge",
  "/provider/marketing",
  "/provider/marketing/featured",
  "/provider/marketing/concierge",
  "/provider/settings",
  "/provider/embed-badge",
  "/provider/credential-kit",
  "/provider/notifications",
  "/provider/help",
  "/provider/knowledge-base",
  "/provider/image-guidelines",
  "/provider/claims",
  "/provider/onboarding",
]);

describe("provider notification registry", () => {
  it("resolves lead_message to a real Leads entry (not the generic fallback)", () => {
    const entry = getNotificationEntry("lead_message");
    expect(entry).not.toBe(FALLBACK_ENTRY);
    expect(entry.category).toBe("leads");
    expect(entry.route).toBe("/provider/inquiries");
    expect(entry.label).not.toBe(FALLBACK_ENTRY.label);
  });

  it("routes lead_message to the inquiries page", () => {
    expect(getNotificationRoute("lead_message")).toBe("/provider/inquiries");
  });

  it("prefers an explicit metadata.link deep-link over the registry route", () => {
    expect(
      getNotificationRoute("lead_message", { link: "/provider/inquiries?lead=abc" })
    ).toBe("/provider/inquiries?lead=abc");
  });

  it("still falls back for genuinely unknown types", () => {
    expect(getNotificationEntry("totally_unknown_type_xyz")).toBe(FALLBACK_ENTRY);
  });
});

describe("provider notification routing — no dead links", () => {
  it("every registered notification route resolves to a real provider route", () => {
    const dead = Object.entries(NOTIFICATION_TYPES)
      .filter(([, entry]) => !KNOWN_PROVIDER_ROUTES.has(entry.route.split("?")[0]))
      .map(([type, entry]) => `${type} -> ${entry.route}`);
    expect(dead).toEqual([]);
  });

  it("the fallback route is itself a real provider route", () => {
    expect(KNOWN_PROVIDER_ROUTES.has(FALLBACK_ENTRY.route.split("?")[0])).toBe(true);
  });

  it("an unknown type routes to the safe fallback (no crash, no dead link)", () => {
    expect(getNotificationRoute("totally_unknown_type_xyz")).toBe(FALLBACK_ENTRY.route);
  });
});
