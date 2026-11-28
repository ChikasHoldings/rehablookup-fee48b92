import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { statesData } from "@/data/locationSeoData";
import { locationHubs } from "@/lib/seo/locationHubs";

describe("locationHubs", () => {
  it("links a city that has a hub page", () => {
    expect(locationHubs.cityPath("Texas", "Houston")).toBe("/rehab-centers/texas/houston");
    expect(locationHubs.statePath("New York")).toBe("/rehab-centers/new-york");
  });

  it("uses the hub's own slug, not the lowercased name", () => {
    const tx = statesData.find((s) => s.slug === "texas")!;
    const arlington = tx.cities.find((c) => c.name === "Arlington");
    if (arlington) expect(locationHubs.cityPath("Texas", "Arlington")).toBe(`/rehab-centers/texas/${arlington.slug}`);
  });

  it("returns null for a town without a hub page (would 404)", () => {
    expect(locationHubs.cityPath("California", "Calistoga")).toBeNull();
    expect(locationHubs.cityPath("Iowa", "Tiffin")).toBeNull();
    expect(locationHubs.cityPath("Nowhere", "Springfield")).toBeNull();
  });

  it("every resolvable city hub has a prerendered page", () => {
    const missing: string[] = [];
    for (const s of statesData) {
      for (const c of s.cities) {
        const p = locationHubs.cityPath(s.name, c.name)!;
        if (!existsSync(path.join(process.cwd(), "public", `${p}.html`))) missing.push(p);
      }
    }
    expect(missing).toEqual([]);
  });
});
