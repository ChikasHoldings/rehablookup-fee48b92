#!/usr/bin/env node
/**
 * Build-time audit: pages that render an FAQ section MUST emit a valid
 * FAQPage JSON-LD block with proper Question / acceptedAnswer pairs.
 *
 * Strategy:
 *  1. Scan every pre-rendered HTML file in /public.
 *  2. Detect "FAQ rendering" via two signals:
 *       a) Visible heading text matching "Frequently Asked Questions" /
 *          "Common Questions" / "FAQ" / "FAQs"
 *       b) Accordion markup with multiple question-style triggers
 *  3. For every page that renders an FAQ, require ≥1 JSON-LD block of
 *     @type "FAQPage" containing mainEntity[] with valid Question +
 *     acceptedAnswer.text pairs.
 *  4. Validate every FAQPage block we find (even on pages that don't
 *     visibly render an FAQ) for structural correctness.
 *
 * Hard-fails build on:
 *  - FAQ rendered, no FAQPage JSON-LD
 *  - FAQPage JSON-LD that is invalid JSON
 *  - FAQPage missing/empty mainEntity
 *  - Question entries missing `name` or `acceptedAnswer.text`
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const errors = [];
const warnings = [];

function listHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip asset folders that obviously don't contain rendered pages
      if (["assets", "images", "img", "fonts", "static"].includes(entry.name)) continue;
      out.push(...listHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

const FAQ_HEADING_REGEX =
  /<h[1-6][^>]*>\s*(?:[^<]*\b(?:frequently\s+asked\s+questions|common\s+questions|faqs?)\b[^<]*)<\/h[1-6]>/i;

function rendersFAQ(html) {
  if (FAQ_HEADING_REGEX.test(html)) return true;
  // Accordion-style fallback: ≥3 triggers that look like questions
  const triggerMatches = html.match(/data-state="(?:open|closed)"[^>]*>([^<]{8,200}\?)</gi);
  if (triggerMatches && triggerMatches.length >= 3) return true;
  return false;
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

function findFAQPageNodes(parsed) {
  // Returns every node whose @type is "FAQPage" (handles arrays + @graph)
  const out = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const t = node["@type"];
    const isFAQ = Array.isArray(t)
      ? t.includes("FAQPage")
      : t === "FAQPage";
    if (isFAQ) out.push(node);
    if (Array.isArray(node["@graph"])) node["@graph"].forEach(visit);
  };
  visit(parsed);
  return out;
}

function validateFAQNode(node, fileLabel) {
  const local = [];
  const main = node.mainEntity;
  if (!main || (Array.isArray(main) && main.length === 0)) {
    local.push(`FAQPage missing or empty mainEntity`);
    return local;
  }
  const entries = Array.isArray(main) ? main : [main];
  entries.forEach((q, i) => {
    const qType = q?.["@type"];
    const isQuestion = Array.isArray(qType)
      ? qType.includes("Question")
      : qType === "Question";
    if (!isQuestion) {
      local.push(`mainEntity[${i}] missing @type=Question`);
    }
    if (!q?.name || typeof q.name !== "string" || q.name.trim().length < 5) {
      local.push(`mainEntity[${i}] missing/short Question.name`);
    }
    const ans = q?.acceptedAnswer;
    if (!ans || typeof ans !== "object") {
      local.push(`mainEntity[${i}] missing acceptedAnswer`);
      return;
    }
    const aType = ans["@type"];
    const isAnswer = Array.isArray(aType)
      ? aType.includes("Answer")
      : aType === "Answer";
    if (!isAnswer) {
      local.push(`mainEntity[${i}].acceptedAnswer missing @type=Answer`);
    }
    if (
      !ans.text ||
      typeof ans.text !== "string" ||
      ans.text.trim().length < 10
    ) {
      local.push(
        `mainEntity[${i}].acceptedAnswer.text missing or too short`
      );
    }
  });
  return local;
}

console.log("🔎 FAQ JSON-LD audit");
console.log("─".repeat(60));

if (!fs.existsSync(PUBLIC_DIR)) {
  console.error(`❌ public/ directory not found at ${PUBLIC_DIR}`);
  process.exit(1);
}

const htmlFiles = listHtmlFiles(PUBLIC_DIR);
let pagesWithFAQ = 0;
let pagesWithFAQSchema = 0;
let totalFAQNodes = 0;
let totalQuestions = 0;

for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file);
  let html;
  try {
    html = fs.readFileSync(file, "utf8");
  } catch (e) {
    warnings.push(`${rel}: unreadable (${e.message})`);
    continue;
  }

  const hasFAQ = rendersFAQ(html);
  const blocks = extractJsonLdBlocks(html);

  // Collect all FAQPage nodes from any JSON-LD block in the page
  const faqNodes = [];
  for (let i = 0; i < blocks.length; i++) {
    const raw = blocks[i];
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // Only fail when this *might* be the FAQ block (avoid false-positives
      // on unrelated invalid blocks — those are caught by check-structured-data).
      if (/FAQPage/i.test(raw)) {
        errors.push(`${rel}: JSON-LD block #${i + 1} contains FAQPage but failed to parse (${e.message})`);
      }
      continue;
    }
    faqNodes.push(...findFAQPageNodes(parsed));
  }

  if (faqNodes.length > 0) {
    pagesWithFAQSchema += 1;
    totalFAQNodes += faqNodes.length;
    faqNodes.forEach((node) => {
      const issues = validateFAQNode(node, rel);
      if (issues.length > 0) {
        errors.push(`${rel}: ${issues.join("; ")}`);
      } else {
        const main = node.mainEntity;
        totalQuestions += Array.isArray(main) ? main.length : 1;
      }
    });
  }

  if (hasFAQ) {
    pagesWithFAQ += 1;
    if (faqNodes.length === 0) {
      errors.push(
        `${rel}: page renders an FAQ section but emits no FAQPage JSON-LD`
      );
    }
  }
}

console.log(`Scanned HTML files:        ${htmlFiles.length}`);
console.log(`Pages rendering an FAQ:    ${pagesWithFAQ}`);
console.log(`Pages with FAQPage schema: ${pagesWithFAQSchema}`);
console.log(`FAQPage nodes found:       ${totalFAQNodes}`);
console.log(`Valid Q/A pairs:           ${totalQuestions}`);

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} warning(s):`);
  warnings.slice(0, 20).forEach((w) => console.log(`  - ${w}`));
}

if (errors.length) {
  console.error(`\n❌ ${errors.length} FAQ JSON-LD error(s):`);
  errors.slice(0, 50).forEach((e) => console.error(`  - ${e}`));
  if (errors.length > 50) {
    console.error(`  …and ${errors.length - 50} more`);
  }
  process.exit(1);
}

console.log("\n✅ FAQ JSON-LD audit passed");
