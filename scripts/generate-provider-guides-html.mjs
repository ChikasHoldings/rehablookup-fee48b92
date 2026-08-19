#!/usr/bin/env node
/**
 * Prerender /provider-guides/* from the content those pages actually
 * carry.
 *
 * THE BUG THIS FIXES
 *
 * All 254 provider-guide pages shipped as stubs. Each one repeated its
 * own title three times and then emitted the seeker-facing directory
 * boilerplate — "Our directory lists treatment centers across all 50
 * states. Compare programs, verify insurance, and connect with treatment
 * that fits your situation" — on a page whose entire subject is how a
 * treatment centre acquires patients. Median body: 187 words, 100% of
 * them under the thin-content floor, 87.8% duplicates of each other,
 * with one cluster of 144 identical bodies.
 *
 * The content was never missing. Every one of these routes renders four
 * to six substantial sections in the SPA, from `provider*Configs.ts` or
 * from props written inline in the page component. The prerender simply
 * threw it away, so the crawler saw a stub and the user saw an article.
 * This generator closes that gap by rendering what the route renders.
 *
 * WHERE THE CONTENT COMES FROM
 *
 *   203 pages  a `provider*Configs.ts` entry keyed by slug
 *    14 pages  treatmentProviderConfigs / insuranceProviderConfigs,
 *              published under /provider-guides/get-more-<slug>-patients
 *    37 pages  props written inline in the page component
 *
 * The third group is read out of the TSX by brace-matching the prop
 * expressions and evaluating the literal ones. That is only safe because
 * these props ARE literals — no interpolation, no imports beyond the
 * hero images, which are skipped. Anything that does not evaluate to a
 * literal is dropped rather than guessed at, and a page that ends up
 * with no sections aborts the build instead of writing another stub.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GA_MEASUREMENT_ID } from "./_ga.mjs";
import {
  escHtml,
  SHARED_DIRECTORY_CSS,
  SHARED_HEADER_HTML,
  SHARED_FOOTER_HTML,
} from "./_unique-content.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "public/provider-guides");
const BASE_URL = "https://rehablookup.com";

// ─────────────────────────────────────────────────────────────────────
// Source A + B — the shipped config files
// ─────────────────────────────────────────────────────────────────────

/** Config shapes differ slightly between files; this normalises the two
 *  that exist into one content object. Returns null for anything that is
 *  neither, so an unrecognised shape is skipped loudly downstream rather
 *  than rendered half-empty. */
function normalizeConfig(c) {
  if (c.heroHeadline && c.problemPoints) {
    return {
      title: c.label,
      metaTitle: c.metaTitle,
      metaDescription: c.metaDescription,
      heroHeadline: c.heroHeadline,
      heroSubheadline: c.heroSubheadline,
      sections: [
        { heading: c.problemHeadline, bullets: c.problemPoints },
        { heading: c.insightHeadline, content: c.insightContent },
      ],
      stats: c.insightStats ?? [],
      keywords: c.keywords ?? [],
    };
  }
  if (c.headline && c.painPoints) {
    // treatmentProviderConfigs / insuranceProviderConfigs — published at
    // /provider-guides/get-more-<slug>-patients, matching the route.
    return {
      title: `${c.label} Marketing`,
      metaTitle: `Get More ${c.label} Patients for Your Rehab Center | RehabLookup`,
      metaDescription: `${c.subheadline} Learn how RehabLookup helps ${String(c.label).toLowerCase()} programs attract more qualified patients.`,
      heroHeadline: c.headline,
      heroSubheadline: c.subheadline,
      sections: [
        { heading: `Why ${c.label} Programs Struggle to Fill Capacity`, bullets: c.painPoints },
        { heading: `${c.label} Market Insights`, content: c.insightText },
      ],
      stats: [],
      keywords: c.keywords ?? [],
    };
  }
  return null;
}

