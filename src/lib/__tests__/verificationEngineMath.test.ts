/**
 * Verification engine — math + threshold contract test.
 *
 * The intake engine's auto-approve decision lives in the SQL function
 * public.finalize_claim_decision (migration 20260803000000). The
 * function's contract:
 *
 *   combined = 0.4 * legitimacy_score + 0.6 * ownership_score
 *
 *   auto_approved ⇔
 *     NOT hard_fraud_signal
 *     AND legitimacy_score >= legitimacy_min_threshold
 *     AND ownership_score >= ownership_min_threshold
 *     AND combined >= auto_approve_threshold
 *     AND NOT high_profile_facility
 *
 *   otherwise → manual_review
 *
 * This file replicates the math + gate logic in TypeScript and tests
 * each branch. It does NOT exercise the live RPC — those are
 * smoke-tested via SQL on each migration apply. The TS replica's job
 * is to lock down the math so a future refactor of the SQL doesn't
 * silently change the contract.
 *
 * If you change the SQL formula, update both the helper below AND the
 * SQL function — and add a test for the new branch.
 */
import { describe, it, expect } from "vitest";

const CONFIG = {
  auto_approve_threshold: 85,
  legitimacy_min_threshold: 70,
  ownership_min_threshold: 80,
} as const;

interface VerifyDecision {
  decision: "auto_approved" | "manual_review";
  combined: number;
  reasons: string[];
}

function decide(opts: {
  legitimacy: number;
  ownership: number;
  hardFraud?: boolean;
  highProfile?: boolean;
  cfg?: { auto_approve_threshold: number; legitimacy_min_threshold: number; ownership_min_threshold: number };
}): VerifyDecision {
  const cfg = opts.cfg ?? CONFIG;
  const reasons: string[] = [];

  if (opts.hardFraud) {
    return { decision: "manual_review", combined: 0, reasons: ["hard_fraud_signal"] };
  }

  const combined = round1(opts.legitimacy * 0.4 + opts.ownership * 0.6);

  if (opts.legitimacy < cfg.legitimacy_min_threshold) {
    reasons.push("legitimacy_below_threshold");
    return { decision: "manual_review", combined, reasons };
  }
  if (opts.ownership < cfg.ownership_min_threshold) {
    reasons.push("ownership_below_threshold");
    return { decision: "manual_review", combined, reasons };
  }
  if (combined < cfg.auto_approve_threshold) {
    reasons.push("combined_below_threshold");
    return { decision: "manual_review", combined, reasons };
  }
  if (opts.highProfile) {
    reasons.push("high_profile_facility");
    return { decision: "manual_review", combined, reasons };
  }
  return { decision: "auto_approved", combined, reasons: [] };
}

function round1(n: number): number {
  return Math.round(n * 1000) / 1000;
}

