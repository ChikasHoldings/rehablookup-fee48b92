import { describe, it, expect } from "vitest";
import {
  ownerName,
  ownerActionNeeded,
  filterAndSortOwners,
  summarizeOwners,
  ownerRiskFlags,
  ownersToCsv,
  OWNER_CSV_HEADERS,
  type ProviderOwnerRow,
} from "@/lib/providerOwners";

function mk(partial: Partial<ProviderOwnerRow>): ProviderOwnerRow {
  return {
    user_id: partial.user_id ?? crypto.randomUUID(),
    first_name: null, last_name: null, email: null, phone: null,
    created_at: "2026-01-01T00:00:00Z", email_verified_at: null, onboarding_completed_at: null,
    total_facilities: 0, live_count: 0, pending_count: 0, rejected_count: 0, suspended_count: 0,
    plan_state: "free", grace_expires_at: null, has_stripe_customer: false,
    last_facility_update: null, facility_names: null,
    ...partial,
  };
}

describe("ownerName", () => {
  it("prefers full name, falls back to email, then a placeholder", () => {
    expect(ownerName(mk({ first_name: "Ada", last_name: "Lovelace" }))).toBe("Ada Lovelace");
    expect(ownerName(mk({ email: "a@b.com" }))).toBe("a@b.com");
    expect(ownerName(mk({}))).toBe("Unnamed provider");
  });
});

describe("ownerActionNeeded", () => {
  it("flags pending/rejected/suspended facilities and past_due/incomplete billing", () => {
    expect(ownerActionNeeded(mk({ pending_count: 1 }))).toBe(true);
    expect(ownerActionNeeded(mk({ rejected_count: 1 }))).toBe(true);
    expect(ownerActionNeeded(mk({ suspended_count: 1 }))).toBe(true);
    expect(ownerActionNeeded(mk({ plan_state: "past_due" }))).toBe(true);
    expect(ownerActionNeeded(mk({ plan_state: "incomplete" }))).toBe(true);
  });
  it("does NOT flag a healthy Pro/free owner, and onboarding-incomplete is not an action signal", () => {
    expect(ownerActionNeeded(mk({ plan_state: "pro", live_count: 3 }))).toBe(false);
    expect(ownerActionNeeded(mk({ onboarding_completed_at: null, live_count: 1 }))).toBe(false);
  });
});

describe("filterAndSortOwners", () => {
  const pro = mk({ user_id: "pro", first_name: "Pat", plan_state: "pro", total_facilities: 5, live_count: 5, created_at: "2026-05-01T00:00:00Z" });
  const grace = mk({ user_id: "grace", first_name: "Gwen", plan_state: "grace", total_facilities: 3, live_count: 3, pending_count: 0, created_at: "2026-06-01T00:00:00Z", facility_names: ["Sunrise Detox"] });
  const free = mk({ user_id: "free", first_name: "Fred", plan_state: "free", total_facilities: 1, pending_count: 1, created_at: "2026-04-01T00:00:00Z", has_stripe_customer: false });
  const rows = [pro, grace, free];

  it("plan filter isolates a plan state", () => {
    expect(filterAndSortOwners(rows, { plan: "grace" }).map((r) => r.user_id)).toEqual(["grace"]);
  });
  it("grace is never returned by a Pro filter (grace != Pro)", () => {
    expect(filterAndSortOwners(rows, { plan: "pro" }).map((r) => r.user_id)).toEqual(["pro"]);
  });
  it("no_billing = free AND no stripe customer", () => {
    expect(filterAndSortOwners(rows, { plan: "no_billing" }).map((r) => r.user_id)).toEqual(["free"]);
  });
  it("action-needed filter keeps only owners needing action", () => {
    expect(filterAndSortOwners(rows, { actionOnly: true }).map((r) => r.user_id)).toEqual(["free"]);
  });
  it("facility-status filter matches owners with a facility in that status", () => {
    expect(filterAndSortOwners(rows, { status: "pending" }).map((r) => r.user_id)).toEqual(["free"]);
  });
  it("search matches owner name, email, or facility name", () => {
    expect(filterAndSortOwners(rows, { search: "gwen" }).map((r) => r.user_id)).toEqual(["grace"]);
    expect(filterAndSortOwners(rows, { search: "sunrise" }).map((r) => r.user_id)).toEqual(["grace"]);
  });
  it("sort by most_facilities orders desc", () => {
    expect(filterAndSortOwners(rows, { sort: "most_facilities" }).map((r) => r.total_facilities)).toEqual([5, 3, 1]);
  });
  it("sort by newest orders by created_at desc", () => {
    expect(filterAndSortOwners(rows, { sort: "newest" }).map((r) => r.user_id)).toEqual(["grace", "pro", "free"]);
  });
  it("does not mutate the input array", () => {
    const copy = [...rows];
    filterAndSortOwners(rows, { sort: "most_facilities" });
    expect(rows).toEqual(copy);
  });
});

