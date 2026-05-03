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

export default function middleware(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Apex always serves the SPA shell directly.
  if (pathname === "/") return next();

  const isCrawler = CRAWLER_UA.test(ua);

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
