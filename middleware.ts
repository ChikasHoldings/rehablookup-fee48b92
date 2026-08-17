/**
 * Vercel Edge Middleware — RehabLookup
 *
 * Humans always receive the SPA shell. Crawlers receive page-specific
 * prerendered HTML when available so canonical/meta output stays deterministic.
 * Retired seeker routes redirect before rendering, and legacy international
 * subpages are temporarily noindexed until their placement-era copy is fully
 * rewritten. The /us-rehab hub itself remains indexable.
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

function isLegacyInternationalSubpage(pathname: string): boolean {
  return pathname.startsWith("/us-rehab/");
}

function noindexResponse(response: Response): Response {
  response.headers.set("X-Robots-Tag", "noindex, follow");
  return response;
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
  const legacyInternational = isLegacyInternationalSubpage(pathname);

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
      const response = prerenderRewrite(pathname, url);
      return legacyInternational ? noindexResponse(response) : response;
    }

    if (isDynamicSoftRoute(pathname)) {
      return notFoundResponse(pathname);
    }

    const response = rewrite(new URL("/index.html", url));
    return legacyInternational ? noindexResponse(response) : response;
  }

  const target = new URL("/", url);
  target.search = url.search;
  const response = rewrite(target);

  if (legacyInternational) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }

  if (!PRERENDERED.has(pathname)) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
  }
  return response;
}
