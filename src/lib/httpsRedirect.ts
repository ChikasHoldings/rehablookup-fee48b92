/**
 * HTTPS Enforcement Utilities
 * Ensures all traffic uses secure HTTPS connections
 */

/**
 * Redirects to HTTPS if currently on HTTP
 * Should be called early in the application lifecycle
 */
export function enforceHttps(): void {
  if (typeof window === "undefined") return;

  // Only enforce in production
  if (import.meta.env.DEV) return;

  // Check if we're on HTTP
  if (
    window.location.protocol === "http:" &&
    window.location.hostname !== "localhost" &&
    !window.location.hostname.startsWith("127.") &&
    !window.location.hostname.startsWith("192.168.")
  ) {
    // Redirect to HTTPS
    window.location.href = window.location.href.replace("http:", "https:");
  }
}

/**
 * Sets security headers via meta tags
 * Note: Real security headers should be set server-side, but these provide client-side hints
 */
export function setSecurityMetaTags(): void {
  if (typeof document === "undefined") return;

  // Content Security Policy upgrade insecure requests
  const cspMeta = document.createElement("meta");
  cspMeta.httpEquiv = "Content-Security-Policy";
  cspMeta.content = "upgrade-insecure-requests";
  
  // Only add if not already present
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    document.head.appendChild(cspMeta);
  }

  // Referrer policy for privacy
  const referrerMeta = document.createElement("meta");
  referrerMeta.name = "referrer";
  referrerMeta.content = "strict-origin-when-cross-origin";
  
  if (!document.querySelector('meta[name="referrer"]')) {
    document.head.appendChild(referrerMeta);
  }
}

/**
 * Checks if the current connection is secure
 */
export function isSecureConnection(): boolean {
  if (typeof window === "undefined") return true;
  
  return (
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname.startsWith("127.") ||
    window.location.hostname.startsWith("192.168.")
  );
}

/**
 * Initialize all security measures
 */
export function initSecurity(): void {
  enforceHttps();
  setSecurityMetaTags();
}