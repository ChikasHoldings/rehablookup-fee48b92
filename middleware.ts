// Vercel Edge Middleware (Vite / non-Next project)
//
// PURPOSE: With `cleanUrls: true`, Vercel maps every clean URL
// (e.g. `/rehab-centers/california`) to the prerendered
// `/rehab-centers/california.html`. Those prerendered files are crawler-only
// stubs — no Google Analytics, no Meta Pixel, no React app. After the DNS
// cutover real users started landing on those stubs, no `page_view` ever
// fired, and GA traffic appeared to crater.
//
// Fix: detect known SEO / social crawlers and let them keep the prerendered
// HTML (good for SEO). Rewrite every other request to `/index.html` so the
// real React SPA renders, GA `gtag()` / Meta Pixel `fbq()` fire on every
// page view, and analytics traffic returns to normal.
//
// Notes:
//   * Static assets, sitemap, robots, /api/*, /_vercel/* are excluded by the
//     matcher and never enter this function.
//   * `/` is left alone because Vercel already serves /index.html for the apex.
//   * Crawlers fall through unchanged → vercel.json `cleanUrls` continues to
//     deliver the prerendered `<path>.html` (or the SPA shell if the file
//     doesn't exist).

import { rewrite, next } from "@vercel/edge";

export const config = {
  matcher: [
    "/((?!_next/|_vercel/|api/|assets/|favicon|robots\\.txt|sitemap|.*\\.).*)",
  ],
};

const CRAWLER_UA =
  /(googlebot|bingbot|yandex|duckduckbot|baiduspider|slurp|applebot|petalbot|sogou|exabot|facebot|facebookexternalhit|twitterbot|linkedinbot|pinterestbot|slackbot|telegrambot|whatsapp|discordbot|embedly|quora link preview|redditbot|tumblr|vkshare|w3c_validator|ahrefsbot|semrushbot|mj12bot|dotbot|rogerbot|screaming frog|gptbot|chatgpt-user|oai-searchbot|claudebot|perplexitybot|google-inspectiontool|adsbot-google|mediapartners-google|bytespider|googleother)/i;

export default function middleware(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);

  // Crawlers → keep the prerendered HTML (SEO).
  if (CRAWLER_UA.test(ua)) {
    return next();
  }

  // Apex already serves the SPA shell.
  if (url.pathname === "/") {
    return next();
  }

  // Real users → rewrite to the SPA shell so React + GA/Pixel load.
  // We rewrite to "/" (NOT "/index.html") because `cleanUrls: true` in
  // vercel.json 308-redirects /index.html → /, which breaks an internal
  // rewrite and produces NOT_FOUND. Rewriting to "/" serves the SPA shell
  // while the browser URL stays on the original deep link, so React Router
  // can take over and render the correct page.
  const target = new URL("/", url);
  target.search = url.search;
  return rewrite(target);
}
