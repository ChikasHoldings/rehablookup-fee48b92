import { describe, it, expect } from "vitest";
import { resolveNotificationRoute } from "@/lib/seekerNotificationRouting";

/**
 * Regression guard for seeker notification deep-link routing. The resolver is
 * the single source of truth shared by the header dropdown and the full
 * notifications page, so every emitted seeker notification type must land on a
 * real /account route and an unknown type must fall back safely (never crash,
 * never dead-link).
 */
const make = (over: Partial<{ link: string | null; type: string; metadata: Record<string, unknown> | null }>) => ({
  link: null,
  type: "system",
  metadata: null,
  ...over,
});

describe("resolveNotificationRoute", () => {
  it("prefers an explicit producer-set link over the type table", () => {
    expect(
      resolveNotificationRoute(make({ link: "/account/support?ticket=abc", type: "support_reply" })),
    ).toBe("/account/support?ticket=abc");
  });

  it("falls back to metadata.link when no top-level link is set", () => {
    expect(
      resolveNotificationRoute(make({ metadata: { link: "/account/saved" }, type: "saved_facility" })),
    ).toBe("/account/saved");
  });

  it("routes lead_message to the requests page (regression: was missing from the table)", () => {
    expect(resolveNotificationRoute(make({ type: "lead_message" }))).toBe("/account/requests");
  });

  // Directory cutover stage 1: the seeker placement workspace is retired.
  // Rows of these types still exist in seeker_notifications (the producing
  // edge functions were deliberately left untouched in this stage), so the
  // resolver must send them somewhere real rather than a dead route.
  it("routes every retired concierge_* type to the saved-facilities fallback", () => {
    for (const type of [
      "concierge_intake_received",
      "concierge_options_ready",
      "concierge_provider_confirmed",
      "concierge_advisor_assigned",
      "concierge_case_closed",
      "concierge_moved_in",
      "concierge_message_received",
      "concierge_tour_proposed",
      "concierge_admission_updated",
      "placement_intro",
    ]) {
      expect(resolveNotificationRoute(make({ type }))).toBe("/account/saved");
    }
  });

  it("no type in the route table points at a retired concierge/placement route", () => {
    for (const type of [
      "concierge_intake_received",
      "concierge_matches_found",
      "concierge_introductions_sent",
      "concierge_options_ready",
      "concierge_provider_interested",
      "concierge_provider_confirmed",
      "concierge_progress_update",
      "concierge_advisor_assigned",
      "concierge_placement_complete",
      "concierge_case_closed",
      "concierge_message_received",
      "concierge_tour_proposed",
      "concierge_tour_confirmed",
      "concierge_tour_completed",
      "concierge_tour_cancelled",
      "concierge_admission_updated",
      "concierge_move_in_scheduled",
      "concierge_moved_in",
      "placement_intro",
    ]) {
      expect(resolveNotificationRoute(make({ type }))).not.toMatch(/\/account\/(concierge|placements)/);
    }
  });

  it("routes support_* types to /account/support", () => {
    for (const type of ["support_reply", "support_resolved", "support_reopened"]) {
      expect(resolveNotificationRoute(make({ type }))).toBe("/account/support");
    }
  });

  it("routes request/tour types to /account/requests and review types to /account/reviews", () => {
    expect(resolveNotificationRoute(make({ type: "request_update" }))).toBe("/account/requests");
    expect(resolveNotificationRoute(make({ type: "tour_confirmed" }))).toBe("/account/requests");
    expect(resolveNotificationRoute(make({ type: "review_approved" }))).toBe("/account/reviews");
  });

  it("falls back to the inbox for an unknown type (no crash, no dead link)", () => {
    expect(resolveNotificationRoute(make({ type: "totally_unknown_type_xyz" }))).toBe("/account/notifications");
  });
});
