/**
 * Regression guards for the Messaging Lifecycle hardening pass (C7 + MSG-*).
 *
 * Source-contract tests (like concierge-lifecycle-contracts / support-lifecycle-
 * contracts): they lock the security-critical invariants of the three
 * message-triggered notification dispatchers so they can't silently regress.
 * Runtime RLS / auth behavior is verified separately by live role-simulation;
 * these assert the server-side identity, sender-derivation, idempotency and
 * PII-handling wiring that the build can enforce on every commit.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

const DISPATCHERS = [
  "supabase/functions/send-message-notifications/index.ts",
  "supabase/functions/send-concierge-notifications/index.ts",
  "supabase/functions/send-tour-notifications/index.ts",
];

describe("messaging lifecycle contracts", () => {
  // C7 — every dispatcher must authenticate the caller before fanning out
  // emails/SMS. They run verify_jwt=false, so the in-code gate is the only
  // thing standing between an anonymous body and a PHI-carrying notification.
  it("all three dispatchers authenticate the caller via authorizeNotifier", () => {
    for (const rel of DISPATCHERS) {
      const src = read(rel);
      expect(src, rel).toMatch(/async function authorizeNotifier\(/);
      expect(src, rel).toMatch(/await authorizeNotifier\(req,\s*supabase\)/);
      // service-role bearer is the only token allowed to skip user resolution
      expect(src, rel).toMatch(/token === serviceKey/);
      // a non-service token must resolve to a real user, else 401
      expect(src, rel).toMatch(/auth\.getUser\(token\)/);
      // admin classification keys on the project-wide user_roles 'admin' gate —
      // consistent with useAdminAuth / concierge RLS / record-introduction-decision
      // (create-admin-user provisions every admin & advisor with this row).
      expect(src, rel).toMatch(/from\("user_roles"\)[\s\S]*?eq\("role", "admin"\)/);
    }
  });

  // C7 — the canonical shared helper exists and documents the model.
  it("the shared notification-auth helper exists and classifies service/admin/user", () => {
    const src = read("supabase/functions/_shared/notification-auth.ts");
    expect(src).toMatch(/export async function authorizeNotifier/);
    expect(src).toMatch(/"service"/);
    expect(src).toMatch(/"admin"/);
    expect(src).toMatch(/"user"/);
  });

  // MSG-1 — the message dispatcher must DERIVE the sender label from the
  // authenticated identity, never echo a body-supplied senderType into the email.
  it("send-message-notifications derives senderType server-side (no body trust)", () => {
    const src = read("supabase/functions/send-message-notifications/index.ts");
    // the email payload uses the derived `senderType`, not `payload.senderType`
    expect(src).toMatch(/senderType,\n\s*messagePreview/);
    expect(src).not.toMatch(/senderType:\s*payload\.senderType/);
    // a non-admin caller who is not a participant is rejected
    expect(src).toMatch(/actor === "user" && !isSeeker && !isProvider/);
    expect(src).toMatch(/status:\s*403/);
  });

  // MSG-5 — idempotency must be content-stable, not time-based (the old
  // `Date.now()` suffix made every call unique and defeated dedup entirely).
  it("send-message-notifications uses a stable idempotency key (no Date.now)", () => {
    const src = read("supabase/functions/send-message-notifications/index.ts");
    expect(src).toMatch(/function stableHash\(/);
    expect(src).toMatch(/idempotencyKey: `msg-\$\{payload\.threadId\}-\$\{payload\.notificationType\}-\$\{idemHash\}`/);
    expect(src).not.toMatch(/idempotencyKey:.*Date\.now\(\)/);
    // SMS is deduped too
    expect(src).toMatch(/msg-sms-\$\{payload\.threadId\}-\$\{idemHash\}/);
  });

  // MSG-3 — the facility tour-confirmed SMS must NOT carry the seeker's phone.
  it("send-tour-notifications does not leak the seeker phone in the facility SMS", () => {
    const src = read("supabase/functions/send-tour-notifications/index.ts");
    expect(src).not.toMatch(/Contact:\s*\$\{tour\.inquiry\?\.user_phone\}/);
    // and the non-admin caller must be a party to the tour
    expect(src).toMatch(/isSeeker\s*&&\s*!isProvider|!isSeeker\s*&&\s*!isProvider/);
  });

  // MSG-4 — seeker-directed SMS must be gated on recorded consent.
  it("seeker SMS is gated on sms_consent in both SMS dispatchers", () => {
    const tour = read("supabase/functions/send-tour-notifications/index.ts");
    expect(tour).toMatch(/userPhone && tour\.inquiry\?\.sms_consent/);
    const msg = read("supabase/functions/send-message-notifications/index.ts");
    expect(msg).toMatch(/user_phone && inquiry\?\.sms_consent/);
  });

  // MSG-2 — the concierge dispatcher restricts the non-admin "user" actor to
  // their own inquiry AND to seeker-initiated event types only.
  it("send-concierge-notifications binds the user actor to their inquiry + seeker types", () => {
    const src = read("supabase/functions/send-concierge-notifications/index.ts");
    expect(src).toMatch(/SEEKER_ALLOWED_TYPES/);
    expect(src).toMatch(/inquiry\.user_id !== authz\.userId/);
    expect(src).toMatch(/forbidden_type/);
  });

  // MSG-6 — the SMS-callback route must bind to the draft owner so a known
  // draftId can't be used to overwrite an authenticated seeker's contact info.
  it("request-concierge-sms-callback binds an owned draft to its owner", () => {
    const src = read("supabase/functions/request-concierge-sms-callback/index.ts");
    expect(src).toMatch(/select\("id, status, user_id"\)/);
    expect(src).toMatch(/if \(existing\.user_id\)/);
    expect(src).toMatch(/callerId !== existing\.user_id/);
  });

  // MSG-9 — an emitted seeker notification must never dead-end.
  //
  // Stage 1 satisfied this with an in-panel route table
  // (src/lib/seekerNotificationRouting.tsx) that sent every retired
  // concierge_* type to /account/saved. Stage 3 retires the consumer account
  // product outright: there is no seeker inbox to route within, so the table
  // and its consuming hook are gone and the SAME contract is now met one
  // level up — every /account/* URL any notification row could hold resolves
  // to the public directory via the retirement redirect.
  //
  // send-concierge-notifications and the rows it has already written are
  // still deliberately untouched.
  it("the retired seeker notification surface is gone and its deep links still resolve", () => {
    for (const gone of [
      "src/lib/seekerNotificationRouting.tsx",
      "src/hooks/useSeekerNotifications.ts",
      "src/pages/seeker/SeekerNotifications.tsx",
      "src/pages/seeker/SeekerNotificationPreferences.tsx",
      "src/components/seeker/SeekerHeader.tsx",
    ]) {
      expect(existsSync(resolve(root, gone)), `${gone} should be removed`).toBe(false);
    }
    const app = read("src/App.tsx");
    expect(app).toMatch(/path="\/account\/\*"\s+element=\{<RetiredSeekerRedirect \/>\}/);
    // No frontend source may route a notification into the retired panel.
    expect(app).not.toMatch(/to="\/account\/(saved|notifications|requests|reviews)"/);
  });

  // The dispatchers stay verify_jwt=false (anon allow-list) — the gate is the
  // in-code authorizeNotifier, matching the project's self-authenticating pattern.
  it("the three dispatchers remain verify_jwt=false in config.toml", () => {
    const cfg = read("supabase/config.toml");
    for (const fn of ["send-message-notifications", "send-concierge-notifications", "send-tour-notifications"]) {
      const re = new RegExp(`\\[functions\\.${fn}\\][\\s\\S]*?verify_jwt = false`);
      expect(cfg, fn).toMatch(re);
    }
  });
});
