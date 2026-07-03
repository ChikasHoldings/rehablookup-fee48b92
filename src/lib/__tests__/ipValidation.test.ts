import { describe, it, expect } from "vitest";
import { isValidIpv4, isValidIpv6, isValidIp, isValidIpOrCidr } from "@/lib/ipValidation";

describe("isValidIpv4", () => {
  it("accepts valid addresses", () => {
    expect(isValidIpv4("192.168.1.1")).toBe(true);
    expect(isValidIpv4("0.0.0.0")).toBe(true);
    expect(isValidIpv4("255.255.255.255")).toBe(true);
    expect(isValidIpv4("  10.0.0.1  ")).toBe(true); // trimmed
  });
  it("rejects out-of-range octets and malformed input", () => {
    expect(isValidIpv4("999.1.1.1")).toBe(false);
    expect(isValidIpv4("256.1.1.1")).toBe(false);
    expect(isValidIpv4("1.2.3")).toBe(false);
    expect(isValidIpv4("1.2.3.4.5")).toBe(false);
    expect(isValidIpv4("abc")).toBe(false);
  });
});

describe("isValidIpv6", () => {
  it("accepts full, compressed, and mapped forms", () => {
    expect(isValidIpv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(true);
    expect(isValidIpv6("2001:db8::8a2e:370:7334")).toBe(true);
    expect(isValidIpv6("::1")).toBe(true);
    expect(isValidIpv6("::")).toBe(true);
    expect(isValidIpv6("::ffff:192.168.1.1")).toBe(true);
  });
  it("rejects a bare colon and garbage", () => {
    expect(isValidIpv6(":")).toBe(false);
    expect(isValidIpv6("")).toBe(false);
    expect(isValidIpv6("gggg::1")).toBe(false);
    expect(isValidIpv6("12345::1")).toBe(false);
  });
});

describe("isValidIp", () => {
  it("accepts either family, rejects CIDR", () => {
    expect(isValidIp("192.168.1.1")).toBe(true);
    expect(isValidIp("::1")).toBe(true);
    expect(isValidIp("192.168.1.0/24")).toBe(false);
  });
});

describe("isValidIpOrCidr", () => {
  it("accepts addresses and in-range CIDR for both families", () => {
    expect(isValidIpOrCidr("192.168.1.0/24")).toBe(true);
    expect(isValidIpOrCidr("10.0.0.0/8")).toBe(true);
    expect(isValidIpOrCidr("2001:db8::/32")).toBe(true);
    expect(isValidIpOrCidr("192.168.1.1")).toBe(true);
  });
  it("rejects out-of-range or malformed prefixes", () => {
    expect(isValidIpOrCidr("192.168.1.0/33")).toBe(false);
    expect(isValidIpOrCidr("2001:db8::/129")).toBe(false);
    expect(isValidIpOrCidr("192.168.1.0/")).toBe(false);
    expect(isValidIpOrCidr("192.168.1.0/ab")).toBe(false);
  });
});
