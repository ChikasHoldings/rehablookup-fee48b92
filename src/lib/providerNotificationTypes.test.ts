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
} from "./providerNotificationTypes";

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
