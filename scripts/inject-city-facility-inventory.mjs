#!/usr/bin/env node
/**
 * Inject real facility inventory into the prerendered city directory pages.
 *
 * WHY THIS EXISTS (SEO Phase 1)
 * ─────────────────────────────
 * State pages (`generate-seo-html.mjs`) and county pages
 * (`generate-county-pages.mjs`) both call `renderFacilityList()` and both run
 * in `build:vercel`, so those two families carry inventory. City pages did
 * not: the only generators that render city-level inventory —
 * `generate-all-city-pages.mjs` and `generate-missing-city-treatment-pages.mjs`
 * — have no npm script entry and are never invoked by any build. The feature
 * was written and then left unwired, so ~4,381 city pages shipped as
 * templated copy with zero links into the 3,794-facility catalogue.
 *
 * WHY INJECTION RATHER THAN RUNNING THOSE GENERATORS
 * `generate-all-city-pages.mjs` writes a DIFFERENT page template (the
 * `_unique-content.mjs` shell). Wiring it into the build would silently
 * redesign every city page it covers and leave the rest on the old template —
 * a redesign this phase explicitly excludes. This script instead adds the
 * inventory block to the page that is already there and changes nothing else:
 * same layout, same copy, same shell, one new section.
 *
 * MATCHING SEMANTICS ARE DELIBERATELY UNCHANGED
 * Facilities are matched to a page by exact `state/city` slug equality, the
 * same key `groupByStateCity()` already uses. No proximity expansion, no
 * county fallback, no normalization beyond the existing helpers. The known
 * defects in city-proximity semantics are Phase 2/3 work and are NOT
 * addressed here — a city whose facilities are recorded under a neighbouring
 * municipality still shows nothing, exactly as before.
 *
 * IDEMPOTENT: the block is delimited by HTML markers, so re-running replaces
 * it rather than stacking copies.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  fetchAllFacilities,
  groupByStateCity,
  stateCityKeyFromSlugs,
  renderFacilityList,
  ALLOW_EMPTY_FACILITY_DATA,
} from "./_facility-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CITY_ROOT = path.join(ROOT, "public", "rehab-centers");

const START = "<!-- rl:city-facility-inventory:start -->";
const END = "<!-- rl:city-facility-inventory:end -->";

/** US state slug → postal abbreviation, for the "City, ST" label. */
const STATE_ABBR = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new-hampshire": "NH", "new-jersey": "NJ", "new-mexico": "NM", "new-york": "NY",
  "north-carolina": "NC", "north-dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode-island": "RI", "south-carolina": "SC",
  "south-dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west-virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district-of-columbia": "DC",
};

/**
 * Place the block immediately before the page's first <h2> inside <main>,
 * so inventory sits above the generic "Treatment Programs" copy rather than
 * below the fold. Falls back to just inside </main>, then to before </body>.
 */
function injectBlock(html, block) {
  const wrapped = `${START}\n${block}\n${END}\n`;

  // Replace an existing block first — keeps the script idempotent.
  const existing = new RegExp(`${START}[\\s\\S]*?${END}\\n?`);
  if (existing.test(html)) return html.replace(existing, wrapped);

  const mainIdx = html.indexOf("<main");
  if (mainIdx !== -1) {
    const h2Idx = html.indexOf("<h2", mainIdx);
    if (h2Idx !== -1) return html.slice(0, h2Idx) + wrapped + html.slice(h2Idx);
    const closeMain = html.indexOf("</main>", mainIdx);
    if (closeMain !== -1) return html.slice(0, closeMain) + wrapped + html.slice(closeMain);
  }
  const closeBody = html.lastIndexOf("</body>");
  if (closeBody !== -1) return html.slice(0, closeBody) + wrapped + html.slice(closeBody);
  return html + wrapped;
}

async function main() {
  if (!existsSync(CITY_ROOT)) {
    console.log("[city-inventory] no public/rehab-centers directory — nothing to do.");
    return;
  }

  let facilities;
  try {
    facilities = await fetchAllFacilities();
  } catch (err) {
    if (ALLOW_EMPTY_FACILITY_DATA) {
      console.warn(
        `[city-inventory] ${err.message}\n` +
          "[city-inventory] ALLOW_EMPTY_FACILITY_DATA=1 — leaving city pages untouched. Do not deploy.",
      );
      return;
    }
    throw err;
  }

  const byCity = groupByStateCity(facilities);

  let pagesWithInventory = 0;
  let pagesWithout = 0;
  let linksRendered = 0;

  for (const stateSlug of readdirSync(CITY_ROOT)) {
    const stateDir = path.join(CITY_ROOT, stateSlug);
    let entries;
    try {
      entries = readdirSync(stateDir);
    } catch {
      continue; // a flat state .html file, not a directory
    }
    for (const file of entries) {
      if (!file.endsWith(".html")) continue;
      const city = file.slice(0, -".html".length);
      // Canonical association key. Folds the page slug and the
      // facility's recorded city to the same value, so
      // /rehab-centers/missouri/st-charles finds the facilities stored
      // as "Saint Charles" instead of shipping an empty inventory block.
      const matches = byCity.get(stateCityKeyFromSlugs(stateSlug, city)) ?? [];
      if (matches.length === 0) {
        pagesWithout++;
        continue;
      }

      const pagePath = path.join(stateDir, file);
      const html = readFileSync(pagePath, "utf8");

      const abbr = STATE_ABBR[stateSlug];
      const cityLabel = matches[0].city ?? city.replace(/-/g, " ");
      const label = abbr ? `${cityLabel}, ${abbr}` : cityLabel;

      const block = renderFacilityList(matches, label);
      if (!block) {
        pagesWithout++;
        continue;
      }

      writeFileSync(pagePath, injectBlock(html, block), "utf8");
      pagesWithInventory++;
      linksRendered += Math.min(matches.length, 12);
    }
  }

  console.log(
    `[city-inventory] city pages with facility inventory: ${pagesWithInventory} ` +
      `(${linksRendered} facility links rendered); ${pagesWithout} city page(s) have no ` +
      `exact-match facility in the catalogue and were left unchanged.`,
  );
}

// Exported for deterministic, network-free regression tests. Importing this
// module must never fetch Supabase or write files, so `main()` runs only when
// the script is executed directly — same pattern as
// scripts/generate-facility-profiles-html.mjs.
export { injectBlock, START, END, STATE_ABBR };

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(`[city-inventory] Fatal: ${err.message}`);
    process.exit(1);
  });
}
