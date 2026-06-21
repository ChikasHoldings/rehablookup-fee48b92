/**
 * Regression guards for the Concierge Workflows lifecycle hardening pass.
 *
 * These are source-contract tests (like broken-links-checker): they lock the
 * specific defects fixed in this pass so they can't silently regress. The
 * concierge tables have 0 live rows, so behavior is otherwise only exercised
 * by RLS role-simulation — these assertions guard the client/edge wiring.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("concierge lifecycle contracts", () => {
  // C5 — the free-tier → concierge redirect insert must not reference the
  // dropped payment_status / payment_amount_cents columns (their presence made
  // every free-tier inquiry insert fail with a 500).
  it("submit-qualified-lead does not write dropped payment columns into concierge_inquiries", () => {
    const src = read("supabase/functions/submit-qualified-lead/index.ts");
    expect(src).not.toMatch(/payment_amount_cents/);
    expect(src).not.toMatch(/payment_status\s*:/);
  });

  // C1 — seeker placement confirmation must go through the security-definer RPC
  // (a direct UPDATE of seeker_confirmed/placed_facility_id is rejected by the
  // guard_seeker_inquiry_update trigger), and C2 — the matched-options list must
  // read via get_seeker_introductions (seekers have no RLS read on the table).
  it("SeekerProviderReviewCard uses the seeker RPCs, not blocked direct table access", () => {
    const src = read("src/components/seeker/placement/SeekerProviderReviewCard.tsx");
    expect(src).toMatch(/rpc\(\s*["']seeker_confirm_placement["']/);
    expect(src).toMatch(/rpc\(\s*["']get_seeker_introductions["']/);
    // Must NOT directly read concierge_introductions (RLS gives the seeker 0 rows)
    expect(src).not.toMatch(/from\(\s*["']concierge_introductions["']/);
    // Must NOT directly write the guard-protected confirmation columns
    expect(src).not.toMatch(/seeker_confirmed:\s*true/);
  });

  // C8 — the seeker placement-reminder email must link to the real route.
  it("placement-monitor reminder links to /account/concierge, not the dead /seeker/concierge", () => {
    const src = read("supabase/functions/placement-monitor/index.ts");
    expect(src).not.toMatch(/\/seeker\/concierge/);
    expect(src).toMatch(/\/account\/concierge/);
  });

  // C3 — the RedirectedInquiries feature (which surfaced full seeker PII to a
  // free originating facility) is removed; its files must not return.
  it("RedirectedInquiries PII-leak feature is removed", () => {
    expect(existsSync(resolve(root, "src/components/provider/inquiries/RedirectedInquiries.tsx"))).toBe(false);
    expect(existsSync(resolve(root, "src/hooks/useRedirectedInquiries.ts"))).toBe(false);
  });
});
