// Shared IP-address validation for admin surfaces (IP whitelist, identifier
// blocking). Previously each call site rolled its own regex — one accepted
// out-of-range octets like `999.1.1.1`, another accepted a bare `:` as IPv6.
// This is the single source of truth; both allow-list and block-list validate
// through it. Pure + unit-tested (see __tests__/ipValidation.test.ts).

// IPv4: each octet 0–255.
const IPV4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

// IPv6: full, compressed (::), and IPv4-mapped forms. Requires at least one
// group or a valid `::` compression — a bare `:` does NOT match.
const IPV6 =
  /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9])\.){3}(?:25[0-5]|(?:2[0-4]|1?[0-9])?[0-9]))$/;

export function isValidIpv4(value: string): boolean {
  return IPV4.test(value.trim());
}

export function isValidIpv6(value: string): boolean {
  return IPV6.test(value.trim());
}

/** A single IPv4 or IPv6 address (no CIDR suffix). */
export function isValidIp(value: string): boolean {
  const v = value.trim();
  return IPV4.test(v) || IPV6.test(v);
}

/**
 * An IPv4/IPv6 address, optionally with a CIDR prefix in the valid range for
 * its family (0–32 for IPv4, 0–128 for IPv6).
 */
export function isValidIpOrCidr(value: string): boolean {
  const v = value.trim();
  const slash = v.indexOf("/");
  if (slash === -1) return isValidIp(v);
  const addr = v.slice(0, slash);
  const prefixStr = v.slice(slash + 1);
  if (!/^\d{1,3}$/.test(prefixStr)) return false;
  const prefix = Number(prefixStr);
  if (IPV4.test(addr)) return prefix >= 0 && prefix <= 32;
  if (IPV6.test(addr)) return prefix >= 0 && prefix <= 128;
  return false;
}
