/**
 * Trusted Device Token Management for Admin 2FA
 * Uses localStorage to store a hashed device token that maps to a backend record.
 */

const TD_TOKEN_KEY = "rl_admin_td_token";

export function getStoredDeviceToken(): string | null {
  try {
    return localStorage.getItem(TD_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredDeviceToken(token: string): void {
  try {
    localStorage.setItem(TD_TOKEN_KEY, token);
  } catch {}
}

export function clearStoredDeviceToken(): void {
  try {
    localStorage.removeItem(TD_TOKEN_KEY);
    // Also clear legacy key
    localStorage.removeItem("rl_admin_trusted_device_token");
  } catch {}
}

/**
 * Generate a device token and its hash.
 * The raw token is stored client-side; the hash is stored server-side.
 */
export async function generateDeviceToken(): Promise<{ raw: string; hash: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const raw = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

  // SHA-256 hash for server-side storage
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  const hashArray = new Uint8Array(hashBuffer);
  const hash = Array.from(hashArray, (b) => b.toString(16).padStart(2, "0")).join("");

  return { raw, hash };
}

/**
 * Hash an existing token for server-side lookup.
 */
export async function hashDeviceToken(raw: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, (b) => b.toString(16).padStart(2, "0")).join("");
}
