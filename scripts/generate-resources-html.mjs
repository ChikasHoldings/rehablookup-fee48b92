#!/usr/bin/env node
/**
 * Build-time Static HTML Generator for Resource Articles (/resources/<slug>)
 *
 * Fetches all published articles from the Supabase blog_articles table and
 * writes a static SEO-friendly HTML file for each at:
 *
 *     public/resources/<slug>.html
 *
 * Vercel's filesystem handler (with cleanUrls = true) serves this file when
 * Googlebot or any crawler requests `/resources/<slug>`, so search engines see
 * unique title/meta/JSON-LD with the correct canonical URL — instead of being
 * rewritten to the SPA shell which carries the homepage canonical.
 *
 * This fixes the root cause of the "Duplicate — Google chose different canonical"
 * GSC error for all 198 resource articles: previously no static HTML existed,
 * so the middleware rewrote crawler traffic to `/` (homepage), which has
 * `<link rel="canonical" href="https://rehablookup.com/" />` hardcoded.
 *
 * JS-enabled users still hit React Router on the client and get the full
 * ArticleDetail page — these flat files are SEO-only mirrors.
 *
 * Idempotent: safe to re-run; overwrites existing files.
 */
import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gtagSnippet } from "./_ga.mjs";
// `seoCtaStrip()` is called with NO custom blurb on purpose. This generator
// used to pass a blurb offering a free and confidential matching service to
// verified facilities — i.e. it advertised a RehabLookup intermediary role the
// directory cutover retired, on every one of the ~200 generated resource
// articles. The shared default describes directory activity only ("Filter
// licensed treatment centers by location, level of care, and insurance
// accepted."), and nothing about a resource article warrants overriding it.
// This file is scanned by scripts/check-directory-public-shell.mjs, so a
// reintroduced blurb fails the build here rather than one regeneration later.
import { seoStyles, seoHeader, seoCtaStrip, seoFooter } from "./_seo-page-shell.mjs";
// Shared with src/pages/ArticleDetail.tsx so the static mirror and the
// hydrated React page cannot drift. Loaded via Node's TypeScript type
// stripping — the module is dependency-free and erasable-syntax only.
import { applyDirectoryArticleOverride } from "../src/lib/directoryArticleOverride.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const resourcesDir = path.join(publicDir, "resources");
const BASE_URL = "https://rehablookup.com";

const PROJECT_URL = (
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://mldbxpntzcjalgjmwnqa.supabase.co"
).replace(/\/$/, "");

const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  // Project anon key — safe to commit; matches src/integrations/supabase/client.ts
  "sb_publishable_tHLCRbeUrsu7EmMlCR0n6g_ygNXmMYP";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

