// ============================================================================
// Signed unsubscribe tokens (audit finding M4).
//
// The legacy token was bare base64(user_uuid) with no integrity check, so
// anyone who knew (or guessed) a target's UUID could forge an unsubscribe and
// opt them out of provider marketing email. New tokens are HMAC-signed:
//
//     <user_uuid>.<hex HMAC-SHA256(user_uuid)>
//
// Both halves are already URL-safe (UUID = hex+dashes, signature = lowercase
// hex), so the token needs no further encoding in the email link.
//
// Secret resolution: a dedicated UNSUBSCRIBE_TOKEN_SECRET if provisioned, else
// SUPABASE_SERVICE_ROLE_KEY (always present server-side, never shipped to
// clients). This lets the fix ship immediately and be upgraded to a dedicated
// secret later with no code change.
//
// TRANSITION: verifyUnsubscribeToken() still accepts a bare base64(uuid) legacy
// token so unsubscribe links in ALREADY-SENT emails keep working (CAN-SPAM
// requires a functioning opt-out). Remove the legacy branch after 2026-07-31 —
// by then every drip/marketing email carrying an old token will have aged out,
// and forgery is fully closed.
// ============================================================================

const FULL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Looser shape used only for the legacy base64 path (matches the original code).
const LEGACY_UUID_RE = /^[0-9a-f-]{32,36}$/i;

function tokenSecret(): string {
  return (
    Deno.env.get("UNSUBSCRIBE_TOKEN_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    ""
  );
}

async function hmacHex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(tokenSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build a signed unsubscribe token for the given user id. */
export async function signUnsubscribeToken(userId: string): Promise<string> {
  return `${userId}.${await hmacHex(userId)}`;
}

/**
 * Verify an unsubscribe token and return the user id, or null if invalid.
 * Accepts the new signed format and (during the transition window) the legacy
 * bare-base64 format.
 */
export async function verifyUnsubscribeToken(
  token: string | null | undefined,
): Promise<string | null> {
  if (!token) return null;

  const dot = token.indexOf(".");
  if (dot > 0) {
    const userId = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    if (!FULL_UUID_RE.test(userId)) return null;
    const expected = await hmacHex(userId);
    // Length-checked, constant-time-ish compare.
    if (sig.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0 ? userId : null;
  }

  // LEGACY (transition; remove after 2026-07-31): bare base64(user_uuid).
  try {
    const userId = atob(token);
    if (LEGACY_UUID_RE.test(userId)) return userId;
  } catch {
    // not valid base64 — fall through
  }
  return null;
}
