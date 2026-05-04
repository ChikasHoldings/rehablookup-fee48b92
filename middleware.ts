// Vercel Edge Middleware (Vite / non-Next project)
//
// MIGRATION ROUTING FIX (May 2026):
// On the Lovable→Vercel cutover, ~28k SPA-only sitemap URLs returned 404 to
// Googlebot. Root cause: `cleanUrls: true` makes Vercel look up `<path>.html`
// for every clean URL. When middleware returned `next()` for crawlers and no
// prerender file existed, Vercel served a 404 instead of falling through to
// the SPA rewrite. This collapsed indexed traffic.
//
// Fix: import `prerender-manifest.json` (built from /public on every deploy).
//   * Crawler + prerender exists → next()  → Vercel serves the .html file.
//   * Crawler + no prerender    → rewrite("/")  → SPA shell renders, React
//                                                + react-helmet-async emits
//                                                proper title/meta/canonical.
//   * Real user                 → rewrite("/")  → SPA shell so GA/Pixel fire.
//
// Result: every public route returns 200 to Googlebot with crawlable HTML.

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

// Social media crawlers that fetch OG/Twitter cards. Articles have unique
// per-post images (`blog_articles.image_url`), but the SPA shell + static
// /resources/index.html only carries the default og-image. We route these
// crawlers to the `og-share` edge function so they see the article's image.
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

  // Article URLs must expose article-specific OG/Twitter images before JS runs.
  // Known social crawlers are routed here explicitly, and generic unfurlers that
  // are neither search crawlers nor browser navigations are routed here too.
  // Real browser navigations still receive the SPA shell to avoid redirect loops.
  if ((isSocialCrawler || (!isCrawler && !isBrowserNavigation(request))) && isArticleRoute(pathname)) {
    const normalized = pathname.replace(/\/+$/, "") || "/";
    return rewrite(`${OG_SHARE_URL}?path=${encodeURIComponent(normalized)}`);
  }

  if (isCrawler) {
    // Bot + prerendered file exists → let Vercel serve <path>.html.
    if (PRERENDERED.has(pathname)) return next();
    // Bot + no prerender → rewrite to SPA shell so React renders correct
    // title/meta/canonical instead of returning 404.
    const target = new URL("/", url);
    target.search = url.search;
    return rewrite(target);
  }

  // Real users → SPA shell so GA/Pixel always fire on every route.
  const target = new URL("/", url);
  target.search = url.search;
  return rewrite(target);
}
