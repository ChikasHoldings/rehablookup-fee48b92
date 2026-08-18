/**
 * Facility inventory pipeline — regression suite (SEO Phase 1).
 *
 * Guards the invariants behind the incident this phase fixed: a production
 * build published 3,032 of 3,794 public facilities and every check passed.
 * Three defects combined to make that possible, and each has a test here.
 *
 *   1. Paginated fetches ordered by non-unique columns, so rows were
 *      duplicated across page boundaries and others never fetched.
 *   2. A failed fetch returned [] and the build continued, so "unreachable"
 *      and "empty directory" were indistinguishable.
 *   3. Hardcoded project URL / key fallbacks meant a missing env var built
 *      against a baked-in project instead of failing.
 *
 * Network-free: `fetch` is stubbed. No test here touches Supabase.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const ENV_KEYS = [
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "ALLOW_EMPTY_FACILITY_DATA",
];

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  vi.resetModules();
});

afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.unstubAllGlobals();
});

async function loadModule() {
  return await import("../../scripts/_facility-data.mjs");
}

function stubFetch(impl: (url: string) => unknown) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => impl(url)));
}

function jsonResponse(rows: unknown) {
  return { ok: true, status: 200, json: async () => rows, text: async () => JSON.stringify(rows) };
}

describe("environment contract — no hardcoded project fallbacks", () => {
  it("throws when credentials are absent instead of using a baked-in project", async () => {
    const { resolveSupabaseConfig } = await loadModule();
    expect(() => resolveSupabaseConfig()).toThrow(/Missing required facility-data credentials/);
  });

  it("names both missing variables so the fix is unambiguous", async () => {
    const { resolveSupabaseConfig } = await loadModule();
    expect(() => resolveSupabaseConfig()).toThrow(/SUPABASE_URL/);
    expect(() => resolveSupabaseConfig()).toThrow(/SUPABASE_ANON_KEY/);
  });

  it("returns null (not a default project) under the explicit escape hatch", async () => {
    process.env.ALLOW_EMPTY_FACILITY_DATA = "1";
    const { resolveSupabaseConfig } = await loadModule();
    expect(resolveSupabaseConfig()).toBeNull();
  });

  it("no SEO build script carries a hardcoded Supabase project URL or publishable key", () => {
    const files = [
      "scripts/_facility-data.mjs",
      "scripts/generate-facility-profiles-html.mjs",
    ];
    for (const f of files) {
      const src = read(f);
      // The literal project ref and the publishable-key prefix must not appear
      // as fallbacks. Comments referencing them are fine; assignments are not.
      expect(src, `${f} must not hardcode a project URL`).not.toMatch(
        /["']https:\/\/[a-z]{20}\.supabase\.co["']/,
      );
      expect(src, `${f} must not hardcode a publishable key`).not.toMatch(
        /["']sb_publishable_[A-Za-z0-9_-]+["']/,
      );
    }
  });
});

describe("fail-loud fetch", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example-project.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-key-not-a-real-secret";
  });

  it("throws on a network exception rather than returning []", async () => {
    stubFetch(() => {
      throw new Error("getaddrinfo ENOTFOUND");
    });
    const { fetchPaginated } = await loadModule();
    await expect(fetchPaginated("public_facilities", "id,slug")).rejects.toThrow(
      /Failed to fetch "public_facilities"/,
    );
  });

  it("throws on a non-2xx response and reports status, offset and host", async () => {
    stubFetch(() => ({ ok: false, status: 401, statusText: "Unauthorized", text: async () => "no access" }));
    const { fetchPaginated } = await loadModule();
    await expect(fetchPaginated("public_facilities", "id,slug")).rejects.toThrow(
      /HTTP status\s+: 401/,
    );
  });

  it("throws when the body is not an array", async () => {
    stubFetch(() => ({ ok: true, status: 200, json: async () => ({ message: "nope" }), text: async () => "" }));
    const { fetchPaginated } = await loadModule();
    await expect(fetchPaginated("public_facilities", "id,slug")).rejects.toThrow(
      /expected a JSON array/,
    );
  });

  it("never puts the key in an error message", async () => {
    const secret = "test-key-not-a-real-secret";
    stubFetch(() => ({ ok: false, status: 500, statusText: "err", text: async () => "boom" }));
    const { fetchPaginated } = await loadModule();
    await expect(fetchPaginated("public_facilities", "id,slug")).rejects.toThrow(
      expect.not.stringContaining(secret) as unknown as string,
    );
  });

  it("treats a zero-row facility result as a broken read, not an empty directory", async () => {
    stubFetch(() => jsonResponse([]));
    const { fetchAllFacilities } = await loadModule();
    await expect(fetchAllFacilities()).rejects.toThrow(/returned 0 rows/);
  });

  it("allows the empty result only under the explicit escape hatch", async () => {
    process.env.ALLOW_EMPTY_FACILITY_DATA = "1";
    stubFetch(() => jsonResponse([]));
    const { fetchAllFacilities } = await loadModule();
    await expect(fetchAllFacilities()).resolves.toEqual([]);
  });
});

describe("stable pagination", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example-project.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-key-not-a-real-secret";
  });

  it("appends a unique tiebreaker to every paginated ORDER BY", async () => {
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      return jsonResponse([{ id: "a" }]);
    });
    const { fetchPaginated } = await loadModule();
    await fetchPaginated("public_facilities", "id,slug", { order: "updated_at.desc" });
    const orderParam = decodeURIComponent(seen[0].match(/order=([^&]+)/)![1]);
    expect(orderParam).toBe("updated_at.desc,id.asc");
  });

  it("still orders by the tiebreaker when the caller supplies no order", async () => {
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      return jsonResponse([{ id: "a" }]);
    });
    const { fetchPaginated } = await loadModule();
    await fetchPaginated("facility_services", "id,facility_id");
    expect(decodeURIComponent(seen[0].match(/order=([^&]+)/)![1])).toBe("id.asc");
  });

  it("fails loudly if a row is ever returned on two pages", async () => {
    // Simulate the original defect: a full page, then a page repeating a row
    // from it — which is what an unstable sort produces at a page boundary.
    const pageOne = Array.from({ length: 1000 }, (_, i) => ({ id: `id-${i}` }));
    let call = 0;
    stubFetch(() => {
      call++;
      return jsonResponse(call === 1 ? pageOne : [{ id: "id-500" }]);
    });
    const { fetchPaginated } = await loadModule();
    await expect(fetchPaginated("public_facilities", "id,slug")).rejects.toThrow(
      /Unstable pagination detected/,
    );
  });

  it("the sitemap edge function orders by the primary key last", () => {
    const src = read("supabase/functions/sitemap-facilities/index.ts");
    const facilityQuery = src.slice(src.indexOf("async function generateFacilitiesSitemap"));
    const orderCalls = [...facilityQuery.matchAll(/\.order\("([^"]+)"/g)].map((m) => m[1]);
    expect(orderCalls.slice(0, 3)).toEqual(["featured", "updated_at", "id"]);
  });
});

describe("inventory block truthfulness", () => {
  const facilities = [
    { slug: "alpha-center-denver-co", name: "Alpha Center", city: "Denver", state: "Colorado", featured: false },
    { slug: "beta-center-denver-co", name: "Beta Center", city: "Denver", state: "Colorado", featured: true },
  ];

  it("does not label organic inventory as Featured", async () => {
    const { renderFacilityList } = await loadModule();
    const html = renderFacilityList(facilities, "Denver, CO");
    expect(html).not.toMatch(/Featured Facilities in/);
    expect(html).toMatch(/<h2>Treatment Facilities in Denver, CO<\/h2>/);
  });

  it("still marks a genuinely purchased placement as sponsored", async () => {
    const { renderFacilityList } = await loadModule();
    const html = renderFacilityList(facilities, "Denver, CO");
    expect(html).toMatch(/Sponsored/);
    // exactly one badge — only the featured row carries it
    expect(html.match(/Sponsored/g)).toHaveLength(1);
  });

  it("links every rendered facility to its /center/ profile", async () => {
    const { renderFacilityList } = await loadModule();
    const html = renderFacilityList(facilities, "Denver, CO");
    for (const f of facilities) expect(html).toContain(`href="/center/${f.slug}"`);
  });

  it("renders nothing when there is no inventory rather than inventing any", async () => {
    const { renderFacilityList } = await loadModule();
    expect(renderFacilityList([], "Nowhere, XX")).toBe("");
  });

  it("makes no verified claim for a facility that is not verified", async () => {
    const { renderFacilityList } = await loadModule();
    expect(renderFacilityList(facilities, "Denver, CO")).not.toMatch(/Verified/);
  });
});

describe("city inventory injection", () => {
  // This generator cannot run in a sandbox without database access, so its
  // placement and idempotency logic is covered directly.
  const page = [
    "<html><body>",
    '<main class="rl-main">',
    '<div class="rl-container">',
    "<h1>Rehab Centers in Los Angeles, CA</h1>",
    "<p>intro copy</p>",
    "<h2>Treatment Programs in Los Angeles</h2>",
    "<p>more copy</p>",
    "</div></main></body></html>",
  ].join("\n");

  async function loadInjector() {
    return await import("../../scripts/inject-city-facility-inventory.mjs");
  }

  it("places the block above the first <h2> so inventory is not buried", async () => {
    const { injectBlock } = await loadInjector();
    const out = injectBlock(page, "<h2>Treatment Facilities in Los Angeles, CA</h2><ul></ul>");
    expect(out.indexOf("Treatment Facilities in")).toBeLessThan(
      out.indexOf("<h2>Treatment Programs in Los Angeles</h2>"),
    );
    expect(out.indexOf("<h1>")).toBeLessThan(out.indexOf("Treatment Facilities in"));
  });

  it("is idempotent — re-running replaces the block instead of stacking copies", async () => {
    const { injectBlock, START } = await loadInjector();
    const once = injectBlock(page, "<p>first</p>");
    const twice = injectBlock(once, "<p>second</p>");
    expect(twice.match(new RegExp(START, "g"))).toHaveLength(1);
    expect(twice).toContain("second");
    expect(twice).not.toContain("first");
  });

  it("preserves the surrounding page exactly", async () => {
    const { injectBlock, START, END } = await loadInjector();
    const out = injectBlock(page, "<p>block</p>");
    const stripped = out.replace(new RegExp(`${START}[\\s\\S]*?${END}\\n?`), "");
    expect(stripped).toBe(page);
  });

  it("falls back to </main> when the page has no <h2>", async () => {
    const { injectBlock } = await loadInjector();
    const noH2 = "<html><body><main><h1>x</h1></main></body></html>";
    const out = injectBlock(noH2, "<p>block</p>");
    expect(out.indexOf("<p>block</p>")).toBeLessThan(out.indexOf("</main>"));
  });

  it("covers every state slug used by the city page corpus", async () => {
    const { STATE_ABBR } = await loadInjector();
    for (const s of ["california", "new-york", "illinois", "texas", "colorado"]) {
      expect(STATE_ABBR[s]).toMatch(/^[A-Z]{2}$/);
    }
  });
});

describe("production build wiring", () => {
  const pkg = JSON.parse(read("package.json"));

  it("runs the strict, manifest-requiring inventory guard — not the degradable one", () => {
    expect(pkg.scripts["build:vercel"]).toContain("check:facility-inventory");
    expect(pkg.scripts["check:facility-inventory"]).toContain("REQUIRE_FACILITY_MANIFEST=1");
  });

  it("runs the core-market smoke guard and the facility regression suite", () => {
    expect(pkg.scripts["build:vercel"]).toContain("check:location-inventory:strict");
    expect(pkg.scripts["build:vercel"]).toContain("test:facility-inventory");
  });

  it("injects city inventory after every step that rewrites page HTML", () => {
    const bv: string = pkg.scripts["build:vercel"];
    for (const earlier of ["sync:prerendered-shell", "patch:og-image", "backfill:ga-snippet"]) {
      expect(bv.indexOf(earlier)).toBeLessThan(bv.indexOf("inject:city-inventory"));
    }
    // and before the sitemap is built from the result
    expect(bv.indexOf("inject:city-inventory")).toBeLessThan(bv.indexOf("generate:sitemaps"));
  });

  it("never enables the escape hatch in the build or in CI", () => {
    // Assert it is never ASSIGNED. Naming it in a comment is fine (and the
    // workflow deliberately does, to say it must stay unset); setting it is not.
    expect(JSON.stringify(pkg.scripts)).not.toMatch(/ALLOW_EMPTY_FACILITY_DATA\s*=/);
    const wf = read(".github/workflows/seo-validators.yml");
    expect(wf).not.toMatch(/^\s*ALLOW_EMPTY_FACILITY_DATA\s*:/m);
    expect(wf).not.toMatch(/ALLOW_EMPTY_FACILITY_DATA\s*=/);
  });
});
