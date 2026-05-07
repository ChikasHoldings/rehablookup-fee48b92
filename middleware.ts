// Vercel Edge Middleware (Vite / non-Next project)
//
// ROUTING FIX (May 2026):
// On the Lovable→Vercel cutover, ~28k SPA-only sitemap URLs returned 404 to
// Googlebot. Root cause: `cleanUrls: true` makes Vercel look up `<path>.html`
// for every clean URL. When middleware returned `next()` for crawlers and no
// prerender file existed, Vercel served a 404 instead of falling through to
// the SPA rewrite. This collapsed indexed traffic.
//
// SEO CANONICAL FIX (May 2026):
// The previous fallback rewrote all non-prerendered crawler requests to "/",
// which served the SPA shell with the homepage canonical hardcoded in
// index.html. This caused Google to classify every non-prerendered page as a
// duplicate of the homepage, leading to mass de-indexing.
//
// Fix: import `prerender-manifest.json` (built from /public on every deploy).
//   * Crawler + prerender exists → next()  → Vercel serves the .html file
//                                             with the correct page-specific
//                                             canonical URL.
//   * Crawler + no prerender    → next()  → Vercel serves the dist/index.html
//                                             SPA shell for this path. React +
//                                             react-helmet-async sets the
//                                             correct canonical on hydration.
//                                             DO NOT rewrite to "/" — that
//                                             serves the homepage canonical to
//                                             Googlebot, causing mass
//                                             de-indexing as duplicates.
//   * Real user                 → rewrite("/")  → SPA shell so GA/Pixel fire.
//
// Result: every public route returns 200 to Googlebot with crawlable HTML
// and the correct page-specific canonical URL.

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

// Social media crawlers that fetch OG/Twitter cards. Articles now have
// pre-rendered static HTML files at /resources/<slug>.html with correct
// article-specific OG images. Social crawlers are routed to the og-share
// edge function as a fallback for any articles not yet pre-rendered.
const SOCIAL_CRAWLER_UA =
  /(facebookexternalhit|facebot|twitterbot|linkedinbot|pinterest|slackbot|telegrambot|whatsapp|discordbot|embedly|quora link preview|redditbot|tumblr|vkshare|skypeuripreview|nuzzel|bitlybot|flipboard|outbrain|iframely)/i;

const OG_SHARE_URL =
  "https://plckxokpyiubuekvodtc.supabase.co/functions/v1/og-share";

function isArticleRoute(pathname: string): boolean {
  // /resources/{slug} (3 segments: "", "resources", "{slug}")
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

export default function middleware(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Apex always serves the SPA shell directly.
  if (pathname === "/") return next();

  const isCrawler = CRAWLER_UA.test(ua);
  const isSocialCrawler = SOCIAL_CRAWLER_UA.test(ua);

  // Article URLs: if a pre-rendered static HTML file exists (added May 2026),
  // serve it directly via next() — it has the correct canonical and OG image.
  // Only fall back to og-share for social crawlers on articles without a
  // pre-rendered file (e.g., newly published articles not yet in a deploy).
  if (isArticleRoute(pathname)) {
    if (PRERENDERED.has(pathname)) {
      // Pre-rendered file exists → serve it (has correct canonical + OG image).
      return next();
    }
    // No pre-rendered file yet. Social crawlers need article-specific OG image.
    if (isSocialCrawler || (!isCrawler && !isBrowserNavigation(request))) {
      const normalized = pathname.replace(/\/+$/, "") || "/";
      return rewrite(`${OG_SHARE_URL}?path=${encodeURIComponent(normalized)}`);
    }
  }

  if (isCrawler) {
    // Bot + prerendered file exists → let Vercel serve <path>.html with the
    // correct page-specific canonical URL.
    if (PRERENDERED.has(pathname)) return next();

    // Bot + no prerender → return next() so Vercel serves the SPA shell for
    // this specific path. React + react-helmet-async will set the correct
    // canonical on hydration.
    //
    // IMPORTANT: Do NOT rewrite to "/" here. That would serve the SPA shell
    // with the homepage canonical (hardcoded in index.html as
    // https://rehablookup.com/) to Googlebot, causing Google to classify
    // every non-prerendered page as a duplicate of the homepage — which is
    // exactly what caused the traffic collapse from 4k to 9 daily users.
    return next();
  }

  // Real users → rewrite to SPA shell so GA/Pixel always fire on every route.
  const target = new URL("/", url);
  target.search = url.search;
  return rewrite(target);
}
