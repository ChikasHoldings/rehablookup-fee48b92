#!/usr/bin/env node
/**
 * fix-rehab-marketing-titles.mjs
 * 
 * Updates all /rehab-marketing/* pre-rendered HTML files to have provider-specific
 * titles that are distinct from the consumer-facing /rehab-centers/* pages.
 * 
 * Pattern: "Rehab Centers in X County, Y — Find Treatment | RehabLookup"
 * → "List Your Rehab in X County, Y — Provider Hub | RehabLookup"
 * 
 * Run: node scripts/fix-rehab-marketing-titles.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rehabMarketingDir = path.join(__dirname, "..", "public", "rehab-marketing");

function slugToName(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build new title/description based on URL path
function buildProviderMeta(urlPath) {
  const parts = urlPath.replace(/^\/rehab-marketing\//, "").split("/");
  // parts: [stateSlug] or [stateSlug, "county", countySlug] or [stateSlug, treatmentSlug] etc.
  
  const stateSlug = parts[0] || "";
  const stateName = slugToName(stateSlug);

  if (parts.length === 1) {
    // /rehab-marketing/{state}
    return {
      title: `List Your Rehab in ${stateName} — Provider Hub | RehabLookup`,
      description: `Grow your rehab center's visibility in ${stateName}. List your facility on RehabLookup to reach patients searching for addiction treatment. Free and premium plans available.`,
    };
  }

  if (parts[1] === "county" && parts[2]) {
    const countySlug = parts[2];
    const countyName = slugToName(countySlug);

    if (parts[3] === "insurance" && parts[4]) {
      // /rehab-marketing/{state}/county/{county}/insurance/{insurer}
      const insurerName = slugToName(parts[4]);
      return {
        title: `List Your ${insurerName}-Accepting Rehab in ${countyName} County, ${stateName} | RehabLookup`,
        description: `Reach ${insurerName} patients in ${countyName} County, ${stateName}. List your rehab center on RehabLookup to connect with patients verifying insurance coverage.`,
      };
    }

    if (parts[3]) {
      // /rehab-marketing/{state}/county/{county}/{treatment}
      const treatmentName = slugToName(parts[3]);
      return {
        title: `List Your ${treatmentName} Center in ${countyName} County, ${stateName} | RehabLookup`,
        description: `Grow your ${treatmentName.toLowerCase()} program's visibility in ${countyName} County, ${stateName}. List on RehabLookup to reach patients actively searching for treatment.`,
      };
    }

    // /rehab-marketing/{state}/county/{county}
    return {
      title: `List Your Rehab in ${countyName} County, ${stateName} — Provider Hub | RehabLookup`,
      description: `Grow your rehab center's visibility in ${countyName} County, ${stateName}. List your facility on RehabLookup to reach patients searching for addiction treatment.`,
    };
  }

  if (parts[1] === "insurance" && parts[2]) {
    // /rehab-marketing/{state}/insurance/{insurer}
    const insurerName = slugToName(parts[2]);
    return {
      title: `List Your ${insurerName}-Accepting Rehab in ${stateName} | RehabLookup`,
      description: `Reach ${insurerName} patients in ${stateName}. List your rehab center on RehabLookup to connect with patients verifying insurance coverage.`,
    };
  }

  if (parts[1]) {
    // /rehab-marketing/{state}/{treatment}
    const treatmentName = slugToName(parts[1]);
    return {
      title: `List Your ${treatmentName} Center in ${stateName} — Provider Hub | RehabLookup`,
      description: `Grow your ${treatmentName.toLowerCase()} program's visibility in ${stateName}. List on RehabLookup to reach patients actively searching for treatment.`,
    };
  }

  // Fallback
  return {
    title: `Provider Hub — ${stateName} | RehabLookup`,
    description: `List your rehab center in ${stateName} on RehabLookup. Reach patients searching for addiction treatment and grow your facility's online visibility.`,
  };
}

function updateHtmlMeta(content, newTitle, newDescription) {
  const safeTitle = escHtml(newTitle);
  const safeDesc = escHtml(newDescription);

  // Replace <title>...</title>
  content = content.replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);

  // Replace meta name="description"
  content = content.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${safeDesc}" />`
  );

  // Replace og:title
  content = content.replace(
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${safeTitle}" />`
  );

  // Replace og:description
  content = content.replace(
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${safeDesc}" />`
  );

  // Replace twitter:title
  content = content.replace(
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );

  // Replace twitter:description
  content = content.replace(
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${safeDesc}" />`
  );

  // Replace <h1>...</h1>
  content = content.replace(/<h1>[^<]*<\/h1>/, `<h1>${escHtml(newTitle.replace(/ — .*$/, "").replace(/ \| .*$/, ""))}</h1>`);

  return content;
}

async function main() {
  console.log("=".repeat(70));
  console.log("fix-rehab-marketing-titles.mjs — Updating provider page titles");
  console.log("=".repeat(70));

  if (!fs.existsSync(rehabMarketingDir)) {
    console.log("No rehab-marketing directory found. Exiting.");
    return;
  }

  let fixed = 0;
  let errors = 0;

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith(".html")) {
        processFile(fullPath);
      }
    }
  }

  function processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      // Convert file path to URL path
      const relPath = path.relative(path.join(__dirname, "..", "public"), filePath);
      const urlPath = "/" + relPath.replace(/\\/g, "/").replace(/\/index\.html$/, "").replace(/\.html$/, "");

      const { title, description } = buildProviderMeta(urlPath);
      const updated = updateHtmlMeta(content, title, description);
      fs.writeFileSync(filePath, updated, "utf-8");
      fixed++;

      if (fixed % 1000 === 0) {
        console.log(`  Updated ${fixed} files...`);
      }
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.error(`  Error processing ${filePath}: ${err.message}`);
      }
    }
  }

  console.log("\nProcessing rehab-marketing pages...");
  walkDir(rehabMarketingDir);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Updated: ${fixed} files`);
  console.log(`Errors:  ${errors} files`);
  console.log("=".repeat(70));
}

main().catch(console.error);
