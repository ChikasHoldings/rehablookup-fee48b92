/**
 * Normalizes an email address by trimming whitespace and converting to lowercase
 */
export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

/**
 * Formats email as user types (trims leading/trailing spaces, converts to lowercase)
 */
export const formatEmailInput = (email: string): string => {
  // Remove leading spaces and convert to lowercase as they type
  return email.replace(/^\s+/, '').toLowerCase();
};

/**
 * Strict-ish email validation. Rejects common malformed addresses
 * (consecutive dots, leading/trailing dots, missing TLD, length abuse)
 * before sending anything to the server.
 */
export const isValidEmail = (email: string): boolean => {
  const trimmed = email.trim();
  if (!trimmed) return false;
  if (trimmed.length > 254) return false;

  // Single @, non-empty local + domain
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (local.length > 64) return false;

  // No consecutive dots, no leading/trailing dots in local or domain
  if (/\.\./.test(local) || /\.\./.test(domain)) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.startsWith("-") || domain.endsWith("-")) return false;

  // Domain must contain at least one dot and a TLD of >= 2 letters
  if (!/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$/.test(domain)) return false;
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2 || !/^[A-Za-z]{2,}$/.test(tld)) return false;

  // Local part: standard allowed chars
  if (!/^[A-Za-z0-9._%+\-']+$/.test(local)) return false;

  return true;
};

/**
 * Returns a specific error message for an invalid email, or null when valid.
 * Useful for inline field-level errors.
 */
export const getEmailValidationError = (email: string): string | null => {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  if (trimmed.length > 254) return "Email is too long";
  if (!trimmed.includes("@")) return "Email must contain @";
  if (!isValidEmail(trimmed)) return "Please enter a valid email address";
  return null;
};