describe("verification engine — math + threshold contract", () => {
  describe("combined-score formula (0.4·legit + 0.6·ownership)", () => {
    it("matches the SQL formula exactly", () => {
      expect(decide({ legitimacy: 100, ownership: 100 }).combined).toBe(100);
      expect(decide({ legitimacy: 0, ownership: 0 }).combined).toBe(0);
      expect(decide({ legitimacy: 50, ownership: 50 }).combined).toBe(50);
      // The reproducible smoke-test number from the engine PR:
      //   legit=81.5, ownership=90 → combined=86.6
      expect(decide({ legitimacy: 81.5, ownership: 90 }).combined).toBe(86.6);
      //   legit=81.5, ownership=50 → combined=62.6
      expect(decide({ legitimacy: 81.5, ownership: 50 }).combined).toBe(62.6);
    });

    it("weights ownership higher than legitimacy", () => {
      // Same arithmetic mean but different split — ownership-heavy
      // should always score higher than legit-heavy.
      const ownerHeavy = decide({ legitimacy: 0, ownership: 100 }).combined;
      const legitHeavy = decide({ legitimacy: 100, ownership: 0 }).combined;
      expect(ownerHeavy).toBeGreaterThan(legitHeavy);
      expect(ownerHeavy).toBe(60);
      expect(legitHeavy).toBe(40);
    });
  });

  describe("AND-gate enforces BOTH axes — never a flat count", () => {
    it("auto-approves only when legit ≥ 70 AND ownership ≥ 80 AND combined ≥ 85", () => {
      // Edge of pass: legit=70, ownership=80 → combined=76 < 85 → manual
      expect(decide({ legitimacy: 70, ownership: 80 }).decision).toBe("manual_review");
      // Push combined over 85 by raising legit or ownership:
      //   legit=90, ownership=80 → 36 + 48 = 84 → manual
      expect(decide({ legitimacy: 90, ownership: 80 }).decision).toBe("manual_review");
      //   legit=100, ownership=80 → 40 + 48 = 88 → auto
      expect(decide({ legitimacy: 100, ownership: 80 }).decision).toBe("auto_approved");
      //   legit=70, ownership=95 → 28 + 57 = 85 → auto
      expect(decide({ legitimacy: 70, ownership: 95 }).decision).toBe("auto_approved");
    });

    it("blocks auto-approve when legitimacy is below its minimum, even with perfect ownership", () => {
      const r = decide({ legitimacy: 69, ownership: 100 });
      expect(r.decision).toBe("manual_review");
      expect(r.reasons).toContain("legitimacy_below_threshold");
    });

    it("blocks auto-approve when ownership is below its minimum, even with perfect legitimacy", () => {
      const r = decide({ legitimacy: 100, ownership: 79 });
      expect(r.decision).toBe("manual_review");
      expect(r.reasons).toContain("ownership_below_threshold");
    });

    it("blocks auto-approve on combined < threshold even when both axes individually pass", () => {
      // legit=71, ownership=81 → combined = 28.4 + 48.6 = 77 < 85 → manual
      const r = decide({ legitimacy: 71, ownership: 81 });
      expect(r.decision).toBe("manual_review");
      expect(r.reasons).toContain("combined_below_threshold");
    });

    it("does not auto-approve from a flat 'number of checks passed' — only weighted math", () => {
      // Several rungs cleared but scores still don't add up
      const r = decide({ legitimacy: 60, ownership: 75 });
      expect(r.decision).toBe("manual_review");
      // Both axes fail their min, but the first failure short-circuits
      expect(r.reasons[0]).toBe("legitimacy_below_threshold");
    });
  });

  describe("hard fraud override", () => {
    it("forces manual_review regardless of perfect scores", () => {
      const r = decide({ legitimacy: 100, ownership: 100, hardFraud: true });
      expect(r.decision).toBe("manual_review");
      expect(r.reasons).toContain("hard_fraud_signal");
    });
  });

  describe("high-profile facility override", () => {
    it("blocks auto-approve even when scores clear the AND-gate", () => {
      const r = decide({ legitimacy: 100, ownership: 100, highProfile: true });
      expect(r.decision).toBe("manual_review");
      expect(r.reasons).toContain("high_profile_facility");
    });

    it("does not bypass the AND-gate — if scores fail, the failure reason is preserved", () => {
      const r = decide({ legitimacy: 50, ownership: 50, highProfile: true });
      // legitimacy_below_threshold fires before the high-profile check
      expect(r.decision).toBe("manual_review");
      expect(r.reasons[0]).toBe("legitimacy_below_threshold");
    });
  });

  describe("conservative defaults", () => {
    it("the default config requires effectively both axes ≥ 80 for auto-approval", () => {
      // The smallest pair that auto-approves with defaults:
      //   legit=75, ownership=89 → combined = 30 + 53.4 = 83.4 → manual
      expect(decide({ legitimacy: 75, ownership: 89 }).decision).toBe("manual_review");
      //   legit=78, ownership=89 → combined = 31.2 + 53.4 = 84.6 → manual
      expect(decide({ legitimacy: 78, ownership: 89 }).decision).toBe("manual_review");
      //   legit=80, ownership=89 → combined = 32 + 53.4 = 85.4 → auto
      expect(decide({ legitimacy: 80, ownership: 89 }).decision).toBe("auto_approved");
    });

    it("loosening only the combined threshold (e.g. 80) does not bypass per-axis mins", () => {
      const loose = { auto_approve_threshold: 80, legitimacy_min_threshold: 70, ownership_min_threshold: 80 };
      // legit=100, ownership=79 still fails ownership_min
      const r = decide({ legitimacy: 100, ownership: 79, cfg: loose });
      expect(r.decision).toBe("manual_review");
      expect(r.reasons).toContain("ownership_below_threshold");
    });
  });
});
