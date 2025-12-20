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
 * Validates a phone number has 10 digits
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digits = getPhoneDigits(phone);
  return digits.length === 10;
}

/**
 * Validates phone number with optional requirement
 */
export function validatePhoneNumber(phone: string, required = true): string | null {
  const digits = getPhoneDigits(phone);
  
  if (!digits && !required) {
    return null;
  }
  
  if (!digits && required) {
    return "Phone number is required";
  }
  
  if (digits.length < 10) {
    return "Please enter a complete 10-digit phone number";
  }
  
  if (digits.length > 10) {
    return "Phone number should be 10 digits";
  }
  
  return null;
}
