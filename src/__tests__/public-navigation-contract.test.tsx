/**
 * Pre-merge public navigation contract.
 *
 * The GLOBAL public navigation shell — header, footer, mega-menus, the
 * crawler/static shell, and the root SPA/noscript document — is the one surface
 * every visitor sees on every page. After the directory cutover it must
 * describe a search-and-compare directory and nothing else.
 *
 * Scope discipline (this is the whole reason the guard is written this way):
 * a repo-wide ban on "lead", "placement", "matching" or "international" would
 * be useless and wrong. Editorial articles legitimately discuss interventions
 * and state placement programs; provider SEO guides legitimately discuss lead
 * generation; /international and /us-rehab/* are legitimate informational SEO
 * pages that simply no longer get global-nav weight; and vercel.json plus the
 * React Router compatibility redirects MUST keep naming the retired routes so
 * old backlinks keep resolving.
 *
 * So every assertion below is scoped to GLOBAL_NAV_SOURCES only, and every
 * banned pattern is a destination or a specific phrase — never a bare word.
 *
 * Two classes of failure are covered:
 *
 *   1. RETIRED DESTINATIONS / CLAIMS — a global menu item pointing at a
 *      retired placement funnel, or selling a service the directory does not
 *      run (concierge placement, verified patient leads, free VOB by our care
 *      team, "our matching process", 24/7 support, international support).
 *
 *   2. REDIRECT SOURCES — a global menu item that only "works" because a 301
 *      catches it. /rehab-centers → /search-results and /providers/resources
 *      (a different component from the canonical /provider-resources) are the
 *      two that shipped. Global nav links the final canonical route.
 *
 * Plus a positive assertion that the new primary IA actually exists, so this
 * file fails if the structure is quietly reverted rather than only if
 * something bad is re-added.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

/**
 * Every source that renders GLOBAL public navigation chrome. Provider/admin
 * application navigation is deliberately out of scope — it is a later stage.
 */
const GLOBAL_NAV_SOURCES = [
  "src/components/layout/Header.tsx",
  "src/components/layout/Footer.tsx",
  "src/components/mega-menus/FindTreatmentMegaMenu.tsx",
  "src/components/mega-menus/ResourcesMegaMenu.tsx",
  "src/components/provider-guides/ProviderMegaMenu.tsx",
  "scripts/_seo-page-shell.mjs",
  "index.html",
];

/**
 * Strips comments so an explanatory note about what was removed ("this used to
 * link /insurance-verification") does not read as a reintroduction. The guard
 * is about what actually ships.
 */
