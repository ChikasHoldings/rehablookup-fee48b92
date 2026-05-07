/**
 * Vercel Edge Middleware — RehabLookup
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
import { PRERENDERED_PATHS } from "./prerender-manifest";

export const config = {
  matcher: [
    "/",
    "/((?!_next/|_vercel/|api/|assets/|favicon|robots\\.txt|sitemap|.*\\.).*)",
  ],
};

const PRERENDERED = new Set(PRERENDERED_PATHS);

const CRAWLER_UA =
  /(googlebot|bingbot|yandex|duckduckbot|baiduspider|slurp|applebot|petalbot|sogou|exabot|facebot|facebookexternalhit|twitterbot|linkedinbot|pinterestbot|slackbot|telegrambot|whatsapp|discordbot|embedly|quora link preview|redditbot|tumblr|vkshare|w3c_validator|ahrefsbot|semrushbot|mj12bot|dotbot|rogerbot|screaming frog|gptbot|chatgpt-user|oai-searchbot|claudebot|perplexitybot|google-inspectiontool|adsbot-google|mediapartners-google|bytespider|googleother)/i;

// Social media crawlers that fetch OG/Twitter cards. Articles have
// pre-rendered static HTML files at dist/resources/<slug>.html with correct
// article-specific OG images. Social crawlers fall back to og-share for any
// articles not yet pre-rendered (e.g., newly published articles).
const SOCIAL_CRAWLER_UA =
  /(facebookexternalhit|facebot|twitterbot|linkedinbot|pinterest|slackbot|telegrambot|whatsapp|discordbot|embedly|quora link preview|redditbot|tumblr|vkshare|skypeuripreview|nuzzel|bitlybot|flipboard|outbrain|iframely)/i;

const OG_SHARE_URL =
  "https://plckxokpyiubuekvodtc.supabase.co/functions/v1/og-share";

/**
 * Returns true if the pathname is a /center/<slug> route.
 * These are facility profile pages — only approved facilities have
 * prerendered HTML files. All other /center/* slugs are soft 404s.
 */
function isCenterRoute(pathname: string): boolean {
  return /^\/center\/[a-z0-9-]+\/?$/.test(pathname);
}

/**
 * Minimal HTML 404 response for Googlebot on non-existent facility pages.
 * Returns a proper HTTP 404 status with noindex so Google stops crawling
 * dead facility slugs and doesn't waste crawl budget.
 */
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
  <p><a href="/rehab-centers">Browse all rehab centers</a></p>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" },
  });
}

function isArticleRoute(pathname: string): boolean {
  // /resources/{slug}
  if (/^\/resources\/[a-z0-9-]+\/?$/.test(pathname)) return true;
  // /providers/resources/{slug}
  if (/^\/providers\/resources\/[a-z0-9-]+\/?$/.test(pathname)) return true;
  return false;
}

function isBrowserNavigation(request: Request): boolean {
  const fetchDest = request.headers.get("sec-fetch-dest") || "";
  const fetchMode = request.headers.get("sec-fetch-mode") || "";
  const fetchUser = request.headers.get("sec-fetch-user") || "";
  return fetchDest === "document" || fetchMode === "navigate" || fetchUser === "?1";
}

/**
 * Build the explicit rewrite URL for a prerendered path.
 * Without cleanUrls, Vercel will NOT auto-resolve /foo to dist/foo.html.
 * We must rewrite explicitly to the .html file path.
 */
function prerenderRewrite(pathname: string, url: URL): Response {
  const htmlPath = pathname.replace(/\/$/, "") + ".html";
  return rewrite(new URL(htmlPath, url));
}

export default function middleware(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Apex always serves the SPA shell directly.
  if (pathname === "/") return next();

  const isCrawler = CRAWLER_UA.test(ua);
  const isSocialCrawler = SOCIAL_CRAWLER_UA.test(ua);

  // ── Article routes (/resources/<slug>, /providers/resources/<slug>) ────────
  if (isArticleRoute(pathname)) {
    if (PRERENDERED.has(pathname)) {
      // Pre-rendered .html file exists → rewrite explicitly to it.
      // It has the correct page-specific canonical and OG image baked in.
      return prerenderRewrite(pathname, url);
    }
    // No pre-rendered file yet (e.g., newly published article).
    // Social crawlers need article-specific OG image → og-share function.
    if (isSocialCrawler || (!isCrawler && !isBrowserNavigation(request))) {
      const normalized = pathname.replace(/\/+$/, "") || "/";
      return rewrite(`${OG_SHARE_URL}?path=${encodeURIComponent(normalized)}`);
    }
    // Googlebot on a new article without a pre-rendered file → SPA shell.
    // React sets the correct canonical on hydration.
    if (isCrawler) {
      return rewrite(new URL("/index.html", url));
    }
  }

  // ── Facility profile routes (/center/<slug>) ────────────────────────────
  // Only approved facilities have prerendered HTML files in the manifest.
  // Any /center/* URL not in the manifest is a non-existent or unapproved
  // facility — return HTTP 404 to Googlebot to prevent crawl budget waste.
  if (isCenterRoute(pathname)) {
    if (PRERENDERED.has(pathname)) {
      // Approved facility with prerendered HTML → serve it.
      return prerenderRewrite(pathname, url);
    }
    // Non-existent or unapproved facility.
    if (isCrawler) {
      // Return a real HTTP 404 with noindex to Googlebot.
      // This stops Google indexing dead facility slugs.
      return centerNotFoundResponse();
    }
    // Human visitors: let the SPA handle it — CenterProfile will render
    // CenterNotFound with noindex and helpful recovery links.
    const target = new URL("/", url);
    target.search = url.search;
    return rewrite(target);
  }

  // ── All other crawler requests ─────────────────────────────────────────────
  if (isCrawler) {
    if (PRERENDERED.has(pathname)) {
      // Pre-rendered .html file exists → rewrite explicitly to it.
      // Correct page-specific canonical is baked into the static HTML.
      return prerenderRewrite(pathname, url);
    }

    // Bot + no prerender → rewrite to /index.html (SPA shell).
    // React + react-helmet-async sets the correct page-specific canonical
    // on hydration. Google can render JavaScript.
    //
    // CRITICAL: Do NOT rewrite to "/" here. That serves the SPA shell with
    // the homepage canonical (https://rehablookup.com/) hardcoded in
    // index.html, causing Google to classify every non-prerendered page as
    // a duplicate of the homepage — the original cause of the traffic crash.
    return rewrite(new URL("/index.html", url));
  }

  // ── Human visitors ─────────────────────────────────────────────────────────
  // Rewrite to the SPA shell so GA/Pixel always fire on every route.
  const target = new URL("/", url);
  target.search = url.search;
  return rewrite(target);
}
