#!/usr/bin/env node
/**
 * Article OG/Twitter image checker
 *
 * For every article URL in public/sitemap.xml under /resources/, fetches the page
 * using each major social crawler User-Agent (Facebook, X/Twitter, LinkedIn,
 * WhatsApp) plus a generic unfurler, parses og:image / twitter:image, and reports
 * any URL that returns the platform's default share image instead of an
 * article-specific one.
 *
 * Also emits direct links to each platform's URL Inspection / Debugger tool so a
 * human can re-validate any mismatch in a browser.
 *
 * Usage:
 *   node scripts/check-article-og-images.mjs                 # all articles, prod host
 *   node scripts/check-article-og-images.mjs --limit 10      # first 10
 *   node scripts/check-article-og-images.mjs --slug foo,bar  # specific slugs
 *   node scripts/check-article-og-images.mjs --host https://rehablookup.com
 *   node scripts/check-article-og-images.mjs --json report.json
 *
 * Exit code is non-zero if any mismatch is found, so it can be used in CI.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const HOST = (getArg('host', 'https://rehablookup.com') || '').replace(/\/$/, '');
const LIMIT = parseInt(getArg('limit', '0'), 10) || 0;
const SLUG_FILTER = getArg('slug', '');
const JSON_OUT = getArg('json', '');
const TIMEOUT_MS = parseInt(getArg('timeout', '15000'), 10);
const CONCURRENCY = parseInt(getArg('concurrency', '4'), 10);

// Default platform OG image — if any article returns this, it's a mismatch.
const DEFAULT_OG_PATTERNS = [
  /\/og-image\.(jpg|jpeg|png|webp)(\?|$)/i,
  /\/default-og\.(jpg|jpeg|png|webp)(\?|$)/i,
];

// User-agents we test. The first 4 are the actual crawler UAs each platform's
// inspection tool uses; the 5th is a generic preview/unfurler bot.
const CRAWLERS = [
  { name: 'Facebook',  ua: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
  { name: 'X/Twitter', ua: 'Twitterbot/1.0' },
  { name: 'LinkedIn',  ua: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)' },
  { name: 'WhatsApp',  ua: 'WhatsApp/2.23.20.0 A' },
  { name: 'Slack',     ua: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)' },
];

// Public URL inspector / debugger tools — for human re-validation.
const INSPECTORS = {
  Facebook:  (u) => `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(u)}`,
  'X/Twitter': (u) => `https://cards-dev.twitter.com/validator?url=${encodeURIComponent(u)}`,
  LinkedIn:  (u) => `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(u)}`,
  WhatsApp:  (u) => `https://wa.me/?text=${encodeURIComponent(u)}`, // no API; share link
  Slack:     (u) => `https://api.slack.com/robots`, // no public debugger
};

// ---------- helpers ----------

const META_RE = /<meta\s+[^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*>/gi;
const META_RE_REV = /<meta\s+[^>]*?content\s*=\s*["']([^"']*)["'][^>]*?(?:property|name)\s*=\s*["']([^"']+)["'][^>]*>/gi;

function parseMeta(html) {
  const meta = {};
  let m;
  while ((m = META_RE.exec(html))) meta[m[1].toLowerCase()] = m[2];
  while ((m = META_RE_REV.exec(html))) meta[m[2].toLowerCase()] ||= m[1];
  return meta;
}

function isDefaultOg(url) {
  if (!url) return true;
  return DEFAULT_OG_PATTERNS.some((re) => re.test(url));
}

async function fetchWithUA(url, ua) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': ua, Accept: 'text/html,*/*' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    const html = await res.text();
    return { status: res.status, html };
  } catch (e) {
    return { status: 0, error: e.message, html: '' };
  } finally {
    clearTimeout(t);
  }
}

function getArticleUrls() {
  const sitemap = fs.readFileSync(path.join('public', 'sitemap.xml'), 'utf8');
  const urls = Array.from(sitemap.matchAll(/<loc>([^<]+\/resources\/[^<]+)<\/loc>/g)).map((m) => m[1]);
  // Map onto the requested host
  const mapped = urls.map((u) => u.replace(/^https?:\/\/[^/]+/, HOST));
  if (SLUG_FILTER) {
    const want = new Set(SLUG_FILTER.split(',').map((s) => s.trim()).filter(Boolean));
    return mapped.filter((u) => want.has(u.split('/').pop()));
  }
  return LIMIT ? mapped.slice(0, LIMIT) : mapped;
}

async function checkUrl(url) {
  const perCrawler = {};
  for (const c of CRAWLERS) {
    const { status, html, error } = await fetchWithUA(url, c.ua);
    const meta = html ? parseMeta(html) : {};
    const og = meta['og:image'] || meta['og:image:secure_url'] || '';
    const tw = meta['twitter:image'] || meta['twitter:image:src'] || '';
    perCrawler[c.name] = {
      status,
      error,
      ogImage: og,
      twitterImage: tw,
      ogIsDefault: isDefaultOg(og),
      twitterIsDefault: isDefaultOg(tw),
    };
  }
  const mismatches = [];
  for (const [name, r] of Object.entries(perCrawler)) {
    if (r.error || r.status >= 400) {
      mismatches.push(`${name}: HTTP ${r.status} ${r.error || ''}`.trim());
      continue;
    }
    if (!r.ogImage) mismatches.push(`${name}: missing og:image`);
    else if (r.ogIsDefault) mismatches.push(`${name}: og:image is platform default (${r.ogImage})`);
    if (!r.twitterImage) mismatches.push(`${name}: missing twitter:image`);
    else if (r.twitterIsDefault) mismatches.push(`${name}: twitter:image is platform default (${r.twitterImage})`);
  }
  return { url, perCrawler, mismatches, ok: mismatches.length === 0 };
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

// ---------- main ----------

(async () => {
  const urls = getArticleUrls();
  if (!urls.length) {
    console.error('No article URLs found.');
    process.exit(1);
  }
  console.log(`Checking ${urls.length} article URL(s) on ${HOST} with ${CRAWLERS.length} crawler UAs (concurrency=${CONCURRENCY})\n`);

  const results = await pool(urls, CONCURRENCY, async (u, idx) => {
    const r = await checkUrl(u);
    const tag = r.ok ? '✅' : '❌';
    console.log(`${tag} [${idx + 1}/${urls.length}] ${u}`);
    if (!r.ok) {
      for (const m of r.mismatches) console.log(`     • ${m}`);
    }
    return r;
  });

  const failed = results.filter((r) => !r.ok);

  // Summary
  console.log('\n' + '='.repeat(72));
  console.log(`Summary: ${results.length - failed.length}/${results.length} passed, ${failed.length} mismatched.`);
  if (failed.length) {
    console.log('\nMismatched URLs (open in each platform inspector to re-validate):\n');
    for (const r of failed) {
      console.log(`• ${r.url}`);
      for (const [name, fn] of Object.entries(INSPECTORS)) console.log(`    ${name}: ${fn(r.url)}`);
    }
  }

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify({ host: HOST, generatedAt: new Date().toISOString(), results }, null, 2));
    console.log(`\nReport written to ${JSON_OUT}`);
  }

  process.exit(failed.length ? 1 : 0);
})();
