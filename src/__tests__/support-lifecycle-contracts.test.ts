/**
 * Regression guards for the in-app Support ticket lifecycle.
 *
 * Source-contract tests (like concierge-lifecycle-contracts): they lock the
 * security-critical invariants of the support edge functions so they can't
 * silently regress. Runtime RLS behavior is verified separately by live
 * role-simulation; these assert the server-side identity/role handling.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("support lifecycle contracts", () => {
  it("support-ticket-create derives identity from the JWT and binds provider tickets to an authorized facility", () => {
    const src = read("supabase/functions/support-ticket-create/index.ts");
    expect(src).toMatch(/auth\.getUser\(\)/);
    // sender + ownership come from the verified user, never the body
    expect(src).toMatch(/sender_user_id:\s*user\.id/);
    // provider tickets must verify facility ownership/active team membership
    expect(src).toMatch(/facility_team_members/);
    expect(src).toMatch(/forbidden_facility/);
  });

  it("support-ticket-reply derives sender_role from the server, never the request body", () => {
    const src = read("supabase/functions/support-ticket-reply/index.ts");
    expect(src).toMatch(/auth\.getUser\(\)/);
    // role decided by user_roles lookup, not payload
    expect(src).toMatch(/from\("user_roles"\)/);
    expect(src).toMatch(/sender_role:\s*senderRole/);
    expect(src).not.toMatch(/sender_role:\s*payload/);
    // non-admins must be authorized for the ticket
    expect(src).toMatch(/user_can_access_support_ticket/);
  });

  it("support-ticket-status is admin-only and detects 0-row updates (no false success)", () => {
    const src = read("supabase/functions/support-ticket-status/index.ts");
    expect(src).toMatch(/from\("user_roles"\)[\s\S]*?eq\("role",\s*"admin"\)/);
    expect(src).toMatch(/forbidden/);
    expect(src).toMatch(/no_row_updated/);
  });

  it("send-contact-form fails loud when the ticket insert fails (no swallowed false success)", () => {
    const src = read("supabase/functions/send-contact-form/index.ts");
    // must return an error on ticket insert failure, not fall through to success
    expect(src).toMatch(/if\s*\(ticketError\s*\|\|\s*!ticketData\)/);
    expect(src).toMatch(/status:\s*500/);
  });

  it("the three support edge functions are registered as authenticated (verify_jwt=true)", () => {
    const cfg = read("supabase/config.toml");
    for (const fn of ["support-ticket-create", "support-ticket-reply", "support-ticket-status"]) {
      const re = new RegExp(`\\[functions\\.${fn}\\][\\s\\S]*?verify_jwt = true`);
      expect(cfg).toMatch(re);
    }
  });
});
