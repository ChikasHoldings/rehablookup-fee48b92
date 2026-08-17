/**
 * Pre-merge contract for the consumer-account retirement (directory cutover
 * stage 3).
 *
 * RehabLookup keeps its provider and admin accounts. What it no longer has is
 * a CONSUMER account: no seeker signup, no seeker sign-in destination, no
 * dashboard, no saved searches, no seeker notifications, settings, support or
 * password reset. A treatment seeker must be able to search → compare →
 * inspect → contact a facility without ever creating one.
 *
 * Retiring a product surface is easy to half-do, and the halves fail in ways a
 * crawl won't necessarily catch on the day of the merge:
 *
 *   1. the React route is removed but vercel.json still 301s into it (or vice
 *      versa), so one layer contradicts the other;
 *   2. a redirect points at another redirect, producing a chain;
 *   3. a page component survives and something re-links it later;
 *   4. robots.txt keeps blocking a URL that is now a 301, so Google never
 *      sees the redirect and the old URL sits in the index forever;
 *   5. the retired URLs leak back into the sitemap / SPA route inventory.
 *
 * Each numbered failure has a test below. Everything asserted here is a
 * source-level fact the build can check on every commit — the live behaviour
 * (actual HTTP 301s) is verified separately by the deployed-origin crawlers.
 *
 * Scope discipline: this file must never assert that the strings "seeker" or
 * "account" are absent from the repo. Admin still administers legacy seeker
 * records (/admin/seekers), the edge functions that wrote seeker rows are
 * deliberately untouched, and vercel.json plus the router MUST keep naming the
 * retired paths so old backlinks resolve. The assertions are about routes,
 * destinations, files and directives.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

const app = read("src/App.tsx");
const vercel = JSON.parse(read("vercel.json")) as {
  redirects: Array<{ source: string; destination: string; statusCode?: number }>;
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
};
const robots = read("public/robots.txt");
const middleware = read("middleware.ts");

/** The single destination every retired consumer-account URL collapses to. */
const DESTINATION = "/search-results";

/**
 * Every URL family that used to serve the consumer account product. `/signup`
 * and `/reset-password` are included because they were seeker-only entry
 * points; `/signup/complete` and `/signup/subscription` are NOT — those are
 * provider Stripe-checkout plumbing and are asserted to survive further down.
 */
const RETIRED_SOURCES = [
  "/account",
  "/my-account",
  "/seeker",
  "/signup",
  "/reset-password",
];

/** Wildcard namespaces that must be caught whole, not path by path. */
const RETIRED_NAMESPACES = ["/account", "/my-account", "/seeker"];

const redirectBySource = new Map(vercel.redirects.map((r) => [r.source, r]));

describe("seeker retirement — server-level redirects (vercel.json)", () => {
  it.each(RETIRED_SOURCES)("%s is a 301 to the directory", (source) => {
    const hit = redirectBySource.get(source);
    expect(hit, `${source} has no vercel.json redirect`).toBeTruthy();
    expect(hit!.destination).toBe(DESTINATION);
    expect(hit!.statusCode).toBe(301);
  });

  it.each(RETIRED_NAMESPACES)("%s/:path* is a 301 to the directory", (ns) => {
    const hit = redirectBySource.get(`${ns}/:path*`);
    expect(hit, `${ns}/:path* has no wildcard vercel.json redirect`).toBeTruthy();
    expect(hit!.destination).toBe(DESTINATION);
    expect(hit!.statusCode).toBe(301);
  });

  // Failure mode 2. A redirect whose destination is itself a redirect source
  // costs an extra round trip and dilutes the signal Google follows.
  it("no retired redirect lands on another redirect source", () => {
    const sources = new Set(vercel.redirects.map((r) => r.source));
    const chained = vercel.redirects
      .filter((r) => r.destination === DESTINATION)
      .filter(() => sources.has(DESTINATION));
    expect(chained, `${DESTINATION} is itself a redirect source`).toEqual([]);
  });

  it("no retired redirect points back into the retired namespaces (no loops)", () => {
    const offenders = vercel.redirects.filter((r) =>
      RETIRED_NAMESPACES.some(
        (ns) => r.destination === ns || r.destination.startsWith(`${ns}/`),
      ),
    );
    expect(offenders).toEqual([]);
  });
});

