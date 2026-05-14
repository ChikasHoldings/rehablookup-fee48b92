/**
 * Shared content helpers for the prerender generators.
 *
 * Loads the unique per-state datasets shipped in src/data/ and exposes
 * builder functions that produce directory-style HTML fragments — fact
 * boxes, structured lists, signature paragraphs — so each generated
 * page reads as a distinct directory entry rather than a templated
 * blog clone.
 *
 * The data sources are deliberately ones with per-state variation:
 *   • stateAddictionStats.ts — population, overdose rate, opioid share,
 *     facility count, Medicaid status, primary/secondary metros,
 *     per-state signature note, regional context.
 *   • stateLicensingData.ts  — state regulatory body, licensure types,
 *     renewal cadence.
 *
 * The HTML output is intentionally tabular / list-based, not prose-
 * heavy. Treatment-center directories should feel like a directory,
 * not an article.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─── data loaders ────────────────────────────────────────────────────

let _stateStatsCache = null;
export function getAllStateStats() {
  if (_stateStatsCache) return _stateStatsCache;
  const txt = fs.readFileSync(path.join(repoRoot, "src/data/stateAddictionStats.ts"), "utf8");
  const raw = txt.match(/const RAW: Omit<StateAddictionStats, "slug">\[\] = \[([\s\S]*?)\];/);
  if (!raw) throw new Error("RAW state stats block not found");
  // Each entry: { abbreviation: "AL", populationMillions: 5.1, ... }
  const re = /\{\s*abbreviation:\s*"([A-Z]{2})",\s*populationMillions:\s*([\d.]+),\s*overdoseDeathRate:\s*([\d.]+),\s*opioidShare:\s*(\d+),\s*samhsaFacilities:\s*(\d+),\s*medicaidExpanded:\s*(true|false),\s*primaryMetro:\s*"([^"]+)",\s*secondaryMetros:\s*\[([^\]]*)\],\s*signatureNote:\s*"([^"]+)",\s*regionalContext:\s*"([^"]+)"/g;
  const out = {};
  let m;
  while ((m = re.exec(raw[1]))) {
    out[m[1]] = {
      abbr: m[1],
      populationMillions: parseFloat(m[2]),
      overdoseDeathRate: parseFloat(m[3]),
      opioidShare: parseInt(m[4], 10),
      samhsaFacilities: parseInt(m[5], 10),
      medicaidExpanded: m[6] === "true",
      primaryMetro: m[7],
      secondaryMetros: [...m[8].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
      signatureNote: m[9],
      regionalContext: m[10],
    };
  }
  _stateStatsCache = out;
  return out;
}

const ABBR_TO_SLUG = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california",
  CO: "colorado", CT: "connecticut", DE: "delaware", DC: "district-of-columbia",
  FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho", IL: "illinois",
  IN: "indiana", IA: "iowa", KS: "kansas", KY: "kentucky", LA: "louisiana",
  ME: "maine", MD: "maryland", MA: "massachusetts", MI: "michigan",
  MN: "minnesota", MS: "mississippi", MO: "missouri", MT: "montana",
  NE: "nebraska", NV: "nevada", NH: "new-hampshire", NJ: "new-jersey",
  NM: "new-mexico", NY: "new-york", NC: "north-carolina", ND: "north-dakota",
  OH: "ohio", OK: "oklahoma", OR: "oregon", PA: "pennsylvania",
  RI: "rhode-island", SC: "south-carolina", SD: "south-dakota", TN: "tennessee",
  TX: "texas", UT: "utah", VT: "vermont", VA: "virginia", WA: "washington",
  WV: "west-virginia", WI: "wisconsin", WY: "wyoming",
};

let _statsBySlug = null;
export function getStateStatsBySlug(slug) {
  if (!_statsBySlug) {
    const all = getAllStateStats();
    _statsBySlug = {};
    for (const [abbr, stats] of Object.entries(all)) {
      const s = ABBR_TO_SLUG[abbr];
      if (s) _statsBySlug[s] = stats;
    }
  }
  return _statsBySlug[slug];
}

let _licensingCache = null;
export function getStateLicensing(slug) {
  if (!_licensingCache) {
    const txt = fs.readFileSync(path.join(repoRoot, "src/data/stateLicensingData.ts"), "utf8");
    const out = {};
    // Each: "<state-slug>": { regulatoryBody: "...", regulatoryAbbr: "...", websiteUrl: "...", licensureTypes: [...], keyRequirements: [...], renewalPeriod: "..." }
    const re = /"([a-z-]+)":\s*\{\s*regulatoryBody:\s*"([^"]+)",\s*regulatoryAbbr:\s*"([^"]+)",\s*websiteUrl:\s*"([^"]+)",\s*licensureTypes:\s*\[([^\]]*)\],\s*keyRequirements:\s*\[([^\]]*)\],\s*renewalPeriod:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(txt))) {
      out[m[1]] = {
        regulatoryBody: m[2],
        regulatoryAbbr: m[3],
        websiteUrl: m[4],
        licensureTypes: [...m[5].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
        keyRequirements: [...m[6].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
        renewalPeriod: m[7],
      };
    }
    _licensingCache = out;
  }
  return _licensingCache[slug];
}

// ─── builders ────────────────────────────────────────────────────────

/**
 * Render an at-a-glance fact box (state-level numbers). Tabular, not prose.
 * Different numbers per state ⇒ every page that includes this is distinct.
 */
