import { describe, it, expect } from "vitest";

// Pure display-logic mirrors of the grace banner + dashboard status labeling
// (the components themselves pull from react-query; these lock the math/labels
// that the 2026-07-03 hardening pass introduced).

function daysLeft(expiresAtIso: string, nowMs: number): number {
  return Math.max(0, Math.ceil((new Date(expiresAtIso).getTime() - nowMs) / 86_400_000));
}

function facilityStatusLabel(f: { status: string; suspended?: boolean | null }): string {
  if (f.suspended === true) return "Paused";
  if (f.status === "approved") return "Live";
  if (f.status === "pending") return "Under Review";
  return "Not Listed";
}

describe("plan grace banner day math", () => {
  const now = Date.UTC(2026, 6, 1); // 2026-07-01

  it("counts whole days remaining, rounding up", () => {
    expect(daysLeft("2026-07-31T23:59:59Z", now)).toBe(31);
  });

  it("never goes negative for an expired grant", () => {
    expect(daysLeft("2026-06-01T00:00:00Z", now)).toBe(0);
  });

  it("reports 1 day on the final day", () => {
    expect(daysLeft("2026-07-02T00:00:00Z", now)).toBe(1);
  });
});

describe("dashboard facility status label (gap G4)", () => {
  it("labels a suspended-approved facility Paused, not Live", () => {
    expect(facilityStatusLabel({ status: "approved", suspended: true })).toBe("Paused");
  });

  it("labels a live facility Live", () => {
    expect(facilityStatusLabel({ status: "approved", suspended: false })).toBe("Live");
  });

  it("labels a pending facility Under Review", () => {
    expect(facilityStatusLabel({ status: "pending" })).toBe("Under Review");
  });

  it("suspension precedence holds even if status is pending", () => {
    expect(facilityStatusLabel({ status: "pending", suspended: true })).toBe("Paused");
  });
});
