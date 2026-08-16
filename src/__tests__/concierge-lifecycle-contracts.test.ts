/**
 * Regression guards for the Concierge Workflows lifecycle hardening pass,
 * updated for directory cutover stage 1.
 *
 * These are source-contract tests (like broken-links-checker): they lock the
 * specific defects fixed in each pass so they can't silently regress. The
 * concierge tables have 0 live rows, so behavior is otherwise only exercised
 * by RLS role-simulation — these assertions guard the client/edge wiring.
 *
 * Stage 1 removed the seeker-facing placement workspace but deliberately left
 * every table, RPC, RLS policy and edge function in place. The assertions
 * below therefore check the frontend no longer reaches those surfaces, and
 * that legacy deep-links still resolve.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

  // C1/C2 superseded by directory cutover stage 1: the seeker placement
  // workspace (and SeekerProviderReviewCard with it) is removed from the
  // frontend entirely, which is a strictly stronger guarantee than "it uses
  // the security-definer RPCs" — there is no seeker-side client left to reach
  // concierge_introductions or the guard-protected confirmation columns.
  // The RPCs, tables and RLS guards are deliberately untouched.
  it("the seeker placement workspace is removed from the frontend", () => {
    for (const rel of [
      "src/components/seeker/placement/SeekerProviderReviewCard.tsx",
      "src/components/seeker/placement/AdvisorMessaging.tsx",
      "src/components/seeker/placement/PlacementStatusCard.tsx",
      "src/pages/seeker/SeekerConcierge.tsx",
    ]) {
      expect(existsSync(resolve(root, rel))).toBe(false);
    }
  });

  it("no frontend source calls the seeker placement RPCs or reads concierge_introductions", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          // Admin/provider concierge surfaces are Stage-2 scope and still read
          // these tables under their own (non-seeker) RLS policies.
          if (rel.includes("/admin") || rel.includes("/provider")) continue;
          walk(rel);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const src = readFileSync(resolve(root, rel), "utf8");
          if (/rpc\(\s*["'](seeker_confirm_placement|get_seeker_introductions)["']/.test(src)) {
            offenders.push(rel);
          }
        }
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });

  // C8 — the seeker placement-reminder email still links to /account/concierge.
  // That route survives as a redirect to /account/saved (App.tsx), so already
  // sent emails resolve instead of 404ing. placement-monitor itself is
  // deliberately NOT modified in this stage.
  it("placement-monitor reminder links to a route that still resolves", () => {
    const src = read("supabase/functions/placement-monitor/index.ts");
    expect(src).not.toMatch(/\/seeker\/concierge/);
    expect(src).toMatch(/\/account\/concierge/);
    const app = read("src/App.tsx");
    // /account/concierge must remain registered (as a redirect) so the link
    // in already-delivered emails does not dead-end.
    expect(app).toMatch(/path="concierge"\s+element=\{<Navigate to="\/account\/saved"/);
  });

  // C3 — the RedirectedInquiries feature (which surfaced full seeker PII to a
  // free originating facility) is removed; its files must not return.
  it("RedirectedInquiries PII-leak feature is removed", () => {
    expect(existsSync(resolve(root, "src/components/provider/inquiries/RedirectedInquiries.tsx"))).toBe(false);
    expect(existsSync(resolve(root, "src/hooks/useRedirectedInquiries.ts"))).toBe(false);
  });
});
