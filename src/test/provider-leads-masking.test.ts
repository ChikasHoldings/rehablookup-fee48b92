import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runProviderLeadsMaskingAudit } from "../../scripts/check-provider-leads-masking.mjs";

/**
 * Provider Panel — Lead Visibility & Masking Contract
 * ----------------------------------------------------
 * Verifies for EVERY provider-panel route module that:
 *   1. It does not SELECT from the unmasked base table `leads`.
 *   2. If it reads lead rows at all, it uses the masked view
 *      `leads_provider_view` (which enforces RLS + PII masking at the
 *      database layer).
 *   3. It never uses `select("*")` against any leads source — explicit
 *      column lists only, so future schema additions cannot leak PII.
 *
 * The actual scan is shared with the build-time script
 * `scripts/check-provider-leads-masking.mjs` so CI and tests cannot drift.
 */

const PROVIDER_ROUTE_FILES = [
  "src/pages/provider/Dashboard.tsx",
  "src/pages/provider/Inquiries.tsx",
  "src/pages/provider/MyListings.tsx",
  "src/pages/provider/ListingEditor.tsx",
  "src/pages/provider/AddLocation.tsx",
  "src/pages/provider/Analytics.tsx",
  "src/pages/provider/Billing.tsx",
  "src/pages/provider/Reviews.tsx",
  "src/pages/provider/Notifications.tsx",
  "src/pages/provider/Settings.tsx",
  "src/pages/provider/PlacementNetwork.tsx",
  "src/pages/provider/ProUpgrade.tsx",
  "src/pages/provider/EmbedBadge.tsx",
  "src/pages/provider/Help.tsx",
  "src/pages/provider/KnowledgeBase.tsx",
  "src/pages/provider/ImageGuidelines.tsx",
];

describe("Provider Panel — lead masking contract", () => {
  it("scans the entire provider scope and finds zero violations", () => {
    const { files, violations } = runProviderLeadsMaskingAudit();

    // Sanity: the scan actually covered files (catches misconfigured globs)
    expect(files.length).toBeGreaterThan(20);

    if (violations.length > 0) {
      // Surface a readable failure message
      const formatted = violations
        .map((v) => `  [${v.rule}] ${v.file}\n      ${v.message}`)
        .join("\n");
      throw new Error(
        `Provider panel violates lead masking contract:\n${formatted}`,
      );
    }

    expect(violations).toEqual([]);
  });

  it.each(PROVIDER_ROUTE_FILES)(
    "%s does not SELECT from the base `leads` table and uses no select('*')",
    (relPath) => {
      const abs = join(process.cwd(), relPath);
      const src = readFileSync(abs, "utf8");

      // Hard rule 1: no `.from("leads").select(...)` chain
      const baseSelect = /\.from\(\s*["']leads["']\s*\)[\s\S]{0,200}?\.select\(/;
      expect(
        baseSelect.test(src),
        `${relPath} reads from the unmasked base "leads" table — must use leads_provider_view`,
      ).toBe(false);

      // Hard rule 2: no select("*")
      const selectStar = /\.select\(\s*["']\*["']\s*\)/;
      expect(
        selectStar.test(src),
        `${relPath} uses select("*") — list explicit columns only`,
      ).toBe(false);

      // Hard rule 3: if the file reads leads at all, it must go through the masked view
      const readsLeadsView = /\.from\(\s*["']leads_provider_view["']\s*\)/.test(
        src,
      );
      const readsLeadsBase = /\.from\(\s*["']leads["']\s*\)/.test(src);
      if (readsLeadsBase && !readsLeadsView) {
        // The only base-table operations allowed are writes (update/upsert/delete)
        // for status/snooze fields. Confirm no select chain exists.
        expect(baseSelect.test(src)).toBe(false);
      }
    },
  );
});