async function loadConfigPages() {
  const out = new Map();
  const files = fs
    .readdirSync(path.join(repoRoot, "src/data"))
    .filter((f) => /^provider.*Configs\.ts$/.test(f));

  for (const file of files) {
    const mod = await import(path.join(repoRoot, "src/data", file));
    for (const [exportName, value] of Object.entries(mod)) {
      if (!Array.isArray(value)) continue;
      for (const entry of value) {
        if (!entry?.slug) continue;
        const content = normalizeConfig(entry);
        if (!content) continue;
        // The two legacy shapes publish under a different URL than their
        // slug — the route regex is the source of truth for which.
        const slug = entry.painPoints ? `get-more-${entry.slug}-patients` : entry.slug;
        if (!out.has(slug)) out.set(slug, { ...content, source: `${file}:${exportName}` });
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// Source C — props written inline in the page component
// ─────────────────────────────────────────────────────────────────────

/** Return the source text of a `name={...}` or `name="..."` JSX prop,
 *  brace-matched so nested objects and arrays survive intact. A regex
 *  cannot do this: the values contain braces, quotes and apostrophes. */
function propExpression(src, name) {
  const quoted = src.match(new RegExp(`\\b${name}=("(?:[^"\\\\]|\\\\.)*")`));
  if (quoted) return quoted[1];

  const start = src.search(new RegExp(`\\b${name}=\\{`));
  if (start === -1) return null;
  let i = src.indexOf("{", start);
  let depth = 0;
  let quote = null;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    const prev = src[j - 1];
    if (quote) {
      if (ch === quote && prev !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(i + 1, j);
    }
  }
  return null;
}

/** True only for an expression built entirely of string, number and
 *  boolean literals inside arrays and objects.
 *
 *  The check is structural rather than a denylist of dangerous words.
 *  An earlier denylist version rejected a third of these pages because
 *  their prose contains ordinary English — "a fast-track admission
 *  process for hospital referrals" tripped a `\bprocess\b` rule. Scanning
 *  for scary substrings inside prose was always going to do that; what
 *  actually matters is whether anything OUTSIDE the strings can execute.
 *  So: remove the string literals, then require that what remains is
 *  only structure. */
function isPlainLiteral(expr) {
  let rest = "";
  let quote = null;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (quote) {
      if (ch === "\\") { i++; continue; }
      if (ch === quote) quote = null;
      // A template literal with a substitution can execute; treat the
      // whole expression as non-literal rather than trying to be clever.
      else if (quote === "`" && ch === "$" && expr[i + 1] === "{") return false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    rest += ch;
  }
  if (quote) return false;
  // Structure, property names, numbers and the three literal keywords.
  return /^[\s[\]{},:.\-+\dA-Za-z_$]*$/.test(rest) && !/=>|\(/.test(rest);
}

/** Evaluate a prop expression, but ONLY if it is a plain literal. An
 *  identifier (an imported hero image) or anything that could execute
 *  comes back null and the caller omits that prop — a wrong value on a
 *  health-adjacent page is worse than a missing section. */
function evalLiteral(expr) {
  if (!expr) return null;
  const trimmed = expr.trim();
  if (!/^["'`[{]/.test(trimmed)) return null;
  if (!isPlainLiteral(trimmed)) return null;
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`"use strict"; return (${trimmed});`)();
  } catch {
    return null;
  }
}

function readInlinePages(slugToComponentFile) {
  const out = new Map();
  for (const [slug, file] of slugToComponentFile) {
    const full = path.join(repoRoot, "src/pages", file + ".tsx");
    if (!fs.existsSync(full)) continue;
    const src = fs.readFileSync(full, "utf8");
    if (!/ProviderSEOPageLayout|ProviderConversionPage/.test(src)) continue;

    const sections = evalLiteral(propExpression(src, "sections"));
    const problemPoints = evalLiteral(propExpression(src, "problemPoints"));
    if (!Array.isArray(sections) && !Array.isArray(problemPoints)) continue;

    out.set(slug, {
      title: evalLiteral(propExpression(src, "title")) ?? undefined,
      metaTitle: evalLiteral(propExpression(src, "metaTitle")) ?? undefined,
      metaDescription: evalLiteral(propExpression(src, "metaDescription")) ?? undefined,
      heroHeadline: evalLiteral(propExpression(src, "heroHeadline")) ?? undefined,
      heroSubheadline: evalLiteral(propExpression(src, "heroSubheadline")) ?? undefined,
      sections: Array.isArray(sections)
        ? sections
        : [
            { heading: evalLiteral(propExpression(src, "problemHeadline")) ?? "The problem", bullets: problemPoints },
            { heading: evalLiteral(propExpression(src, "insightHeadline")) ?? "What the data shows", content: evalLiteral(propExpression(src, "insightContent")) },
          ],
      stats: evalLiteral(propExpression(src, "insightStats")) ?? [],
      keywords: evalLiteral(propExpression(src, "keywords")) ?? [],
      source: file + ".tsx",
    });
  }
  return out;
}

/** slug → page component file, read from the router rather than guessed
 *  from the filename, so a renamed component cannot silently detach a
 *  page from its content. */
function routeMap() {
  const app = fs.readFileSync(path.join(repoRoot, "src/App.tsx"), "utf8");
  const imports = Object.fromEntries(
    [...app.matchAll(/const (\w+) = lazy\(\(\) => import\("\.\/pages\/([^"]+)"\)\)/g)].map((m) => [m[1], m[2]]),
  );
  const map = new Map();
  for (const m of app.matchAll(/path="\/provider-guides\/([^"]+)"[^>]*element=\{(?:<PublicRouteGuard>)?<(\w+)\s*\/?>/g)) {
    const file = imports[m[2]];
    if (file) map.set(m[1], file);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────

function renderSections(sections) {
  return sections
    .filter((s) => s && s.heading && (s.content || (s.bullets ?? []).length))
    .map((s) => {
      const parts = [`<h2>${escHtml(s.heading)}</h2>`];
      if (s.content) parts.push(`<p>${escHtml(s.content)}</p>`);
      if ((s.bullets ?? []).length) {
        parts.push(`<ul>${s.bullets.map((b) => `<li>${escHtml(b)}</li>`).join("")}</ul>`);
      }
      return parts.join("\n      ");
    })
    .join("\n\n      ");
}

function renderStats(stats) {
  if (!stats?.length) return "";
  const rows = stats
    .map((s) => `<tr><th scope="row">${escHtml(s.label)}</th><td>${escHtml(s.value)}</td></tr>`)
    .join("");
  return `<section aria-label="Key figures">
      <h2>Key figures</h2>
      <table class="fact-table"><tbody>${rows}</tbody></table>
    </section>`;
}

/** Provider-facing CTA. The stubs shipped the seeker CTA ("Free to
 *  browse, no account required") on pages about filling beds, which is
 *  the wrong audience as well as duplicate copy. */
const PROVIDER_CTA = `<section class="rl-cta-strip" aria-label="For treatment providers">
      <h2>List your facility on RehabLookup</h2>
      <p>RehabLookup is a treatment directory families search directly. Claim or add your listing to appear in the location, level-of-care and insurance filters people actually use.</p>
      <p><a href="/for-providers">List your facility</a> &middot; <a href="/rehab-marketing">Rehab marketing hub</a> &middot; <a href="/provider-roi-calculator">ROI calculator</a></p>
    </section>`;

function renderPage(slug, page) {
  const urlPath = `/provider-guides/${slug}`;
  const canonical = BASE_URL + urlPath;
  const title = page.title || page.heroHeadline || slug.replace(/-/g, " ");
  const metaTitle = page.metaTitle || `${title} | RehabLookup`;
  const metaDesc = page.metaDescription || page.heroSubheadline || "";
  const safeTitle = escHtml(metaTitle);
  const safeDesc = escHtml(metaDesc);

  const breadcrumb = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "For Providers", item: BASE_URL + "/for-providers" },
      { "@type": "ListItem", position: 3, name: title, item: canonical },
    ],
  });
  const article = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.heroHeadline || title,
    description: metaDesc,
    url: canonical,
    publisher: { "@type": "Organization", name: "RehabLookup", url: BASE_URL },
    audience: { "@type": "BusinessAudience", name: "Addiction treatment providers" },
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${canonical}">
  ${page.keywords?.length ? `<meta name="keywords" content="${escHtml(page.keywords.join(", "))}">` : ""}
  <meta property="og:type" content="article">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RehabLookup">
  <meta property="og:image" content="${BASE_URL}/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${BASE_URL}/og-image.jpg">
  <link rel="icon" type="image/png" href="/favicon.png">
  <script type="application/ld+json">${breadcrumb}</script>
  <script type="application/ld+json">${article}</script>
  <style>${SHARED_DIRECTORY_CSS}</style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>
</head>
<body>
  ${SHARED_HEADER_HTML}
  <main class="rl-main">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><ul><li><a href="/">Home</a> &rsaquo; </li><li><a href="/for-providers">For Providers</a> &rsaquo; </li><li>${escHtml(title)}</li></ul></nav>
    <h1>${escHtml(page.heroHeadline || title)}</h1>
    ${page.heroSubheadline ? `<p>${escHtml(page.heroSubheadline)}</p>` : ""}

      ${renderSections(page.sections ?? [])}

    ${renderStats(page.stats)}

    ${PROVIDER_CTA}

    <p class="small">This guide is written for treatment providers. If you are looking for treatment for yourself or someone else, start at <a href="/rehab-centers">the treatment directory</a> or call SAMHSA's National Helpline at 1-800-662-4357.</p>
  </main>
  ${SHARED_FOOTER_HTML}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────

async function main() {
  const routes = routeMap();
  const configPages = await loadConfigPages();
  const inlinePages = readInlinePages(
    [...routes].filter(([slug]) => !configPages.has(slug)),
  );

  // Drive from the ROUTER plus whatever is already on disk, not from
  // disk alone: a guide added to App.tsx but never prerendered would
  // otherwise stay invisible to crawlers forever. Parameterised paths
  // are skipped — they are not single pages.
  const published = [
    ...new Set([
      ...[...routes.keys()].filter((slug) => !slug.includes(":") && !slug.includes("*")),
      ...fs.readdirSync(outDir).filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, "")),
    ]),
  ].sort();

  const missing = [];
  let written = 0;
  let fromConfig = 0;
  let fromInline = 0;

  for (const slug of published) {
    const page = configPages.get(slug) ?? inlinePages.get(slug);
    if (!page || !(page.sections ?? []).some((s) => s?.content || (s?.bullets ?? []).length)) {
      missing.push(slug);
      continue;
    }
    fs.writeFileSync(path.join(outDir, `${slug}.html`), renderPage(slug, page));
    written++;
    if (configPages.has(slug)) fromConfig++;
    else fromInline++;
  }

  console.log(
    `provider-guides generator: wrote ${written} of ${published.length} pages ` +
      `(${fromConfig} from config, ${fromInline} from inline props).`,
  );

  if (missing.length) {
    // A stub is what this generator exists to eliminate, so leaving one
    // in place is a build failure, not a warning.
    console.error(
      `✗ ${missing.length} published provider-guide URLs have no renderable content ` +
        `and would keep their stub: ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? ", …" : ""}`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("provider-guides generator failed:", err);
  process.exit(1);
});
