// Shared bot / automated-traffic User-Agent detection.
// ─────────────────────────────────────────────────────
// Single source of truth for "is this request automated traffic?" used by the
// public, unauthenticated analytics-ingestion endpoints so that crawlers,
// prerender services, headless browsers, and monitoring probes do not inflate
// provider-facing metrics.
//
// Matching is case-insensitive substring; the list is intentionally
// conservative so we don't drop real users on minority browsers. This mirrors
// the list track-provider-event has used in production for provider_events, so
// the Featured analytics stream (featured_impressions / featured_phone_clicks)
// reconciles with the same definition of "bot" the rest of the analytics use.

export const BOT_UA_PATTERNS: readonly string[] = [
  "googlebot",
  "bingbot",
  "duckduckbot",
  "yandex",
  "baiduspider",
  "applebot",
  "semrushbot",
  "ahrefsbot",
  "mj12bot",
  "dotbot",
  "petalbot",
  "facebot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "discordbot",
  "telegrambot",
  "embedly",
  "pinterestbot",
  "redditbot",
  "whatsapp",
  "skypeuripreview",
  "vkshare",
  // Prerender services
  "prerender",
  "rendertron",
  // Headless / automation
  "headlesschrome",
  "phantomjs",
  "selenium",
  "puppeteer",
  "playwright",
  // Uptime / monitoring
  "uptimerobot",
  "pingdom",
  "statuscake",
  "site24x7",
  "datadog",
  "newrelic",
  "lighthouse",
  "pagespeed",
  "gtmetrix",
  // Generic crawlers
  "crawler",
  "spider",
  "bot/",
  // Curl + scripted clients (rare for real users)
  "curl/",
  "wget/",
  "python-requests",
  "python-urllib",
  "axios/",
  "node-fetch",
  "java/",
  "go-http-client",
];

/**
 * Returns true when the User-Agent looks like automated/non-human traffic.
 * A missing UA on a public browser request is itself treated as suspicious
 * (real browsers always send one), matching track-provider-event's behavior.
 */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true;
  const lower = ua.toLowerCase();
  return BOT_UA_PATTERNS.some((pat) => lower.includes(pat));
}
