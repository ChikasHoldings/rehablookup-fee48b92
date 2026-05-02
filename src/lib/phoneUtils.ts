/**
 * Phone number formatting and validation utilities
 */

/**
 * Formats a phone number as the user types
 * Produces format: (XXX) XXX-XXXX
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  
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