describe("seeker retirement — edge middleware", () => {
  // The platform's evaluation order between config redirects and middleware is
  // not something this repo should have to bet on, so the retirement is
  // asserted in BOTH layers with the same one-hop destination.
  it("middleware 301s the retired namespaces before any prerender/SPA handling", () => {
    expect(middleware).toMatch(/const RETIRED_ACCOUNT_PREFIXES = \[[^\]]*"\/account"[^\]]*\]/);
    expect(middleware).toMatch(/const RETIRED_ACCOUNT_PREFIXES = \[[^\]]*"\/my-account"[^\]]*\]/);
    expect(middleware).toMatch(/const RETIRED_ACCOUNT_PREFIXES = \[[^\]]*"\/seeker"[^\]]*\]/);
    expect(middleware).toMatch(
      new RegExp(`const RETIRED_ACCOUNT_DESTINATION = "${DESTINATION}"`),
    );
    expect(middleware).toMatch(/status: 301/);

    // Order matters: the redirect has to win before the crawler branch can
    // rewrite the path to a prerendered file or the SPA shell (a 200).
    const guardAt = middleware.indexOf("isRetiredAccountRoute(pathname)");
    const crawlerAt = middleware.indexOf("const isCrawler = CRAWLER_UA.test(ua)");
    expect(guardAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(crawlerAt);
  });

  it("matches on a segment boundary so lookalike public slugs are untouched", () => {
    // /accounting-for-rehab-costs must not be swallowed by the /account rule.
    expect(middleware).toMatch(/p === prefix \|\| p\.startsWith\(`\$\{prefix\}\/`\)/);
  });
});

