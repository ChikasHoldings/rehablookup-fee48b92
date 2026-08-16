/**
 * Regression coverage for the STAGE-1 PUBLIC POSITIONING of RehabLookup as a
 * directory rather than an intermediary.
 *
 * Why this file exists (independent-verification hotfix #3)
 * ────────────────────────────────────────────────────────
 * The stage-1 cutover reached a READY Vercel Preview whose HTML still sold two
 * things RehabLookup does not do:
 *
 *   1. A matching service. Every generated resource article carried
 *      `seoCtaStrip({ blurb: "Free, confidential matching to verified
 *      treatment centers that fit your needs." })` — RehabLookup's own site
 *      chrome, directly above RehabLookup's own CTA button.
 *   2. A treatment helpline. RehabLookup's real support number, 214-639-6420,
 *      was presented as "Call our 24/7 helpline" / "Confidential, 24/7".
 *
 * Neither tripped `check:directory-public-shell`, because every rule it had
 * required a first-person possessive ("our…", "RehabLookup's…") or a retired
 * PRODUCT NAME. Both of these claims market by context instead.
 *
 * Two design decisions here, both load-bearing:
 *
 *   • The rules are IMPORTED from the guard, not re-declared. A test-local copy
 *     of the patterns could pass while the shipped guard was weakened.
 *   • The CTA assertions run the REAL generator (`renderArticleHtml`) over
 *     committed fixtures — the same code path `build:vercel` runs on Vercel —
 *     with no network, so the failure reproduces offline and in CI.
 *
 * NOT asserted here: anything about 988, 911, or SAMHSA's 1-800-662-4357.
 * Those are third-party crisis resources, they are legitimately described as
 * free/confidential/24-7, and the shared footer carries all three on every
 * page. Tests that policed that language would be wrong.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { renderArticleHtml } from "../../../scripts/generate-resources-html.mjs";
import { seoHeader, seoCtaStrip } from "../../../scripts/_seo-page-shell.mjs";
// The live guard rules — same module `npm run check:directory-public-shell`
// executes. Importing it must not walk the 46k-artifact corpus; the guard's
// CLI half is behind an `invokedDirectly` check for exactly this reason.
import {
  scanText,
  phoneSemanticViolations,
  FORBIDDEN,
  PHONE_CLAIMS,
} from "../../../scripts/check-directory-public-shell.mjs";
import {
  LIVE_APRIL_ANALYTICS_ARTICLE,
  LIVE_CEO_SCALING_ARTICLE,
  CONTROL_EDITORIAL_ARTICLE,
} from "../__fixtures__/legacyPlatformArticles";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ROOT_SHELL = readFileSync(join(REPO_ROOT, "index.html"), "utf8");

/** The exact blurb that shipped to the READY Preview on every resource article. */
const RETIRED_MATCHING_CTA =
  "Free, confidential matching to verified treatment centers that fit your needs.";

/** The directory-safe shared default that replaced it. */
const DIRECTORY_CTA_BLURB =
  "Filter licensed treatment centers by location, level of care, and insurance accepted.";

const ARTICLES = [
  ["april analytics milestone (legacy)", LIVE_APRIL_ANALYTICS_ARTICLE],
  ["CEO scaling note (legacy)", LIVE_CEO_SCALING_ARTICLE],
  ["ordinary editorial article", CONTROL_EDITORIAL_ARTICLE],
] as const;

// ───────────────────────────────────────────────────────────────────────────
// A. Resource-article CTA
// ───────────────────────────────────────────────────────────────────────────

