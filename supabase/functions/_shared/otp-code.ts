// Shared helpers for short-lived OTP / one-time-code generation.
// Math.random isn't a CSPRNG; for an authentication factor (even
// short-lived) we use Web Crypto.

export function generateOtpCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}
