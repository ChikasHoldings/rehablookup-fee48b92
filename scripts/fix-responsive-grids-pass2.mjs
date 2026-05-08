/**
 * fix-responsive-grids-pass2.mjs
 * Second pass — fixes the remaining 20 responsive grid warnings.
 */

import { readFileSync, writeFileSync } from "fs";

// Each entry: { file, find (exact string), replace }
// For files with multiple occurrences, we use replaceAll: true
const fixes = [
  // RetentionDashboard — second grid-cols-3
  { file: "src/components/admin/RetentionDashboard.tsx", find: "grid grid-cols-3 gap-4", replace: "grid grid-cols-1 sm:grid-cols-3 gap-4", all: true },
  // ManagerDashboard — second grid-cols-3
  { file: "src/components/admin/dashboard/ManagerDashboard.tsx", find: "grid grid-cols-3 gap-3 pt-2", replace: "grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2" },
  // ROICalculatorWidget — second grid-cols-3
  { file: "src/components/provider/ROICalculatorWidget.tsx", find: "grid grid-cols-3 gap-3 pt-2", replace: "grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2" },
  // InternationalCandidatesTab — second grid-cols-3
  { file: "src/components/provider/international/InternationalCandidatesTab.tsx", find: "grid grid-cols-3 border-b", replace: "grid grid-cols-1 sm:grid-cols-3 border-b" },
  // LeadDetailDrawer
  { file: "src/components/provider/leads/LeadDetailDrawer.tsx", find: "grid grid-cols-3 gap-2", replace: "grid grid-cols-1 sm:grid-cols-3 gap-2", all: true },
  // LeadDetailPanel
  { file: "src/components/provider/leads/LeadDetailPanel.tsx", find: "grid grid-cols-3 gap-2", replace: "grid grid-cols-1 sm:grid-cols-3 gap-2", all: true },
  // DomesticCandidatesTab
  { file: "src/components/provider/placement-network/DomesticCandidatesTab.tsx", find: "grid grid-cols-3 gap-4", replace: "grid grid-cols-1 sm:grid-cols-3 gap-4", all: true },
  // UnlockHistoryTab
  { file: "src/components/provider/settings/UnlockHistoryTab.tsx", find: "grid grid-cols-3 gap-4", replace: "grid grid-cols-1 sm:grid-cols-3 gap-4" },
  // PlacementStatusCard
  { file: "src/components/seeker/placement/PlacementStatusCard.tsx", find: "grid grid-cols-5 gap-1", replace: "grid grid-cols-3 sm:grid-cols-5 gap-1" },
  // SeekerPlacementModal
  { file: "src/components/seeker/placement/SeekerPlacementModal.tsx", find: "w-full grid grid-cols-3", replace: "w-full grid grid-cols-1 sm:grid-cols-3" },
  // CostEstimator
  { file: "src/pages/CostEstimator.tsx", find: "grid grid-cols-3 gap-3", replace: "grid grid-cols-1 sm:grid-cols-3 gap-3", all: true },
  // Index — grid-cols-4 with md: already but missing sm:
  { file: "src/pages/Index.tsx", find: "grid grid-cols-4 gap-1.5 md:gap-2", replace: "grid grid-cols-2 sm:grid-cols-4 gap-1.5 md:gap-2" },
  // MarketingLanding
  { file: "src/pages/MarketingLanding.tsx", find: "grid grid-cols-3 text-center gap-4", replace: "grid grid-cols-1 sm:grid-cols-3 text-center gap-4" },
  // SeekerSignup
  { file: "src/pages/SeekerSignup.tsx", find: "grid grid-cols-3 gap-1.5 sm:gap-2", replace: "grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2" },
  // AdminAnalytics
  { file: "src/pages/admin/AdminAnalytics.tsx", find: "grid grid-cols-3 gap-4 mb-3", replace: "grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3" },
  // AdvisorProviderDirectory
  { file: "src/pages/admin/AdvisorProviderDirectory.tsx", find: "grid grid-cols-3 gap-3", replace: "grid grid-cols-1 sm:grid-cols-3 gap-3", all: true },
  // Settings — grid-cols-4 tab switcher
  { file: "src/pages/provider/Settings.tsx", find: "grid grid-cols-4 gap-2", replace: "grid grid-cols-2 sm:grid-cols-4 gap-2" },
  // ForProvidersState
  { file: "src/pages/provider-guides/ForProvidersState.tsx", find: "grid grid-cols-3 gap-6 text-center", replace: "grid grid-cols-1 sm:grid-cols-3 gap-6 text-center" },
  // SeekerRequests — tab switcher
  { file: "src/pages/seeker/SeekerRequests.tsx", find: "grid w-full grid-cols-3 h-9", replace: "grid w-full grid-cols-1 sm:grid-cols-3 h-9" },
  // SeekerReviews — tab switcher
  { file: "src/pages/seeker/SeekerReviews.tsx", find: "grid w-full grid-cols-4 h-9", replace: "grid w-full grid-cols-2 sm:grid-cols-4 h-9" },
];

const BASE = "/home/ubuntu/rehablookup";
let fixed = 0;
let skipped = 0;

for (const fix of fixes) {
  const path = `${BASE}/${fix.file}`;
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch {
    console.log(`  SKIP (not found): ${fix.file}`);
    skipped++;
    continue;
  }

  if (!src.includes(fix.find)) {
    console.log(`  SKIP (pattern not found): ${fix.file} — "${fix.find}"`);
    skipped++;
    continue;
  }

  const updated = fix.all
    ? src.split(fix.find).join(fix.replace)
    : src.replace(fix.find, fix.replace);

  if (updated === src) {
    console.log(`  SKIP (no change): ${fix.file}`);
    skipped++;
    continue;
  }

  writeFileSync(path, updated, "utf8");
  console.log(`  FIXED: ${fix.file}`);
  fixed++;
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);
