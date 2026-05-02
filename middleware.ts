// Vercel Edge Middleware
// PURPOSE: With `cleanUrls: true`, Vercel rewrites e.g. `/rehab-centers/california`
// to the prerendered `/rehab-centers/california.html` for everyone — but those
// prerendered files are crawler-only stubs (no GA, no Meta Pixel, no React app).
// That caused real users to land on a dead static page after the DNS cutover and
// killed Google Analytics traffic (no page_view ever fires).
//
// Fix: serve the prerendered HTML ONLY to known SEO/social crawlers; rewrite
// every real browser to the SPA shell (`/index.html`) so the React app + GA/Pixel
// load normally. Static assets, sitemaps, robots, API and Next-internal paths
// are left untouched.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  // Match everything except static assets & files with an extension.
  matcher: [
    "/((?!_next/|_vercel/|api/|assets/|favicon|robots\\.txt|sitemap|.*\\.).*)",
  ],
};

const CRAWLER_UA =
  /(googlebot|bingbot|yandex|duckduckbot|baiduspider|slurp|applebot|petalbot|sogou|exabot|facebot|facebookexternalhit|twitterbot|linkedinbot|pinterestbot|slackbot|telegrambot|whatsapp|discordbot|embedly|quora link preview|redditbot|tumblr|vkshare|w3c_validator|ahrefsbot|semrushbot|mj12bot|dotbot|rogerbot|screaming frog|gptbot|chatgpt-user|oai-searchbot|claudebot|perplexitybot|google-inspectiontool|adsbot-google|mediapartners-google|bytespider|googleother)/i;

export default function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const { pathname, search } = req.nextUrl;

  // Real browsers → always serve the SPA so React + GA/Pixel run.
  if (!CRAWLER_UA.test(ua)) {
    // Skip the homepage rewrite (index.html is already the default).
    if (pathname === "/" || pathname === "/index.html") {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/index.html";
    url.search = search;
    return NextResponse.rewrite(url);
  }

  // Crawlers → fall through to Vercel's cleanUrls behavior, which serves the
  // prerendered `<path>.html` if it exists, else the SPA shell.
  return NextResponse.next();
}
