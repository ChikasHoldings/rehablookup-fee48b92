/**
 * Validate a `?returnTo=` / `?redirect=` query parameter before passing
 * it to `navigate()` or `window.location.assign()`. Rejects anything
 * that could escape the origin or that React Router might misinterpret:
 *
 *   - null / empty                    → null
 *   - "https://evil.com/..."          → null  (absolute URL)
 *   - "//evil.com/path"               → null  (protocol-relative)
 *   - "/\evil.com" / "/\\evil.com"    → null  (Windows-style escapes that
 *                                              some browsers normalize to //)
 *   - "/provider/dashboard?x=1"       → "/provider/dashboard?x=1" (safe)
 *
 * Previously inlined in both App.tsx and Onboarding.tsx with identical
 * bodies; Login.tsx used the raw value without validation. Extracted so
 * every caller in the auth + provider-onboarding pipeline applies the
 * same allow-list.
 */
export function safeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.startsWith("/\\")) return null;
  return raw;
}