function stripComments(src: string, rel: string): string {
  if (rel.endsWith(".html")) return src.replace(/<!--[\s\S]*?-->/g, "");
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const sources = GLOBAL_NAV_SOURCES.map((rel) => ({ rel, code: stripComments(read(rel), rel) }));

/**
 * Pull the internal DESTINATIONS out of a navigation source, rather than
 * grepping raw string literals.
 *
 * This distinction is load-bearing. Header.tsx's active-state predicates
 * legitimately test `p.startsWith("/rehab-centers")` and
 * `p.startsWith("/provider-guides")` so a state or guide page still highlights
 * its parent nav item — those are matchers, not links, and a literal-grep
 * flags them as redirect-source links. Only values in destination position
 * count: `to=`/`href=` attributes, and `href:`/`path:`/`"key":` object values.
 */
function navDestinations(code: string): string[] {
  const out = new Set<string>();
  const re = /(?:\bto=|\bhref=|:\s*)["'`](\/[^"'`\s{}]*)["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) out.add(m[1]);
  return [...out];
}

const destinations = sources.map(({ rel, code }) => ({ rel, dests: navDestinations(code) }));

/** Exact route, allowing a querystring or fragment but NOT a deeper path. */
const isRoute = (dest: string, route: string) =>
  dest === route || dest.startsWith(`${route}?`) || dest.startsWith(`${route}#`);

/** The route itself or anything beneath it. */
const isRouteOrBelow = (dest: string, route: string) =>
  isRoute(dest, route) || dest.startsWith(`${route}/`);

/**
 * Destinations no global menu may link — the retired placement funnels, the
 * wrong provider-resource path, and the RehabLookup-operated VOB page.
 * Prefix-matched, so `/concierge` also covers `/concierge/intake` while never
 * matching a lookalike slug like `/concierge-guide`.
 */
const BANNED_DESTINATIONS = [
  "/concierge",
  "/request-help",
  "/placement-help",
  "/international/apply",
  "/international/intake",
  "/international/thank-you",
  "/providers/resources",
  "/insurance-verification",
  // Consumer-account retirement (stage 3). The whole seeker namespace is a
  // 301 to /search-results, so global nav must never offer an account portal
  // or a consumer signup — searching, comparing and contacting a facility
  // requires no account at all. Prefix-matched, so `/account` covers
  // `/account/saved-searches` and every other retired panel path.
  "/account",
  "/my-account",
  "/seeker",
  "/signup",
  "/reset-password",
];

/**
 * Redirect sources. Linking these from global nav is a SOFT failure — the page
 * still loads, via a 301 — which is exactly why it needs a source-level test
 * and not just a crawl. Exact-matched: `/rehab-centers` is a redirect source,
 * `/rehab-centers/california` is a real SEO page.
 */
const REDIRECT_SOURCES: Array<[string, string]> = [
  ["/rehab-centers", "/search-results"],
  ["/provider-guides", "/provider-resources"],
  ["/outpatient-near-me", "/outpatient-rehab-near-me"],
  ["/dual-diagnosis-rehab-near-me", "/dual-diagnosis-near-me"],
  ["/resources/signs-of-addiction", "/resources/youth-addiction-warning-signs"],
  ["/resources/insurance-coverage-guide", "/resources/insurance-appeal-rehab-denial"],
];

/**
 * Operational promises the directory model does not support. Every entry is a
 * multi-word phrase that appeared verbatim in the shipped navigation.
 */
const BANNED_COPY: Array<[string, RegExp]> = [
  ["Concierge placement", /concierge\s+placement/i],
  ["Verified patient leads", /verified\s+patient\s+leads/i],
  ["Free VOB by our care team", /free\s+vob\b|by\s+our\s+care\s+team/i],
  ["Our matching process", /our\s+matching\s+process/i],
  ["24/7 Support (badge)", /24\/7\s+support/i],
  ["International Support (badge)", /international\s+support/i],
  ["Free listing • Verified leads", /verified\s+leads/i],
  ["Verify Insurance (Free)", /verify\s+(?:my\s+)?insurance\s*\(free\)|verify\s+my\s+insurance/i],
];

describe("global public navigation — sources", () => {
  it("every global navigation source exists", () => {
    for (const rel of GLOBAL_NAV_SOURCES) {
      expect(existsSync(resolve(root, rel)), `missing ${rel}`).toBe(true);
    }
  });

  it("the retired international product mega-menu is gone", () => {
    expect(existsSync(resolve(root, "src/components/mega-menus/InternationalMegaMenu.tsx"))).toBe(false);
    for (const { rel, code } of sources) {
      expect(code, `${rel} still references InternationalMegaMenu`).not.toMatch(/InternationalMegaMenu/);
    }
  });
});

describe("global public navigation — retired destinations", () => {
  it.each(BANNED_DESTINATIONS)("no global nav link to %s", (route) => {
    const offenders = destinations
      .filter(({ dests }) => dests.some((d) => isRouteOrBelow(d, route)))
      .map(({ rel }) => rel);
    expect(offenders, `${route} is linked from global navigation`).toEqual([]);
  });

  it("extracts a plausible number of destinations from every source", () => {
    // Cheap canary: if the extractor silently stops matching (a refactor to
    // <NavLink>, a new link helper), every ban above would pass vacuously.
    for (const { rel, dests } of destinations) {
      expect(dests.length, `${rel} yielded no navigation destinations`).toBeGreaterThan(3);
    }
  });
});

describe("global public navigation — canonical destinations only", () => {
  it.each(REDIRECT_SOURCES)("no global nav link to redirect source %s", (route, canonical) => {
    const offenders = destinations
      .filter(({ dests }) => dests.some((d) => isRoute(d, route)))
      .map(({ rel }) => rel);
    expect(offenders, `${route} is a redirect source — link ${canonical} directly`).toEqual([]);
  });

  it("the canonical provider resource route is the one that is linked", () => {
    const provider = sources.find((s) => s.rel.endsWith("ProviderMegaMenu.tsx"))!;
    const footer = sources.find((s) => s.rel.endsWith("Footer.tsx"))!;
    expect(provider.code).toMatch(/["'`]\/provider-resources["'`]/);
    expect(footer.code).toMatch(/["'`]\/provider-resources["'`]/);
  });

  it("the primary directory search target is /search-results", () => {
    const shell = sources.find((s) => s.rel.endsWith("_seo-page-shell.mjs"))!;
    expect(shell.code).toMatch(/<a href="\/search-results">Find Treatment<\/a>/);
  });
});

describe("global public navigation — retired operational claims", () => {
  it.each(BANNED_COPY)("no global nav copy promises %s", (label, pattern) => {
    const offenders = sources.filter(({ code }) => pattern.test(code)).map(({ rel }) => rel);
    expect(offenders, `"${label}" still appears in global navigation`).toEqual([]);
  });
});

describe("global public navigation — primary IA", () => {
  const header = () => read("src/components/layout/Header.tsx");

  it("exposes the five directory jobs in order, once each", () => {
    const src = header();
    const ids = [...src.matchAll(/^\s{4}id: "([a-z-]+)",$/gm)].map((m) => m[1]);
    expect(ids).toEqual(["find-treatment", "insurance", "resources", "compare", "for-providers"]);
  });

  it("uses 'Find Treatment' and has no duplicate 'Search Centers' top-level item", () => {
    const src = stripComments(header(), "src/components/layout/Header.tsx");
    expect(src).toMatch(/label: "Find Treatment"/);
    expect(src).not.toMatch(/label: "Find Rehab"/);
    expect(src).not.toMatch(/label: "Search Centers"/);
    expect(src).not.toMatch(/label: "US Treatment"/);
  });

  it("Insurance and Compare are direct links to their canonical hubs", () => {
    const src = header();
    expect(src).toMatch(/kind: "link",\s*\n\s*id: "insurance",\s*\n\s*href: "\/insurance",/);
    expect(src).toMatch(/kind: "link",\s*\n\s*id: "compare",\s*\n\s*href: "\/compare",/);
  });

  it("desktop, tablet and mobile all render from the same primaryNav list", () => {
    const src = stripComments(header(), "src/components/layout/Header.tsx");
    // Tablet "More" and the mobile panel must both derive from primaryNav —
    // a hand-maintained second list is how the old IA drifted per viewport.
    expect(src).toMatch(/const \[primaryLead, \.\.\.tabletHiddenItems\] = primaryNav;/);
    expect(src).toMatch(/\{primaryNav\.map\(/);
    expect(src).toMatch(/\{tabletHiddenItems\.map\(/);
    expect(src).not.toMatch(/standaloneLinks/);
  });

  it("the footer exposes the five directory sections and no retired ones", () => {
    const src = stripComments(read("src/components/layout/Footer.tsx"), "src/components/layout/Footer.tsx");
    const titles = [...src.matchAll(/\{ title: "([^"]+)", links:/g)].map((m) => m[1]);
    expect(titles).toEqual([
      "Find Treatment",
      "Treatment & Insurance",
      "Resources",
      "For Providers",
      "Company",
    ]);
    expect(src).not.toMatch(/Featured Programs/);
    expect(src).not.toMatch(/International Rehab/);
    expect(src).not.toMatch(/Saved Searches/);
    expect(src).not.toMatch(/trustBadges/);
  });

  it("the footer CTA strip offers search and compare, not international patients", () => {
    const src = read("src/components/layout/Footer.tsx");
    // Isolate the CTA strip so this asserts about the strip, not the whole file.
    const strip = src.slice(src.indexOf("── CTA Strip"), src.indexOf("── Popular Cities Strip"));
    expect(strip.length).toBeGreaterThan(200);
    expect(strip).toMatch(/to="\/search-results"[\s\S]*?Search Treatment Centers/);
    expect(strip).toMatch(/to="\/compare"[\s\S]*?Compare Facilities/);
    expect(strip).not.toMatch(/International Patients/);
    expect(strip).not.toMatch(/\/international/);
  });
});
