/**
 * Phone number formatting and validation utilities
 */

/**
 * Formats a phone number as the user types — display only.
 * Produces format: (XXX) XXX-XXXX
 *
 * Handles E.164-stored values (e.g. `+15551234567`) by stripping the
 * leading "+1" US country code before formatting. Without this guard,
 * an E.164 value displays as `(155) 512-3456` instead of `(555) 123-4567`,
 * which the seeker would correctly see as wrong.
 */
export function formatPhoneNumber(value: string): string {
  if (!value) return "";
  // Remove all non-digits
  let digits = value.replace(/\D/g, "");

  // If this looks like a US E.164 (11 digits starting with "1") OR a
  // bare US-with-country-code, drop the leading "1" so the (XXX) XXX-XXXX
  // mask renders correctly.
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10);

  // Format based on length
  if (limitedDigits.length <= 3) {
    return limitedDigits;
  }
  if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  }
  return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
}

/**
 * Extracts only digits from a phone number string
 */
export function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Validates a US phone number: 10 digits, area code and exchange code
 * must not start with 0 or 1, and rejects obvious junk (all same digit).
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = getPhoneDigits(phone);
  if (digits.length !== 10) return false;
  if (/^(\d)\1{9}$/.test(digits)) return false; // 0000000000, 1111111111, etc.
  const areaCode = digits.charAt(0);
  const exchange = digits.charAt(3);
  if (areaCode === "0" || areaCode === "1") return false;
  if (exchange === "0" || exchange === "1") return false;
  return true;
}

/**
 * Returns a specific error message for an invalid phone number, or null when valid.
 */
export function validatePhoneNumber(phone: string, required = true): string | null {
  const digits = getPhoneDigits(phone);

  if (!digits) {
    return required ? "Phone number is required" : null;
  }
  if (digits.length < 10) {
    return "Please enter a complete 10-digit phone number";
  }
  if (digits.length > 10) {
    return "Phone number should be 10 digits";
  }
  if (/^(\d)\1{9}$/.test(digits)) {
    return "Please enter a real phone number";
  }
  if (digits.charAt(0) === "0" || digits.charAt(0) === "1") {
    return "Area code cannot start with 0 or 1";
  }
  if (digits.charAt(3) === "0" || digits.charAt(3) === "1") {
    return "Phone number is not valid";
  }
  return null;
}

/**
 * Normalizes any phone number to E.164 format for storage / API calls.
 * E.164 is the global canonical phone-number form: `+` followed by country
 * code + national number, no spaces or punctuation. Examples:
 *   "(555) 123-4567"  → "+15551234567"
 *   "555-123-4567"    → "+15551234567"
 *   "+1 555 123 4567" → "+15551234567"
 *   "+44 20 7946 0123" → "+442079460123"
 *   ""                → ""
 *   "abc"             → ""
 *
 * Rules:
 *  - Strips every non-digit except a leading "+"
 *  - 10 digits, no leading "+" → assumed US, prepended with "+1"
 *  - 11 digits starting with "1", no leading "+" → US with country code, prepended with "+"
 *  - Already starts with "+" → kept as-is after stripping non-digits
 *  - Less than 10 digits → returns "" (caller should validate before calling)
 *
 * Persistence rule for this codebase: every phone value written to the
 * database MUST go through formatPhoneE164 first so downstream lookups
 * (verify-sms-code, send-sms-verification-code, twilio-sms-inbound STOP
 * matching) all see the same canonical form regardless of how the user
 * typed it.
 */
export function formatPhoneE164(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (hasPlus) {
    // Already E.164-ish (international); just re-emit "+<digits>"
    return `+${digits}`;
  }
  if (digits.length === 10) {
    // US national number, no country code → assume +1
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    // US national number with country code, no "+" prefix
    return `+${digits}`;
  }
  // Anything else (too short, ambiguous country) — return "" so the
  // caller's validator (`validatePhoneNumber`) can produce the right
  // user-facing error rather than us silently emitting garbage.
  return "";
}