function truncate(text, max) {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

// ---------------------------------------------------------------------------
// Data fetch — all published articles
// ---------------------------------------------------------------------------
async function fetchArticles() {
  const cols = [
    "id",
    "slug",
    "title",
    "excerpt",
    "meta_title",
    "meta_description",
    "category",
    "category_label",
    "author",
    "author_date",
    "published_at",
    "updated_at",
    "image_url",
    "read_time",
    "featured",
    "content",
  ].join(",");

  let all = [];
  let offset = 0;
  const pageSize = 200;

  while (true) {
    const url =
      `${PROJECT_URL}/rest/v1/blog_articles` +
      `?select=${encodeURIComponent(cols)}` +
      `&status=eq.published` +
      `&slug=not.is.null` +
      `&order=published_at.desc` +
      `&limit=${pageSize}` +
      `&offset=${offset}`;

    const res = await fetch(url, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `[resources-prerender] Failed to fetch articles (${res.status}): ${body.slice(0, 200)}`,
      );
    }

    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    all = all.concat(page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

// ---------------------------------------------------------------------------
// Inline Markdown parser — converts [text](url) and **bold** to HTML
// Processes text BEFORE escaping to preserve link structure
// ---------------------------------------------------------------------------
function parseInlineMarkdown(text) {
  if (!text) return "";
  // Process in a single pass: Markdown links | bold
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let result = "";
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    // Append escaped plain text before this match
    result += escapeHtml(text.substring(lastIndex, match.index));
    if (match[1] !== undefined) {
      // [link text](url)
      const linkText = escapeHtml(match[1]);
      const href = escapeHtml(match[2]);
      result += `<a href="${href}">${linkText}</a>`;
    } else if (match[3] !== undefined) {
      // **bold**
      result += `<strong>${escapeHtml(match[3])}</strong>`;
    }
    lastIndex = match.index + match[0].length;
  }
  result += escapeHtml(text.substring(lastIndex));
  return result;
}

// ---------------------------------------------------------------------------
// Content block renderer — converts JSONB content array to HTML
// ---------------------------------------------------------------------------
//
// Some CMS articles include a "Frequently Asked Questions" heading without
// any Q/A pairs after it. That emits an empty FAQ section to the static
// page and trips the check-faq-jsonld validator (it sees the FAQ heading
// but no FAQPage JSON-LD, fails the build). Filter those empty FAQ
// headings out at render time — if the article gains real FAQ content
// later, the CMS can add the heading back along with Q/A pairs and a
// FAQPage block.
function stripEmptyFaqHeadings(html) {
  // Remove any "Frequently Asked Questions" h2 (with optional surrounding
  // whitespace) that has no FAQ-Q content after it before the next h2 or
  // end of input. Empty-paragraph blocks (`<p></p>` or `<p>\s*</p>`)
  // following the heading are dropped along with it.
  return html.replace(
    /<h2>\s*Frequently Asked Questions\s*<\/h2>(?:\s*<p>\s*<\/p>)*(?=\s*<h2|\s*$)/gi,
    "",
  );
}

function renderContentBlocks(content) {
  if (!content || !Array.isArray(content)) return "";

  const rendered = content
    .map((block) => {
      // Legacy string-based content (Markdown-like strings)
      if (typeof block === "string") {
        const text = block.trim();
        if (!text) return "";
        if (text.startsWith("### "))
          return `<h3>${escapeHtml(text.slice(4))}</h3>`;
        if (text.startsWith("## "))
          return `<h2>${escapeHtml(text.slice(3))}</h2>`;
        if (text.startsWith("- ")) {
          // Multi-line bullet list stored as a single string with \n separators
          const lines = text.split("\n").filter((l) => l.trim().startsWith("- "));
          if (lines.length > 0) {
            const items = lines
              .map((l) => `<li>${parseInlineMarkdown(l.replace(/^-\s*/, ""))}</li>`)
              .join("");
            return `<ul>${items}</ul>`;
          }
          // Single bullet
          return `<ul><li>${parseInlineMarkdown(text.slice(2))}</li></ul>`;
        }
        if (text.startsWith("> "))
          return `<blockquote>${parseInlineMarkdown(text.slice(2))}</blockquote>`;
        // Regular paragraph — parse inline Markdown (links, bold)
        return `<p>${parseInlineMarkdown(text)}</p>`;
      }

      // Structured heading block
      if (block.type === "heading") {
        const tag = block.level === 3 ? "h3" : "h2";
        return `<${tag}>${parseInlineMarkdown(block.content || "")}</${tag}>`;
      }

      // Structured list block
      if (block.type === "list" && Array.isArray(block.items)) {
        const items = block.items
          .map((item) => `<li>${parseInlineMarkdown(item)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      // Quote / callout block
      if (block.type === "quote" || block.type === "callout") {
        return `<blockquote>${parseInlineMarkdown(block.content || block.text || "")}</blockquote>`;
      }

      // Default: paragraph
      return `<p>${parseInlineMarkdown(block.content || "")}</p>`;
    })
    .join("\n    ");

  return stripEmptyFaqHeadings(rendered);
}

// Extract FAQPage JSON-LD from a rendered article body. Looks for an h2
// "Frequently Asked Questions" followed by h3+p pairs, returns a
// schema.org FAQPage object or null when there's no FAQ content.
function buildFaqSchemaFromBody(html) {
  if (!html) return null;
  const sectionMatch = html.match(
    /<h2>\s*Frequently[\s\S]*?Questions?\s*<\/h2>([\s\S]*?)(?=<h2|$)/i,
  );
  if (!sectionMatch) return null;
  const section = sectionMatch[1];
  const pairs = [];
  const pairRe = /<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pairRe.exec(section)) !== null) {
    const q = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const a = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (q && a) pairs.push({ q, a });
  }
  if (pairs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

// ---------------------------------------------------------------------------
// HTML renderer
// ---------------------------------------------------------------------------
export function renderArticleHtml(rawArticle) {
  // Directory-cutover compatibility layer. Applied FIRST — before meta
  // title/description, JSON-LD, body rendering and Markdown link rendering —
  // so a legacy Platform News row that still advertises the retired
  // Concierge/placement product in live Supabase can never reach the
  // generated page. Every other slug is returned untouched.
  const article = applyDirectoryArticleOverride(rawArticle);

  const slug = article.slug;
  const canonicalUrl = `${BASE_URL}/resources/${slug}`;

  const metaTitle = escapeHtml(
    truncate(article.meta_title || article.title, 70)
  );
  const metaDesc = escapeHtml(
    truncate(
      article.meta_description || article.excerpt || article.title,
      160
    )
  );

  const displayTitle = escapeHtml(article.title || "");
  const displayExcerpt = escapeHtml(article.excerpt || "");
  const categoryLabel = escapeHtml(article.category_label || article.category || "Addiction Recovery");
  const author = escapeHtml(article.author || "RehabLookup Editorial Team");
  const readTime = article.read_time ? `${article.read_time} min read` : "";

  const publishedDate = article.published_at
    ? new Date(article.published_at).toISOString()
    : "";
  const modifiedDate = article.updated_at
    ? new Date(article.updated_at).toISOString()
    : publishedDate;
  const displayDate = article.author_date || (publishedDate ? publishedDate.split("T")[0] : "");

  const ogImage = article.image_url || `${BASE_URL}/og-image.jpg`;

  // Article JSON-LD schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt || article.meta_description || "",
    url: canonicalUrl,
    image: ogImage,
    author: {
      "@type": "Person",
      name: article.author || "RehabLookup Editorial Team",
    },
    publisher: {
      "@type": "Organization",
      name: "RehabLookup",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
    },
    datePublished: publishedDate,
    dateModified: modifiedDate,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };

  // FAQPage schema — emitted when the article body has h3+p Q/A pairs
  // under a "Frequently Asked Questions" heading. Pairs are extracted
  // from the rendered HTML so the JSON-LD always matches the rendered
  // text exactly. Empty FAQ sections were already stripped upstream by
  // stripEmptyFaqHeadings.
  const renderedBody = article.content ? renderContentBlocks(article.content) : "";
  const faqSchema = buildFaqSchemaFromBody(renderedBody);

  // BreadcrumbList schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Resources",
        item: `${BASE_URL}/resources`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: canonicalUrl,
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metaTitle}</title>
  <meta name="description" content="${metaDesc}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="RehabLookup">
  <meta property="og:title" content="${metaTitle}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${metaTitle}">
  <meta property="og:locale" content="en_US">
  ${publishedDate ? `<meta property="article:published_time" content="${publishedDate}">` : ""}
  ${modifiedDate ? `<meta property="article:modified_time" content="${modifiedDate}">` : ""}
  <meta property="article:author" content="${escapeHtml(article.author || "RehabLookup Editorial Team")}">
  <meta property="article:section" content="${escapeHtml(categoryLabel)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@rehablookup">
  <meta name="twitter:title" content="${metaTitle}">
  <meta name="twitter:description" content="${metaDesc}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <meta name="twitter:image:alt" content="${metaTitle}">
  <script type="application/ld+json">${jsonLd(articleSchema)}</script>
  <script type="application/ld+json">${jsonLd(breadcrumbSchema)}</script>${faqSchema ? `
  <script type="application/ld+json">${jsonLd(faqSchema)}</script>` : ""}
  ${seoStyles()}
  <style>
    /* Article-specific styling layered on top of the shared SEO shell.
       Keeps the article body legible (max width, comfortable line-height)
       while inheriting the branded header/footer/CTA chrome. */
    .article-shell { max-width: 800px; margin: 0 auto; }
    .article-shell .category { display:inline-block; background:#dbeafe; color:#1d4ed8; padding:0.2rem 0.7rem; border-radius:9999px; font-size:0.75rem; font-weight:600; letter-spacing:.02em; text-transform:uppercase; margin-bottom:0.75rem; }
    .article-shell .meta { font-size:0.875rem; color:var(--rl-muted); display:flex; gap:1rem; flex-wrap:wrap; margin-top:0.5rem; }
    .article-shell .excerpt { font-size:1.125rem; color:var(--rl-text); margin:1.5rem 0 2rem; padding:1rem 1.25rem; background:var(--rl-primary-soft); border-left:4px solid var(--rl-primary); border-radius:0 0.5rem 0.5rem 0; line-height:1.6; }
    .article-body { margin: 1.5rem 0; }
    .article-body h2 { font-size:1.5rem; font-weight:700; color:var(--rl-primary); margin:2.25rem 0 0.85rem; line-height:1.25; }
    .article-body h3 { font-size:1.15rem; font-weight:600; color:var(--rl-text); margin:1.5rem 0 0.5rem; }
    .article-body p { color:#333; margin:0 0 1rem; }
    .article-body ul { color:#333; margin:0.5rem 0 1.25rem; padding-left:1.5rem; }
    .article-body li { margin-bottom:0.4rem; }
    .article-body blockquote { border-left:4px solid var(--rl-primary); padding:0.85rem 1.25rem; background:var(--rl-primary-soft); margin:1.5rem 0; color:var(--rl-text); font-style:italic; border-radius:0 0.5rem 0.5rem 0; }
    .article-body a { color:#2563eb; }
    .article-shell .related { margin-top:2.5rem; padding-top:1.5rem; border-top:1px solid var(--rl-border); }
    .article-shell .related h2 { font-size:1.125rem; color:var(--rl-primary); margin:0 0 0.75rem; }
    .article-shell .related ul { list-style:none; padding:0; margin:0; display:flex; flex-wrap:wrap; gap:0.5rem; }
    .article-shell .related li a { display:inline-block; padding:0.45rem 0.95rem; background:#f3f4f6; border-radius:9999px; font-size:0.875rem; color:var(--rl-text); }
    .article-shell .related li a:hover { background:#dbeafe; color:var(--rl-primary); text-decoration:none; }
  </style>
${gtagSnippet()}
</head>
<body>
  ${seoHeader()}
  <main class="rl-main">
    <div class="rl-container">
      <article class="article-shell">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <ul>
            <li><a href="/">Home</a> &rsaquo;&nbsp;</li>
            <li><a href="/resources">Resources</a> &rsaquo;&nbsp;</li>
            <li>${displayTitle}</li>
          </ul>
        </nav>
        <span class="category">${categoryLabel}</span>
        <h1>${displayTitle}</h1>
        <div class="meta">
          <span>By ${author}</span>
          ${displayDate ? `<span>${displayDate}</span>` : ""}
          ${readTime ? `<span>${readTime}</span>` : ""}
        </div>
        ${displayExcerpt ? `<div class="excerpt">${displayExcerpt}</div>` : ""}
        ${article.content ? `<div class="article-body">
        ${renderContentBlocks(article.content)}
        </div>` : ""}
        ${seoCtaStrip()}
        <section class="related" aria-label="Related resources">
          <h2>Explore More Resources</h2>
          <ul>
            <li><a href="/resources">All Recovery Resources</a></li>
            <li><a href="/rehab-centers">Find Rehab Centers</a></li>
            <li><a href="/treatment-types">Treatment Types</a></li>
            <li><a href="/compare">Compare Facilities</a></li>
          </ul>
        </section>
      </article>
    </div>
  </main>
  ${seoFooter()}
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("[resources-prerender] Fetching published articles…");

  let articles;
  try {
    articles = await fetchArticles();
  } catch (err) {
    console.error(`[resources-prerender] ${err.message}`);
    // Don't fail the build for transient REST issues.
    if (process.env.STRICT_RESOURCES_PRERENDER === "1") process.exit(1);
    console.warn("[resources-prerender] Skipping resources prerender for this build.");
    return;
  }

  if (!Array.isArray(articles) || articles.length === 0) {
    console.log("[resources-prerender] No published articles returned — nothing to write.");
    return;
  }

  await mkdir(resourcesDir, { recursive: true });

  const liveSlugs = new Set();
  let written = 0;

  for (const article of articles) {
    if (!article.slug || !article.title) {
      console.warn(`[resources-prerender] Skipping incomplete row id=${article.id}`);
      continue;
    }

    const html = renderArticleHtml(article);
    const outFile = path.join(resourcesDir, `${article.slug}.html`);
    await writeFile(outFile, html, "utf8");
    liveSlugs.add(article.slug);
    written++;
  }

  // Prune stale mirrors (unpublished articles, slug changes, etc.)
  let pruned = 0;
  try {
    const existing = await readdir(resourcesDir);
    for (const file of existing) {
      if (!file.endsWith(".html")) continue;
      const slug = file.replace(/\.html$/, "");
      // Never prune the resources index page
      if (slug === "index") continue;
      if (!liveSlugs.has(slug)) {
        await unlink(path.join(resourcesDir, file));
        pruned++;
      }
    }
  } catch (err) {
    console.warn(`[resources-prerender] Stale-file pruning skipped: ${err.message}`);
  }

  console.log(
    `[resources-prerender] Wrote ${written} article page(s); pruned ${pruned} stale mirror(s).`,
  );
}

// Only run the network-dependent generator when invoked as a CLI. Tests import
// `renderArticleHtml` directly and drive it from committed fixtures, which is
// what makes the live-Supabase failure mode reproducible offline.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => {
    console.error("[resources-prerender] Fatal:", err);
    process.exit(1);
  });
}
