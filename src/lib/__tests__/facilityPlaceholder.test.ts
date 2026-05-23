import { describe, expect, it } from "vitest";
import {
  getFacilityPlaceholder,
  getFacilityPlaceholderVariant,
  FACILITY_PLACEHOLDER_VARIANTS,
} from "../facilityPlaceholder";

describe("getFacilityPlaceholder", () => {
  // Locks in the contract that newly-listed facilities (provider
  // onboarding + SAMHSA bulk imports) AUTOMATICALLY get a placeholder
  // assigned. The actual mechanism is "DB defaults image columns to
  // NULL / empty → card renders placeholder via this function → this
  // function is deterministic on facility.id." Anything that breaks
  // these tests breaks the contract.

  it("returns one of the 18 variant URLs", () => {
    const url = getFacilityPlaceholder({ id: "abc" });
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
    expect(FACILITY_PLACEHOLDER_VARIANTS).toContain(url);
  });

  it("is deterministic — same id always maps to the same variant", () => {
    const id = "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d";
    const first = getFacilityPlaceholder({ id });
    const second = getFacilityPlaceholder({ id });
    const third = getFacilityPlaceholder({ id });
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it("different facility IDs typically map to different variants", () => {
    // Not a guarantee per pair (collisions are expected at 1-in-18), but
    // across a small sample the bucket count must be > 1 — guards against
    // a degenerate hash that returns the same variant for everything.
    const ids = [
      "001e8b9f-0ea0-4929-88b9-81e26838ca86",
      "002d3a89-3319-4d0a-980e-dc22afab5e0c",
      "0037c902-9623-4d7f-a78e-6a711a57d18e",
      "004a7ad7-bae7-4df1-aa4e-254feea01d79",
      "00793aa3-0507-4d15-b072-299766bb47e5",
      "0086bb9b-b59b-44d4-b847-2e3c65aae4f2",
      "00963d14-92ee-4381-b7b7-e538fb2ccc96",
      "00a56996-80b0-41bf-91a1-f08ddcd392c4",
    ];
    const variants = new Set(ids.map((id) => getFacilityPlaceholder({ id })));
    expect(variants.size).toBeGreaterThan(1);
  });

  it("distributes across all 18 variants on a large sample (newly-imported SAMHSA bulk simulation)", () => {
    // SAMHSA imports add hundreds of facilities at a time. Across that
    // many UUIDs the FNV-1a hash should hit every bucket so the directory
    // doesn't end up biased toward 1-2 illustrations.
    const buckets = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      // Synthesize a UUID-shaped id deterministically. Multiplying by a
      // large prime spreads bytes across the leading characters that
      // dominate the hash for short prefixes.
      const id = `f-${((i * 2654435761) >>> 0).toString(16)}-${i}`;
      buckets.add(getFacilityPlaceholder({ id }));
    }
    expect(buckets.size).toBe(FACILITY_PLACEHOLDER_VARIANTS.length);
  });

  it("returns the default variant when facility is null / undefined", () => {
    // Card components guard with `facility && ...` before calling this,
    // but the resolver must never return undefined regardless — that
    // would crash <img src={undefined}>. Default to first variant.
    expect(getFacilityPlaceholder(null)).toBe(FACILITY_PLACEHOLDER_VARIANTS[0]);
    expect(getFacilityPlaceholder(undefined)).toBe(FACILITY_PLACEHOLDER_VARIANTS[0]);
  });

  it("returns the default variant when id is null / empty / missing", () => {
    // Provider's AddLocation insert does NOT include `id` in the payload
    // — Postgres assigns one via gen_random_uuid() default. Between the
    // server reply and the client cache, there's a tiny window where the
    // card might render with id = undefined. Must not crash.
    expect(getFacilityPlaceholder({ id: null })).toBe(FACILITY_PLACEHOLDER_VARIANTS[0]);
    expect(getFacilityPlaceholder({ id: undefined })).toBe(FACILITY_PLACEHOLDER_VARIANTS[0]);
    expect(getFacilityPlaceholder({ id: "" })).toBe(FACILITY_PLACEHOLDER_VARIANTS[0]);
    expect(getFacilityPlaceholder({})).toBe(FACILITY_PLACEHOLDER_VARIANTS[0]);
  });

  it("coerces non-string ids (e.g. numeric primary keys)", () => {
    // Defensive — the type signature accepts string | number | null,
    // and external systems sometimes send numeric ids.
    const url = getFacilityPlaceholder({ id: 12345 });
    expect(FACILITY_PLACEHOLDER_VARIANTS).toContain(url);
  });

  it("exposes the resolved variant name for analytics / debugging", () => {
    const name = getFacilityPlaceholderVariant({ id: "abc-123" });
    expect([
      "residence","clinic","hospital","retreat","brownstone","campus",
      "bungalow","midcentury","colonial","villa","lakeside","mountain",
      "victorian","glass","ranch","adobe","loft","coastal",
    ]).toContain(name);
  });

  it("ships exactly 18 variants", () => {
    // If a future change removes or adds a variant without updating the
    // hash modulo, the distribution would silently skew. Locks the count.
    expect(FACILITY_PLACEHOLDER_VARIANTS.length).toBe(18);
  });
});
