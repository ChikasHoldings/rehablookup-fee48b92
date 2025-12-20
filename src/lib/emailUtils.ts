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
 * Basic email validation regex
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};