describe("summarizeOwners", () => {
  it("counts totals by plan state and action-needed", () => {
    const rows = [
      mk({ plan_state: "pro", live_count: 2 }),
      mk({ plan_state: "grace", grace_expires_at: "2026-08-01T00:00:00Z" }),
      mk({ plan_state: "past_due" }),
      mk({ plan_state: "free", has_stripe_customer: true }), // billed before → not "no billing"
      mk({ plan_state: "free", has_stripe_customer: false, pending_count: 1 }), // no billing + action
    ];
    const s = summarizeOwners(rows);
    expect(s).toEqual({ total: 5, pro: 1, grace: 1, pastDue: 1, free: 2, noBilling: 1, actionNeeded: 2 });
  });
  it("is zeroed for an empty set", () => {
    expect(summarizeOwners([])).toEqual({ total: 0, pro: 0, grace: 0, pastDue: 0, free: 0, noBilling: 0, actionNeeded: 0 });
  });
});

describe("ownerRiskFlags", () => {
  it("returns no flags for a healthy owner", () => {
    expect(ownerRiskFlags(mk({ plan_state: "pro", live_count: 3 }))).toEqual([]);
  });
  it("surfaces each moderation/billing reason with a severity tone", () => {
    const flags = ownerRiskFlags(mk({ pending_count: 2, rejected_count: 1, suspended_count: 1, plan_state: "past_due" }));
    expect(flags.map((f) => f.key)).toEqual(["pending", "rejected", "suspended", "past_due"]);
    expect(flags.find((f) => f.key === "pending")?.label).toBe("2 listings awaiting review");
    expect(flags.find((f) => f.key === "rejected")?.tone).toBe("danger");
  });
  it("stays consistent with ownerActionNeeded", () => {
    const withAction = mk({ suspended_count: 1 });
    const noAction = mk({ plan_state: "free", live_count: 1 });
    expect(ownerRiskFlags(withAction).length > 0).toBe(ownerActionNeeded(withAction));
    expect(ownerRiskFlags(noAction).length > 0).toBe(ownerActionNeeded(noAction));
  });
});

describe("ownersToCsv", () => {
  it("emits a header row plus one row per owner with escaped cells", () => {
    const csv = ownersToCsv([
      mk({ first_name: "Ada", last_name: "Lovelace", email: "ada@x.com", plan_state: "pro", total_facilities: 3, live_count: 3, created_at: "2026-01-02T00:00:00Z" }),
      mk({ first_name: "Comma, Inc", email: "c@x.com", plan_state: "free" }),
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(OWNER_CSV_HEADERS.join(","));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("Ada Lovelace");
    expect(lines[1]).toContain("Pro");
    expect(lines[1]).toContain("2026-01-02");
    // A value containing a comma must be quoted.
    expect(lines[2]).toContain('"Comma, Inc"');
  });
});
