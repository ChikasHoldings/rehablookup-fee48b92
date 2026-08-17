/**
 * Vercel Edge Middleware — RehabLookup
 *
 * CORE INVARIANT (May 2026 — Phase 5):
 *   A non-crawler request (every human browser, on first load OR refresh, in
 *   ANY circumstance) is ALWAYS rewritten to the SPA. Humans must NEVER be
 *   served a prerendered SEO .html shell — that shell is a stripped-down,
 *   design-divergent page meant only for crawlers, and serving it to humans
 *   caused the "the design switches on reload" bug. Only `isCrawler` branches
 *   may return prerenderRewrite()/og-share/notFound responses; every other
 *   path must fall through to the human SPA handler at the bottom.
 *
 * Seeker accounts were retired in August 2026. Legacy seeker/account routes
 * are redirected at the edge before crawler/prerender handling so they do not
 * remain indexable 200-OK application destinations.
 *
 * ROUTING FIX (May 2026 — Phase 4):
 *   Soft 404 fix for /center/* routes. Non-existent facility slugs now return
 *   HTTP 404 with a noindex HTML body to Googlebot, preventing crawl budget
 *   waste on dead facility pages.
 *
 * ROUTING FIX (May 2026 — Phase 1):
 *
 * ROOT CAUSE OF TRAFFIC COLLAPSE (4k → 9 daily users):
 *   `cleanUrls: true` in vercel.json forced Vercel to look up dist/<path>.html
 *   for every clean URL. When the middleware returned `next()` for Googlebot
 *   on a non-prerendered path, Vercel found no .html file and returned a hard
 *   404. The SPA fallback rewrite (/(.*) → /index.html) only applied to human
 *   requests that the middleware rewrote to "/". Result: 28,814 valid routes
 *   returned 404 to Googlebot — all near-me, rehab-marketing, treatment-types,
 *   search-results, etc.
 *
 * THE FIX:
 *   `cleanUrls` has been removed from vercel.json. Without it, Vercel's
 *   file-serving order is:
 *     1. Exact file match in dist/ (e.g., dist/about.html for /about)
 *     2. Middleware rewrites (this file)
 *     3. SPA fallback rewrite: /(.*) → /index.html
 *
 *   The middleware now EXPLICITLY rewrites crawlers to the .html file for
 *   prerendered paths (instead of relying on cleanUrls to auto-resolve them),
 *   and rewrites crawlers to /index.html for non-prerendered paths (so React
 *   can set the correct canonical on hydration).
 *
 * ROUTING TABLE:
 *   Request type                  Action                    Result
 *   ─────────────────────────────────────────────────────────────────────────
 *   Any → "/"                     next()                    dist/index.html
 *   Retired seeker/account       308 redirect              /search-results
 *   Crawler + prerendered path    rewrite(<path>.html)      Static HTML, correct canonical
 *   Crawler + not prerendered     rewrite(/index.html)      SPA shell, React sets canonical
 *   Social crawler + article      rewrite(og-share fn)      OG-tagged HTML for social cards
 *   Human visitor                 rewrite(/)                SPA shell, GA/Pixel fire
 *
 * CANONICAL STRATEGY:
 *   - Prerendered pages: canonical is baked into the static HTML at build time.
 *   - Non-prerendered pages: React's <SEO> component (react-helmet-async) sets
 *     the canonical from window.location.pathname on hydration.
 *   - NEVER rewrite non-prerendered crawlers to "/" — that serves the homepage
 *     canonical to Googlebot, causing mass de-indexing as duplicates.
 */

import { rewrite, next } from "@vercel/edge";
import { PRERENDERED_PATHS } from "./prerender-manifest.js";

export const config = {
  matcher: [
    "/",
    "/((?!_next/|_vercel/|api/|assets/|favicon|robots\\.txt|sitemap|.*\\.).*)",
  ],
};

const PRERENDERED = new Set(PRERENDERED_PATHS);

const CRAWLER_UA =
  /(googlebot|bingbot|yandex|duckduckbot|baiduspider|slurp|applebot|petalbot|sogou|exabot|facebot|facebookexternalhit|twitterbot|linkedinbot|pinterestbot|slackbot|telegrambot|whatsapp|discordbot|embedly|quora link preview|redditbot|tumblr|vkshare|w3c_validator|ahrefsbot|semrushbot|mj12bot|dotbot|rogerbot|screaming frog|gptbot|chatgpt-user|oai-searchbot|claudebot|perplexitybot|google-inspectiontool|adsbot-google|mediapartners-google|bytespider|googleother)/i;