export function renderStateFactBox(stateName, stateSlug) {
  const stats = getStateStatsBySlug(stateSlug);
  if (!stats) return "";
  const popDisplay = (stats.populationMillions * 1_000_000).toLocaleString();
  const medicaid = stats.medicaidExpanded ? "Expanded under ACA" : "Not expanded";
  return `<section class="fact-box" aria-label="${escHtml(stateName)} treatment snapshot">
      <h2>${escHtml(stateName)} Treatment Snapshot</h2>
      <dl class="fact-grid">
        <div><dt>State population</dt><dd>${popDisplay}</dd></div>
        <div><dt>SAMHSA-listed facilities</dt><dd>${stats.samhsaFacilities.toLocaleString()}</dd></div>
        <div><dt>Overdose deaths per 100k</dt><dd>${stats.overdoseDeathRate}</dd></div>
        <div><dt>Share involving opioids</dt><dd>${stats.opioidShare}%</dd></div>
        <div><dt>Medicaid expansion</dt><dd>${medicaid}</dd></div>
        <div><dt>Primary metro</dt><dd>${escHtml(stats.primaryMetro)}</dd></div>
      </dl>
    </section>`;
}

/**
 * The per-state human-written signature line, dropped into a small
 * <aside> beneath the fact box. Distinct sentence per state.
 */
export function renderStateSignature(stateName, stateSlug) {
  const stats = getStateStatsBySlug(stateSlug);
  if (!stats) return "";
  return `<aside class="signature" aria-label="${escHtml(stateName)} context">
      <p><strong>Regional context — ${escHtml(stats.regionalContext)}:</strong> ${escHtml(stats.signatureNote)}</p>
    </aside>`;
}

/**
 * Directory-style list of treatment levels offered statewide. Each entry
 * is a one-liner — feels like a service directory, not an article.
 */
export function renderTreatmentLevels(stateName) {
  return `<section aria-label="Treatment levels in ${escHtml(stateName)}">
      <h2>Treatment Levels in ${escHtml(stateName)}</h2>
      <ul class="dir-list">
        <li><strong>Medical detox</strong> — 24/7 supervised withdrawal management for alcohol, opioids, benzodiazepines, and stimulants.</li>
        <li><strong>Residential inpatient</strong> — 28–90 day live-in programs with structured therapy and around-the-clock care.</li>
        <li><strong>Partial hospitalization (PHP)</strong> — Day-program care, typically 5–6 days/week, returning home evenings.</li>
        <li><strong>Intensive outpatient (IOP)</strong> — 9–15 hours/week of group + individual therapy alongside work or school.</li>
        <li><strong>Standard outpatient</strong> — Weekly individual / group sessions for early-recovery maintenance.</li>
        <li><strong>Medication-assisted treatment (MAT)</strong> — Buprenorphine, methadone, and naltrexone prescribed under licensed clinical oversight.</li>
        <li><strong>Sober living &amp; recovery housing</strong> — Structured drug-free residences supporting community-based recovery.</li>
      </ul>
    </section>`;
}

/**
 * Insurance directory. Mentions state-specific Medicaid posture and the
 * common in-state carriers. Distinct per-state because of Medicaid status.
 */
export function renderInsuranceDirectory(stateName, stateSlug) {
  const stats = getStateStatsBySlug(stateSlug);
  const medicaidLine = stats?.medicaidExpanded
    ? `${stateName} expanded Medicaid under the ACA, broadening coverage for adults up to 138% of the federal poverty line.`
    : `${stateName} has not expanded Medicaid; coverage for low-income adults is narrower than in expansion states, and county-funded and church-funded programs play a larger role.`;
  return `<section aria-label="Insurance coverage in ${escHtml(stateName)}">
      <h2>Insurance Accepted in ${escHtml(stateName)}</h2>
      <p>${escHtml(medicaidLine)} Under the federal Mental Health Parity and Addiction Equity Act, most plans must cover substance-use treatment at parity with medical/surgical benefits.</p>
      <ul class="dir-list">
        <li>Aetna</li>
        <li>Blue Cross Blue Shield</li>
        <li>Cigna</li>
        <li>UnitedHealthcare</li>
        <li>Humana</li>
        <li>Kaiser Permanente (where available)</li>
        <li>Anthem</li>
        <li>${stats?.medicaidExpanded ? "Medicaid (state Medicaid)" : "Medicaid (limited eligibility)"}</li>
        <li>Medicare (parts A &amp; B for inpatient detox / D for MAT)</li>
        <li>TRICARE</li>
        <li>VA / CHAMPVA (veterans)</li>
      </ul>
    </section>`;
}

