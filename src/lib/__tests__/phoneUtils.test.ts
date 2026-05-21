import { describe, expect, it } from "vitest";
import { formatPhoneE164, formatPhoneNumber, isValidPhoneNumber, validatePhoneNumber } from "../phoneUtils";

describe("formatPhoneE164", () => {
  describe("US 10-digit input — the most common signup case", () => {
    it.each([
      ["5551234567", "+15551234567"],
      ["(555) 123-4567", "+15551234567"],
      ["555-123-4567", "+15551234567"],
      ["555.123.4567", "+15551234567"],
      ["555 123 4567", "+15551234567"],
    ])("normalizes %s → %s", (input, expected) => {
      expect(formatPhoneE164(input)).toBe(expected);
    });
  });

  describe("US 11-digit with country code (no leading +)", () => {
    it.each([
      ["15551234567", "+15551234567"],
      ["1 555 123 4567", "+15551234567"],
      ["1-555-123-4567", "+15551234567"],
    ])("normalizes %s → %s", (input, expected) => {
      expect(formatPhoneE164(input)).toBe(expected);
    });
  });

  describe("Already E.164 (leading +)", () => {
    it.each([
      ["+15551234567", "+15551234567"],
      ["+1 555 123 4567", "+15551234567"],
      ["+44 20 7946 0123", "+442079460123"],
      ["+442079460123", "+442079460123"],
    ])("passes through %s → %s", (input, expected) => {
      expect(formatPhoneE164(input)).toBe(expected);
    });
  });

  describe("Empty / invalid input — returns empty string for caller to validate", () => {
    it.each([
      ["", ""],
      ["   ", ""],
      ["abc", ""],
      ["123", ""],            // too short
      ["555-12", ""],         // partial
      ["()-", ""],            // punctuation only
      [null, ""],             // defensive
      [undefined, ""],
    ])("returns '' for %s", (input, expected) => {
      // @ts-expect-error — testing null/undefined defensive branches
      expect(formatPhoneE164(input)).toBe(expected);
    });
  });

  describe("Idempotency — re-running formatPhoneE164 on its own output is a no-op", () => {
    it.each([
      "5551234567",
      "(555) 123-4567",
      "+44 20 7946 0123",
    ])("formatPhoneE164(formatPhoneE164(%s)) === formatPhoneE164(%s)", (input) => {
      const once = formatPhoneE164(input);
      const twice = formatPhoneE164(once);
      expect(twice).toBe(once);
    });
  });

  describe("Round-trip: E.164 storage display correctly with formatPhoneNumber", () => {
    // The seeker UI displays E.164-stored phones via formatPhoneNumber.
    // Confirm the round-trip produces the human-readable mask.
    it("(555) 123-4567 typed → +15551234567 stored → (555) 123-4567 displayed", () => {
      const stored = formatPhoneE164("(555) 123-4567");
      expect(stored).toBe("+15551234567");
      const displayed = formatPhoneNumber(stored);
      expect(displayed).toBe("(555) 123-4567");
    });
  });
});

describe("isValidPhoneNumber / validatePhoneNumber — sanity", () => {
  // Note: the validator rejects exchange codes starting with 0 or 1, so
  // "(555) 123-4567" is INVALID per US dialing rules even though it
  // looks like a placeholder. Use an actually-valid SF number for the
  // happy path here.
  it("accepts a valid 10-digit US number", () => {
    expect(isValidPhoneNumber("(415) 555-2671")).toBe(true);
    expect(validatePhoneNumber("(415) 555-2671")).toBeNull();
  });
  it("rejects too few digits", () => {
    expect(isValidPhoneNumber("415-555")).toBe(false);
  });
  it("rejects repeated-digit junk", () => {
    expect(isValidPhoneNumber("0000000000")).toBe(false);
    expect(isValidPhoneNumber("1111111111")).toBe(false);
  });
  it("rejects area codes starting with 0 or 1", () => {
    expect(isValidPhoneNumber("0551234567")).toBe(false);
    expect(isValidPhoneNumber("1551234567")).toBe(false);
  });
});
