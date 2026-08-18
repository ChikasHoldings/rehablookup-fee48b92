/**
 * Canonical ZIP handling.
 *
 * Audited against the live catalogue before writing any rule here
 * (3,797 approved facilities):
 *
 *   • 0     rows with a null/blank zip_code
 *   • 3,796 rows matching /^\d{5}$/
 *   • 1     row in ZIP+4 form
 *   • 0     malformed rows
 *
 * That is clean enough to drive exact public filtering, so ZIP is a
 * first-class exact scope rather than a hint.
 *
 * Rules:
 *   • Exact ZIP means exact ZIP. No substring, no prefix, no "starts
 *     with 900" bucketing.
 *   • ZIP+4 canonicalizes to its 5-digit base on BOTH sides of the
 *     comparison. Documented and safe here: the +4 segment identifies a
 *     delivery route within one 5-digit ZIP, so 90210-1234 is inside
 *     90210 by construction.
 *   • A partial ZIP (fewer than 5 digits) is NOT a ZIP. It resolves to
 *     null and the caller treats the query as unresolved rather than
 *     inventing precision.
 */

/**
 * Canonicalize a ZIP to its 5-digit base, or `null` if the input is not
 * a well-formed US ZIP. Surrounding whitespace is ignored.
 */
export function normalizeZip(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\d{5})(?:-?\d{4})?$/);
  return m ? m[1] : null;
}

/** True when both inputs are valid ZIPs sharing the same 5-digit base. */
export function zipsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeZip(a);
  const nb = normalizeZip(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** True when the input is a well-formed 5-digit or ZIP+4 code. */
export function isValidZip(input: string | null | undefined): boolean {
  return normalizeZip(input) !== null;
}