/**
 * State licensing directory — regulatory body, licensure types, renewal.
 * Distinct per-state because the regulator is different in each.
 */
export function renderLicensingBox(stateName, stateSlug) {
  const lic = getStateLicensing(stateSlug);
  if (!lic) return "";
  const types = lic.licensureTypes.slice(0, 3).map((t) => `<li>${escHtml(t)}</li>`).join("");
  return `<section aria-label="State licensing in ${escHtml(stateName)}">
      <h2>State Licensing &amp; Oversight</h2>
      <p><strong>Regulator:</strong> ${escHtml(lic.regulatoryBody)} (${escHtml(lic.regulatoryAbbr)}). All listed facilities operate under ${escHtml(stateName)} state licensure; verify any provider against the regulator's directory.</p>
      <ul class="dir-list">${types}</ul>
      <p class="small">Renewal cadence: ${escHtml(lic.renewalPeriod)}.</p>
    </section>`;
}

/**
 * Regional metros context — lists the primary + secondary metros from
 * stateAddictionStats so each page has a state-distinct geographic
 * profile.
 */
export function renderMetrosLine(stateName, stateSlug) {
  const stats = getStateStatsBySlug(stateSlug);
  if (!stats) return "";
  const others = stats.secondaryMetros.slice(0, 4);
  if (!others.length) return `<p><strong>Largest metro:</strong> ${escHtml(stats.primaryMetro)}.</p>`;
  return `<p><strong>Largest metros:</strong> ${escHtml(stats.primaryMetro)}, ${others.map(escHtml).join(", ")}.</p>`;
}

/**
 * Shared CSS for directory-style pages. Different look than a blog page:
 * tabular fact box, dense bullet lists, low-prose density.
 */
export const SHARED_DIRECTORY_CSS = `
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:960px;margin:0 auto;padding:32px 20px;color:#1a2b4a;line-height:1.65}
    h1{font-size:1.85rem;color:#1B365D;margin-bottom:8px}
    h2{font-size:1.25rem;color:#1B365D;margin-top:28px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
    h3{font-size:1.05rem;color:#1B365D;margin-top:18px}
    p{color:#333;margin-bottom:14px}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    .breadcrumbs{font-size:.85rem;color:#666;margin-bottom:18px}
    .breadcrumbs ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px}
    .fact-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin:18px 0}
    .fact-box h2{margin-top:0;border:0}
    .fact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px 24px;margin:0}
    .fact-grid > div{margin:0}
    .fact-grid dt{font-size:.78rem;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600}
    .fact-grid dd{font-size:1.05rem;color:#0f172a;margin:2px 0 0;font-weight:600}
    .signature{background:#eff6ff;border-left:4px solid #2563eb;padding:10px 16px;margin:14px 0;border-radius:0 8px 8px 0;font-size:.95rem}
    .signature p{margin:0}
    .dir-list{list-style:none;padding-left:0;margin:8px 0 14px}
    .dir-list li{padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:.95rem}
    .dir-list li:last-child{border-bottom:0}
    .pill-list{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
    .pill-list li a{display:inline-block;padding:6px 12px;background:#f1f5f9;border-radius:6px;font-size:.86rem;color:#1e40af}
    .cta{background:#1B365D;color:#fff;padding:18px 20px;border-radius:10px;margin:24px 0;text-align:center}
    .cta h2{color:#fff;margin:0 0 6px;border:0}
    .cta p{color:#cbd5e1;margin:0 0 12px}
    .cta a{display:inline-block;background:#2563eb;color:#fff;padding:9px 18px;border-radius:7px;margin:4px;font-weight:600}
    .small{font-size:.85rem;color:#64748b}
    footer{margin-top:40px;padding-top:18px;border-top:1px solid #e5e7eb;font-size:.8rem;color:#888}
    header{padding:10px 0 16px;border-bottom:1px solid #e5e7eb;margin-bottom:16px}
    header a{font-weight:700;font-size:1.15rem;color:#1B365D}`;

/** Shared header markup used by all directory pages. */
export const SHARED_HEADER_HTML = `<header><a href="/" aria-label="RehabLookup Home">RehabLookup</a></header>`;

/** Shared footer markup used by all directory pages. */
export const SHARED_FOOTER_HTML = `<footer><p>&copy; 2026 RehabLookup. All rights reserved. <a href="/privacy-policy">Privacy Policy</a> &middot; <a href="/terms-of-service">Terms of Service</a></p></footer>`;

/** Standard CTA card. */
export function renderCta(headline, copy) {
  return `<div class="cta">
      <h2>${escHtml(headline)}</h2>
      <p>${escHtml(copy)}</p>
      <a href="/concierge">Get Free Help</a>
      <a href="/search-results" style="background:#fff;color:#1B365D">Browse Centers</a>
    </div>`;
}

export { escHtml };