describe("seeker retirement — React router", () => {
  it.each(RETIRED_SOURCES)("%s resolves to the directory in-app too", (source) => {
    const re = new RegExp(
      `<Route path="${source}" element=\\{<Navigate to="${DESTINATION}" replace />\\}`,
    );
    expect(app, `${source} has no in-app retirement route`).toMatch(re);
  });

  it.each(RETIRED_NAMESPACES)("%s/* is caught by RetiredSeekerRedirect", (ns) => {
    expect(app).toMatch(
      new RegExp(`<Route path="${ns}/\\*" element=\\{<RetiredSeekerRedirect />\\}`),
    );
  });

  it("RetiredSeekerRedirect carries the query string through in one hop", () => {
    expect(app).toMatch(/const RETIRED_SEEKER_DESTINATION = "\/search-results";/);
    expect(app).toMatch(
      /<Navigate to=\{`\$\{RETIRED_SEEKER_DESTINATION\}\$\{loc\.search\}`\} replace \/>/,
    );
  });

  it("no route renders a seeker panel page or shell any more", () => {
    expect(app).not.toMatch(/SeekerShell|SeekerHome|SeekerSaved|SeekerSavedSearches/);
    expect(app).not.toMatch(/SeekerSignup|SeekerNotification|SeekerSettings|SeekerSupport/);
    expect(app).not.toMatch(/pages\/seeker\//);
  });
});

describe("seeker retirement — provider and admin auth still work", () => {
  // Non-negotiable: retiring the consumer account must not touch the two
  // account products that remain.
  const MUST_SURVIVE: Array<[string, RegExp]> = [
    ["/login renders the provider sign-in page", /<Route path="\/login" element=\{<Login \/>\} \/>/],
    ["/forgot-password renders provider recovery", /<Route path="\/forgot-password" element=\{<ForgotPassword \/>\} \/>/],
    ["/provider/forgot-password survives", /<Route path="\/provider\/forgot-password" element=\{<ProviderForgotPassword \/>\}/],
    ["/provider/reset-password survives", /<Route path="\/provider\/reset-password" element=\{<ProviderResetPassword \/>\}/],
    ["/provider/onboarding survives", /<Route path="\/provider\/onboarding" element=\{<ProviderOnboarding \/>\}/],
    ["/provider/login still 301s to /login", /<Route path="\/provider\/login" element=\{<Navigate to="\/login" replace \/>\}/],
    ["/provider-login still 301s to /login", /<Route path="\/provider-login" element=\{<Navigate to="\/login" replace \/>\}/],
    ["/admin/login survives", /path="login" element=\{<AdminLogin \/>\}|<Route path="\/admin\/login"/],
    ["provider Stripe return page survives", /<Route path="\/signup\/complete" element=\{<SignupCompletePage \/>\}/],
    ["provider checkout retry survives", /<Route path="\/signup\/subscription" element=\{<Navigate to="\/provider\/billing\?signup=retry"/],
  ];

  it.each(MUST_SURVIVE)("%s", (_label, pattern) => {
    expect(app).toMatch(pattern);
  });

  it("the provider auth paths are NOT redirected away in vercel.json", () => {
    for (const kept of ["/login", "/forgot-password", "/provider/onboarding", "/signup/complete"]) {
      const hit = redirectBySource.get(kept);
      expect(hit, `${kept} must not be a redirect source`).toBeUndefined();
    }
  });

  it("/login is provider-only: no consumer signup or account destination", () => {
    const login = read("src/pages/Login.tsx");
    expect(login).not.toMatch(/to="\/signup"/);
    expect(login).not.toMatch(/to="\/seeker\/signup"/);
    expect(login).not.toMatch(/navigate\(\s*returnTo \|\| "\/account"/);
    expect(login).not.toMatch(/["'`]\/account["'`]/);
    // A legacy consumer email is told the product is gone rather than being
    // signed in and dropped on a dead route.
    expect(login).toMatch(/RETIRED_SEEKER_LOGIN_MESSAGE/);
    expect(login).toMatch(/type: 'seeker', blocked: true/);
    // Provider sign-in itself must still be wired to the provider landing
    // resolver.
    expect(login).toMatch(/resolveProviderPostLoginPath/);
  });

  it("/forgot-password is provider-only recovery", () => {
    const fp = read("src/pages/ForgotPassword.tsx");
    expect(fp).not.toMatch(/to="\/signup"/);
    expect(fp).not.toMatch(/["'`]\/account["'`]/);
    expect(fp).toMatch(/RETIRED_SEEKER_RESET_MESSAGE/);
    expect(fp).toMatch(/type: "seeker", blocked: true/);
    // The provider reset pipeline (code email → confirm) stays intact.
    expect(fp).toMatch(/send-password-reset/);
    expect(fp).toMatch(/confirm-password-reset/);
  });
});

describe("seeker retirement — removed source files", () => {
  // Failure mode 3: a surviving component is an invitation to re-link the
  // retired surface later.
  it.each([
    "src/pages/SeekerSignup.tsx",
    "src/pages/ResetPassword.tsx",
    "src/pages/seeker",
    "src/components/seeker",
    "src/components/seeker/SeekerShell.tsx",
    "src/components/seeker/AuthPrompt.tsx",
    "src/components/search/SaveSearchButton.tsx",
    "src/hooks/useSavedSearches.ts",
    "src/hooks/useSeekerNotifications.ts",
    "src/lib/seekerNotificationRouting.tsx",
  ])("%s is gone", (rel) => {
    expect(existsSync(resolve(root, rel))).toBe(false);
  });

  it("no frontend source imports a seeker page or component", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
      for (const entry of readdirSync(resolve(root, dir))) {
        const rel = `${dir}/${entry}`;
        if (statSync(resolve(root, rel)).isDirectory()) {
          walk(rel);
          continue;
        }
        if (!/\.tsx?$/.test(entry)) continue;
        const src = readFileSync(resolve(root, rel), "utf8");
        if (/from\s+["'][^"']*(pages\/seeker\/|components\/seeker\/)/.test(src)) {
          offenders.push(rel);
        }
        if (/import\(\s*["'][^"']*(pages\/seeker\/|components\/seeker\/)/.test(src)) {
          offenders.push(rel);
        }
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});

describe("seeker retirement — no account CTA left in the consumer flow", () => {
  // The mission is that search → compare → inspect → contact needs no
  // account. These are the surfaces that used to interrupt it.
  const CONSUMER_SURFACES = [
    "src/components/layout/Header.tsx",
    "src/components/layout/Footer.tsx",
    "src/pages/SearchResults.tsx",
    "src/pages/Comparison.tsx",
    "src/pages/CenterProfile.tsx",
    "src/pages/InsuranceVerification.tsx",
    "src/pages/PublicReviewSubmission.tsx",
    "src/pages/FAQ.tsx",
  ];

  it.each(CONSUMER_SURFACES)("%s links no retired account destination", (rel) => {
    const src = read(rel);
    const dests = [...src.matchAll(/(?:\bto=|\bhref=)["'`](\/[^"'`\s{}]*)["'`]/g)].map((m) => m[1]);
    const offenders = dests.filter((d) =>
      RETIRED_NAMESPACES.some((ns) => d === ns || d.startsWith(`${ns}/`)) ||
      d === "/signup" ||
      d.startsWith("/signup?") ||
      d === "/reset-password",
    );
    expect(offenders, `${rel} links retired account routes`).toEqual([]);
  });

  it("the header exposes no consumer account portal, signed in or not", () => {
    const header = read("src/components/layout/Header.tsx");
    expect(header).not.toMatch(/isSeekerLoggedIn/);
    expect(header).not.toMatch(/seeker_profiles/);
    expect(header).not.toMatch(/seekerDisplayName|seekerInitials/);
    expect(header).not.toMatch(/["'`]\/account["'`]/);
  });

  it("the search page has no account-gated save-search control", () => {
    const sr = read("src/pages/SearchResults.tsx");
    expect(sr).not.toMatch(/SaveSearchButton/);
    expect(sr).not.toMatch(/useSavedSearches/);
    // Share is the accountless replacement and must still be there.
    expect(sr).toMatch(/handleShare/);
  });
});

describe("seeker retirement — robots + indexability", () => {
  /** Directive lines only, comments stripped. */
  const disallows = robots
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("Disallow:"))
    .map((l) => l.slice("Disallow:".length).trim());

  // Failure mode 4. A 301 that is also robots-blocked never gets processed,
  // so the old URL stays in the index indefinitely.
  it.each(RETIRED_SOURCES)("%s is not blocked in robots.txt", (source) => {
    const blocking = disallows.filter((d) => d === source || d === `${source}/`);
    expect(blocking, `${source} is a 301 — blocking it hides the redirect`).toEqual([]);
  });

  it("the surviving private surfaces are still blocked", () => {
    for (const priv of ["/admin", "/provider/", "/login"]) {
      expect(disallows, `${priv} must stay Disallowed`).toContain(priv);
    }
  });

  it("robots does not block resources Google needs to render the page", () => {
    for (const d of disallows) {
      expect(d).not.toBe("/assets/");
      expect(d).not.toMatch(/\.(js|css)$/);
    }
  });

  it("the live private surfaces carry an HTTP noindex header", () => {
    const noindexed = new Map(
      vercel.headers
        .filter((h) => h.headers.some((x) => x.key === "X-Robots-Tag"))
        .map((h) => [
          h.source,
          h.headers.find((x) => x.key === "X-Robots-Tag")!.value,
        ]),
    );
    for (const src of ["/login", "/forgot-password", "/provider/(.*)", "/admin", "/admin/(.*)"]) {
      expect(noindexed.get(src), `${src} needs X-Robots-Tag`).toMatch(/noindex/);
    }
  });
});

describe("seeker retirement — sitemap and route inventory", () => {
  // Failure mode 5.
  const sitemaps = [
    "public/sitemap.xml",
    "public/sitemap-extras.xml",
    "public/sitemap-index.xml",
    "public/sitemap-facilities.xml",
  ];

  it.each(sitemaps)("%s emits no retired or auth URL", (rel) => {
    const xml = read(rel);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const offenders = locs.filter((loc) => {
      const path = loc.replace(/^https?:\/\/[^/]+/, "") || "/";
      return (
        RETIRED_NAMESPACES.some((ns) => path === ns || path.startsWith(`${ns}/`)) ||
        /^\/(signup|login|reset-password|forgot-password|admin|provider\/|auth)(\/|$|\?)/.test(path)
      );
    });
    expect(offenders).toEqual([]);
  });

  it("the SPA route extractor excludes every retired and auth namespace", () => {
    const extractor = read("scripts/lib/extract-spa-routes.mjs");
    for (const pattern of [
      "/^\\/account(\\/|$)/",
      "/^\\/my-account(\\/|$)/",
      "/^\\/seeker(\\/|$)/",
      "/^\\/signup(\\/|$)/",
      "/^\\/login(\\/|$)/",
      "/^\\/reset-password(\\/|$)/",
      "/^\\/forgot-password(\\/|$)/",
    ]) {
      expect(extractor, `${pattern} missing from EXCLUDE_PATTERNS`).toContain(pattern);
    }
  });

  it("no prerendered HTML shell exists for a retired or auth URL", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { existsSync: ex } = require("node:fs") as typeof import("node:fs");
    for (const rel of [
      "public/account.html",
      "public/account/index.html",
      "public/my-account.html",
      "public/seeker.html",
      "public/signup.html",
      "public/login.html",
      "public/reset-password.html",
      "public/forgot-password.html",
    ]) {
      expect(ex(resolve(root, rel)), `${rel} must not be prerendered`).toBe(false);
    }
  });
});

describe("seeker retirement — recurring consumer email", () => {
  /**
   * The retirement removed the only page a recipient could use to stop the
   * seeker weekly digest. `send-seeker-weekly-digest` linked
   * /account/notification-preferences?unsub=weekly, and the page it pointed
   * at (a) never handled ?unsub= and (b) no longer exists — so the link now
   * 301s to /search-results and the `email_weekly_digest` toggle behind it is
   * unreachable.
   *
   * A recurring email with no working opt-out is a CAN-SPAM problem, so the
   * cron schedule is removed rather than left firing. This guard fails if the
   * schedule is reinstated without also restoring a reachable opt-out.
   */
  const migrations = readdirSync(resolve(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  /** The last migration that mentions a job name wins — that is the live state. */
  const lastActionFor = (jobName: string): "scheduled" | "unscheduled" | "absent" => {
    let state: "scheduled" | "unscheduled" | "absent" = "absent";
    for (const file of migrations) {
      const sql = readFileSync(resolve(root, "supabase/migrations", file), "utf8");
      // A schedule migration always unschedules first (idempotency guard), so
      // check for the schedule call before the unschedule call.
      if (new RegExp(`cron\\.schedule\\(\\s*'${jobName}'`).test(sql)) state = "scheduled";
      else if (new RegExp(`cron\\.unschedule\\(\\s*'${jobName}'`).test(sql)) state = "unscheduled";
    }
    return state;
  };

  it("the seeker weekly digest cron is unscheduled", () => {
    expect(lastActionFor("send_seeker_weekly_digest")).toBe("unscheduled");
  });

  it("the provider digest cron is untouched — this retirement is consumer-only", () => {
    expect(lastActionFor("send_provider_weekly_digest")).toBe("scheduled");
  });

  it("the digest edge function itself is kept (schedule removed, code retained)", () => {
    // Historical seeker data and the functions that wrote it are deliberately
    // preserved; only the timer is removed.
    expect(existsSync(resolve(root, "supabase/functions/send-seeker-weekly-digest/index.ts"))).toBe(true);
  });

  it("no migration in this change drops seeker data", () => {
    const sql = readFileSync(
      resolve(root, "supabase/migrations/20260901000000_unschedule_seeker_weekly_digest_cron.sql"),
      "utf8",
    );
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|SCHEMA)\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
  });
});
