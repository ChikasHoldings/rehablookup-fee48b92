/**
 * Claim email-domain verification rules.
 *
 * These MUST stay in lockstep with the initiate-claim-email-verification edge
 * function (`extractDomain` / `emailDomainMatchesWebsite`). The client uses
 * them only to decide which verification method to RECOMMEND; the edge
 * function is authoritative and rejects with DOMAIN_MISMATCH.
 *
 * Recommending a method the server will refuse is worse than recommending
 * nothing: ClaimWizard's picker auto-routes to the "best" method and tells the
 * provider their address already lives on the facility's domain, so a
 * false positive sends them down a path that dead-ends on submit.
 */

/**
 * Normalized hostname for a website value, `www.` stripped. Accepts bare
 * hostnames as well as full URLs. Returns null for unparseable input.
 *
 * Mirrors extractDomain() in initiate-claim-email-verification.
 */
export function facilityHostFromWebsite(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    // Scheme test is case-INSENSITIVE: a provider who types "HTTPS://..." in
    // the listing editor would otherwise get "https://HTTPS://..." prepended,
    // which parses to the host "https" and silently locks them out of
    // email-domain verification.
    const u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/** The domain part of an email address, lowercased. Null when malformed. */
export function emailHost(email: string | null | undefined): string | null {
  if (!email || !email.includes("@")) return null;
  const host = email.split("@")[1]?.toLowerCase().trim();
  return host && host.length > 0 ? host : null;
}

/**
 * Whether an email address is accepted for email-domain verification against
 * a facility website: exact host match, or a subdomain of it.
 *
 * Mirrors emailDomainMatchesWebsite() in initiate-claim-email-verification.
 *
 * Note the asymmetry this deliberately preserves: an email on a SUBDOMAIN of
 * the facility host is accepted (mail.example.org vs example.org), but an
 * email on the PARENT of a subdomain host is not (example.org vs
 * admissions.example.org). An earlier client-only apex-domain comparison
 * accepted the parent case and disagreed with the server.
 */
export function emailMatchesFacilityWebsite(
  email: string | null | undefined,
  website: string | null | undefined,
): boolean {
  const host = emailHost(email);
  const facilityHost = facilityHostFromWebsite(website);
  if (!host || !facilityHost) return false;
  return host === facilityHost || host.endsWith(`.${facilityHost}`);
}