const SOCIAL_CRAWLER_UA =
  /(facebookexternalhit|facebot|twitterbot|linkedinbot|pinterest|slackbot|telegrambot|whatsapp|discordbot|embedly|quora link preview|redditbot|tumblr|vkshare|skypeuripreview|nuzzel|bitlybot|flipboard|outbrain|iframely)/i;

const OG_SHARE_URL =
  "https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/og-share";

const RETIRED_SEEKER_EXACT = new Set([
  "/signup",
  "/signup/complete",
  "/reset-password",
  "/forgot-password",
]);
const RETIRED_SEEKER_PREFIXES = ["/account", "/seeker", "/my-account"];

function isRetiredSeekerPath(pathname: string): boolean {
  if (RETIRED_SEEKER_EXACT.has(pathname)) return true;
  return RETIRED_SEEKER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function retiredSeekerRedirect(url: URL): Response {
  const destination = new URL("/search-results", url.origin);
  destination.searchParams.set("from", "retired-account");
  return new Response(null, {
    status: 308,
    headers: {
      Location: destination.toString(),
      "X-Robots-Tag": "noindex, follow",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

function isCenterRoute(pathname: string): boolean {
  return /^\/center\/[a-z0-9-]+\/?$/.test(pathname);
}

function isDynamicSoftRoute(pathname: string): boolean {
  if (/^\/rehab-centers\/[a-z0-9-]+(\/[a-z0-9-]+)*\/?$/.test(pathname)) return true;
  if (/^\/insurance\/[a-z0-9-]+(\/[a-z0-9-]+)*\/?$/.test(pathname)) return true;
  if (/^\/rehab-marketing\/[a-z0-9-]+(\/[a-z0-9-]+)*\/?$/.test(pathname)) return true;
  if (/^\/treatment-types\/[a-z0-9-]+(\/[a-z0-9-]+)*\/?$/.test(pathname)) return true;
  if (/^\/detox-centers\/[a-z0-9-]+(\/[a-z0-9-]+)*\/?$/.test(pathname)) return true;
  return false;
}

function notFoundResponse(pathname: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Page Not Found | RehabLookup</title>
  <meta name="description" content="This page is no longer available." />
</head>
<body>
  <h1>Page Not Found</h1>
  <p>The page you requested (${pathname}) is no longer available.</p>
  <p><a href="/search-results">Search treatment facilities</a></p>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
  });
}

function centerNotFoundResponse(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Facility Not Found | RehabLookup</title>
  <meta name="description" content="This rehab facility page is no longer available." />
</head>
<body>
  <h1>Facility Not Found</h1>
  <p>This rehab center page is no longer available or has not been approved yet.</p>
  <p><a href="/search-results">Search treatment facilities</a></p>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
  });
}

function isArticleRoute(pathname: string): boolean {
  if (/^\/resources\/[a-z0-9-]+\/?$/.test(pathname)) return true;
  if (/^\/providers\/resources\/[a-z0-9-]+\/?$/.test(pathname)) return true;
  return false;
}

function prerenderRewrite(pathname: string, url: URL): Response {
  const htmlPath = pathname.replace(/\/$/, "") + ".html";
  return rewrite(new URL(htmlPath, url));
}

export default function middleware(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (isRetiredSeekerPath(pathname)) {
    return retiredSeekerRedirect(url);
  }

  if (pathname === "/") return next();

  const isCrawler = CRAWLER_UA.test(ua);
  const isSocialCrawler = SOCIAL_CRAWLER_UA.test(ua);

  if (isArticleRoute(pathname)) {
    if (isCrawler) {
      if (PRERENDERED.has(pathname)) {
        return prerenderRewrite(pathname, url);
      }
      if (isSocialCrawler) {
        const normalized = pathname.replace(/\/+$/, "") || "/";
        return rewrite(`${OG_SHARE_URL}?path=${encodeURIComponent(normalized)}`);
      }
      return rewrite(new URL("/index.html", url));
    }
  }

  if (isCenterRoute(pathname)) {
    if (isCrawler) {
      if (PRERENDERED.has(pathname)) {
        return prerenderRewrite(pathname, url);
      }
      return centerNotFoundResponse();
    }
    const target = new URL("/", url);
    target.search = url.search;
    return rewrite(target);
  }

  if (isCrawler) {
    if (PRERENDERED.has(pathname)) {
      return prerenderRewrite(pathname, url);
    }

    if (isDynamicSoftRoute(pathname)) {
      return notFoundResponse(pathname);
    }

    return rewrite(new URL("/index.html", url));
  }

  const target = new URL("/", url);
  target.search = url.search;
  const response = rewrite(target);

  if (!PRERENDERED.has(pathname)) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
  }
  return response;
}