describe("resource article CTA — no RehabLookup matching service", () => {
  it.each(ARTICLES)("%s: does not offer matching to treatment centers", (_name, article) => {
    const html = renderArticleHtml(article);
    expect(html).not.toContain(RETIRED_MATCHING_CTA);
    expect(html).not.toMatch(/confidential matching/i);
    expect(html).not.toMatch(/matching to (?:verified )?treatment centers/i);
    expect(html).not.toMatch(/that fit your needs/i);
  });

  it.each(ARTICLES)("%s: emits the directory-safe CTA instead", (_name, article) => {
    const html = renderArticleHtml(article);
    expect(html).toContain(DIRECTORY_CTA_BLURB);
    expect(html).toContain("<h2>Search treatment centers</h2>");
    expect(html).toContain("Free to browse, no account required.");
  });

  it.each(ARTICLES)("%s: CTA button points at /search-results", (_name, article) => {
    const html = renderArticleHtml(article);
    expect(html).toContain(
      '<a href="/search-results" class="rl-cta-btn">Search Treatment Centers &rarr;</a>',
    );
  });

  it.each(ARTICLES)("%s: no retired-route CTA survives", (_name, article) => {
    const html = renderArticleHtml(article);
    expect(html).not.toMatch(/href="\/concierge/);
    expect(html).not.toContain("/concierge/intake");
  });

  it("uses the shared shell default verbatim — the generator passes no blurb", () => {
    // If someone reintroduces a caller-supplied blurb, the article CTA stops
    // matching the shared default and this fails, whatever the new wording is.
    expect(renderArticleHtml(CONTROL_EDITORIAL_ARTICLE)).toContain(seoCtaStrip());
  });

  it("the shared default itself describes directory activity, not matching", () => {
    const strip = seoCtaStrip();
    expect(strip).toContain(DIRECTORY_CTA_BLURB);
    expect(strip).not.toMatch(/matching|we'll find|we find|placement|advisor/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// B. RehabLookup support-number semantics
// ───────────────────────────────────────────────────────────────────────────

describe("RehabLookup support number — platform support, not a treatment line", () => {
  const publicShells: Array<[string, string]> = [
    ["root index.html", ROOT_SHELL],
    ["shared SEO header", seoHeader()],
    ["generated resource article", renderArticleHtml(CONTROL_EDITORIAL_ARTICLE)],
  ];

  it.each(publicShells)("%s: the number is still present and dialable", (_name, html) => {
    // The point is NOT to hide the support line. If it disappears, say so.
    expect(html).toContain("tel:+12146396420");
    expect(html).toMatch(/\(?214\)?[\s.-]?639-6420/);
  });

  it.each(publicShells)("%s: number is not coupled with a service claim", (_name, html) => {
    const hits = phoneSemanticViolations(html);
    expect(hits.map((h) => `${h.rule}: ${h.snippet}`)).toEqual([]);
  });

  it.each(publicShells)("%s: no 24/7 confidential-help promise anywhere", (_name, html) => {
    expect(html).not.toMatch(/24\/7 confidential help/i);
    expect(html).not.toMatch(/our 24\/7 helpline/i);
    expect(html).not.toMatch(/call our .{0,20}helpline/i);
  });

  it("the header labels the number as support", () => {
    const header = seoHeader();
    expect(header).toMatch(/Support · \(214\) 639-6420/);
    expect(header).toContain('aria-label="RehabLookup support — (214) 639-6420"');
    expect(header).not.toContain("Call 24/7");
  });

  it("root shell frames the number as help USING RehabLookup", () => {
    expect(ROOT_SHELL).toContain("Need help using RehabLookup?");
    expect(ROOT_SHELL).toContain("RehabLookup Support: 214-639-6420");
    expect(ROOT_SHELL).not.toContain("Confidential, 24/7");
  });

  it("makes no placement / matching / advisor promise on the number", () => {
    for (const shell of [ROOT_SHELL, seoHeader()]) {
      expect(shell).not.toMatch(/placement (?:help|assistance|guidance)/i);
      expect(shell).not.toMatch(/matching (?:help|assistance)/i);
      expect(shell).not.toMatch(/\b(?:speak|talk) (?:to|with) an? (?:advisor|counselor|advocate)/i);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// C. Root homepage metadata
// ───────────────────────────────────────────────────────────────────────────

describe("root meta copy", () => {
  it("no longer promises 24/7 confidential help or insurance verification", () => {
    expect(ROOT_SHELL).not.toMatch(/24\/7 confidential help/i);
    expect(ROOT_SHELL).not.toMatch(/free insurance verification/i);
  });

  it("keeps the description, og:description and twitter:description in sync", () => {
    const descriptions = [
      ...ROOT_SHELL.matchAll(
        /<meta (?:name|property)="(?:description|og:description|twitter:description)" content="([^"]+)"/g,
      ),
    ].map((m) => m[1]);
    expect(descriptions).toHaveLength(3);
    expect(new Set(descriptions).size).toBe(1);
  });

  it("preserves directory search intent and stays inside the SERP budget", () => {
    const desc = ROOT_SHELL.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? "";
    expect(desc.length).toBeGreaterThan(80);
    expect(desc.length).toBeLessThanOrEqual(160);
    for (const term of [
      "Search",
      "verified addiction treatment centers",
      "Compare",
      "drug rehab",
      "alcohol treatment",
      "detox",
      "level of care",
      "insurance",
    ]) {
      expect(desc).toContain(term);
    }
  });

  it("does not weaken canonical / OG / Twitter / indexing setup", () => {
    // The homepage canonical is the absolute og:url + the <SEO /> component on
    // hydration; index.html deliberately ships no <link rel="canonical"> (see
    // the comment above og:url in index.html).
    expect(ROOT_SHELL).toContain('<meta property="og:url" content="https://rehablookup.com/"');
    expect(ROOT_SHELL).toContain('<meta name="twitter:card" content="summary_large_image"');
    expect(ROOT_SHELL).toContain('<meta property="og:image"');
    expect(ROOT_SHELL).not.toMatch(/<meta name="robots" content="[^"]*noindex/i);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// D. The guard itself catches what shipped
// ───────────────────────────────────────────────────────────────────────────
//
// Without this block the guard rules could be silently gutted and every
// assertion above would still pass — the pages would simply be clean by
// accident until the next regeneration.

describe("check-directory-public-shell catches the shipped regressions", () => {
  const flagged = (html: string) => scanText(html).map((v) => v.rule);

  it("flags the exact resource-article CTA that reached the READY Preview", () => {
    const shipped = `<div class="rl-cta-strip">
    <div>
      <h2>Search treatment centers</h2>
      <p>Free to browse, no account required. ${RETIRED_MATCHING_CTA}</p>
    </div>
    <a href="/search-results" class="rl-cta-btn">Search Treatment Centers &rarr;</a>
  </div>`;
    expect(flagged(shipped).length).toBeGreaterThan(0);
  });

  it.each([
    "Free, confidential matching to verified treatment centers that fit your needs.",
    "Confidential matching to treatment centers, at no cost.",
    "Free matching to verified facilities near you.",
    "Personalized matching with licensed rehab programs.",
    "Tell us about your situation and we'll match you with a program.",
    "Answer a few questions to find your best match.",
    "We'll help you find verified treatment in Texas.",
  ])("flags close variant: %s", (copy) => {
    expect(flagged(copy).length).toBeGreaterThan(0);
  });

  it("flags the retired 24/7 helpline framing of the support number", () => {
    const shipped =
      '<a href="tel:+12146396420" class="rl-helpline" aria-label="Call our 24/7 helpline">Call 24/7 · (214) 639-6420</a>';
    expect(flagged(shipped).length).toBeGreaterThan(0);
  });

  it.each([
    '<a href="tel:+12146396420">Call Now: 214-639-6420</a> — Confidential, 24/7',
    "Call 214-639-6420 for 24/7 confidential help.",
    "Our confidential helpline: (214) 639-6420",
    "Placement help: 214-639-6420",
    "Speak to an advisor at 214-639-6420",
  ])("flags support-number variant: %s", (copy) => {
    expect(phoneSemanticViolations(copy).length).toBeGreaterThan(0);
  });

  // ── Narrowness: legitimate copy must survive ────────────────────────────

  it("does NOT flag the bare word 'matching' in editorial context", () => {
    expect(
      flagged(
        "Clinicians spend the first week matching patients to the appropriate level of care, " +
          "and insurers run their own network matching before authorizing benefits.",
      ),
    ).toEqual([]);
  });

  it("does NOT flag third-party crisis resources", () => {
    const footer =
      "If you are experiencing a medical emergency, call 911. If you are in crisis, call or " +
      "text 988 (Suicide &amp; Crisis Lifeline) or call SAMHSA's National Helpline at " +
      "1-800-662-4357 — free, confidential, 24/7, 365 days a year.";
    expect(flagged(footer)).toEqual([]);
    expect(phoneSemanticViolations(footer)).toEqual([]);
  });

  it("does NOT flag a SAMHSA helpline sitting beside RehabLookup support", () => {
    // Same document, different numbers. Only the 214 line is RehabLookup's.
    const mixed =
      '<p>Support · <a href="tel:+12146396420">(214) 639-6420</a></p>\n' +
      "<p>SAMHSA National Helpline: 1-800-662-4357 — free, confidential, 24/7.</p>";
    expect(phoneSemanticViolations(mixed)).toEqual([]);
  });

  it("does NOT flag a facility's own 24/7 concierge amenity", () => {
    expect(
      flagged("The resort offers 24/7 concierge services as part of the amenity package."),
    ).toEqual([]);
  });

  it("does NOT flag 'you'll find' editorial prose", () => {
    expect(
      flagged("In most states you'll find that Medicaid covers medically necessary detox."),
    ).toEqual([]);
  });

  // ── The rule tables must not be quietly emptied ─────────────────────────

  it("keeps the full rule inventory wired up", () => {
    expect(FORBIDDEN.length).toBeGreaterThanOrEqual(28);
    expect(PHONE_CLAIMS.length).toBeGreaterThanOrEqual(9);
    for (const rule of [...FORBIDDEN, ...PHONE_CLAIMS]) {
      expect(rule.re).toBeInstanceOf(RegExp);
      expect(typeof rule.name).toBe("string");
    }
  });
});
