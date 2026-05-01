/**
 * Recipient email guard.
 *
 * Rejects malformed or disposable email addresses BEFORE we hand them to
 * Resend (or any other provider) — this keeps the failure path on our side
 * with a stable `email_rejected` 400 code instead of a vendor 4xx that
 * would be surfaced as 500 by the caller.
 *
 * Returns a discriminated result so callers can map straight to a
 * `jsonError` / structured response without try/catch gymnastics.
 *
 * Reasons:
 *   - "format"     -> failed strict regex / length / dot rules
 *   - "disposable" -> domain matches the disposable blocklist
 *   - "role"       -> common role-style local part (postmaster@, abuse@, ...)
 *
 * Keep this list small and conservative. The goal is not to be a full
 * "email-validator" — it's to stop the obvious junk that would otherwise
 * waste a Resend send and a queue retry.
 */

export type RecipientReason = "format" | "disposable" | "role";

export type RecipientCheck =
  | { ok: true; email: string }
  | { ok: false; reason: RecipientReason; detail: string };

// Conservative, well-known disposable domains. Lowercase, no wildcards.
// Sources: cross-checked across the most-cited public disposable lists.
const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "33mail.com",
  "anonbox.net",
  "deadaddress.com",
  "dispostable.com",
  "fakeinbox.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "guerrillamailblock.com",
  "harakirimail.com",
  "incognitomail.com",
  "inboxbear.com",
  "jetable.org",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailnesia.com",
  "mailtemp.info",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "nada.email",
  "no-spam.ws",
  "objectmail.com",
  "owlpic.com",
  "sharklasers.com",
  "spamgourmet.com",
  "spambox.us",
  "spamex.com",
  "tempail.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.net",
  "tempmail.us.com",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.net",
  "trbvm.com",
  "yopmail.com",
  "yopmail.net",
  "yopmail.fr",
  "zetmail.com",
]);

// Role-based local parts. These rarely belong to a real human account
// owner and almost always bounce or auto-respond on transactional sends.
const ROLE_LOCAL_PARTS: ReadonlySet<string> = new Set([
  "abuse",
  "admin",
  "administrator",
  "hostmaster",
  "no-reply",
  "noreply",
  "postmaster",
  "root",
  "spam",
  "webmaster",
]);

// Stricter than zod's `.email()`:
//   - exactly one "@"
//   - local part <= 64 chars (RFC 5321)
//   - total <= 254 chars (RFC 5321)
//   - domain has at least one dot, TLD >= 2 alpha chars
//   - no leading/trailing/consecutive dots
const STRICT_EMAIL_RE =
  /^(?!\.)(?!.*\.\.)[a-zA-Z0-9._%+\-]{1,64}(?<!\.)@[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,62}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,62}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export function checkRecipientEmail(raw: unknown): RecipientCheck {
  if (typeof raw !== "string") {
    return { ok: false, reason: "format", detail: "Email must be a string" };
  }
  const email = raw.trim().toLowerCase();
  if (email.length === 0) {
    return { ok: false, reason: "format", detail: "Email is empty" };
  }
  if (email.length > 254) {
    return { ok: false, reason: "format", detail: "Email exceeds 254 characters" };
  }
  if (!STRICT_EMAIL_RE.test(email)) {
    return { ok: false, reason: "format", detail: "Email is malformed" };
  }

  const atIdx = email.indexOf("@");
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);

  if (ROLE_LOCAL_PARTS.has(local)) {
    return {
      ok: false,
      reason: "role",
      detail: `Role-based addresses (${local}@) are not allowed`,
    };
  }

  // Match by exact domain OR any parent suffix (covers `*.mailinator.com`).
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    if (DISPOSABLE_DOMAINS.has(candidate)) {
      return {
        ok: false,
        reason: "disposable",
        detail: `Disposable email domain (${candidate}) is not allowed`,
      };
    }
  }

  return { ok: true, email };
}
