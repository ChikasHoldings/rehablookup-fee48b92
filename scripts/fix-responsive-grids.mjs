/**
 * fix-responsive-grids.mjs
 * Applies responsive breakpoints to all grid-cols-N patterns flagged by check:responsive
 * and wraps the ProviderROICalculator table in overflow-x-auto.
 *
 * Strategy per component type:
 *  - Admin modals/sheets (always desktop): grid-cols-1 sm:grid-cols-N
 *  - Public-facing: grid-cols-1 sm:grid-cols-N (or context-appropriate breakpoint)
 *  - Provider dashboards: grid-cols-1 sm:grid-cols-N
 *  - FacilityPhotoGallery: change hidden sm:grid → grid (show on mobile as single col)
 */

import { readFileSync, writeFileSync } from "fs";

const fixes = [
  // ── Table fix ──────────────────────────────────────────────────────────────
  {
    file: "src/pages/ProviderROICalculator.tsx",
    find: /<table\b/,
    // wrap the table in overflow-x-auto if not already wrapped
    transform: (src) => {
      if (src.includes("overflow-x-auto")) return src; // already wrapped
      return src.replace(
        /(<div[^>]*>)\s*(<table\b)/,
        (m, div, table) => {
          // Only wrap if the div doesn't already have overflow
          if (div.includes("overflow")) return m;
          return `<div className="overflow-x-auto">\n${table}`;
        }
      );
    },
  },

  // ── Admin components ───────────────────────────────────────────────────────
  {
    file: "src/components/admin/AdminStaffDetailModal.tsx",
    find: "grid grid-cols-4 flex-shrink-0",
    replace: "grid grid-cols-2 sm:grid-cols-4 flex-shrink-0",
  },
  {
    file: "src/components/admin/AdminUserPermissionsDialog.tsx",
    find: "grid w-full grid-cols-3",
    replace: "grid w-full grid-cols-1 sm:grid-cols-3",
  },
  {
    file: "src/components/admin/AtRiskProvidersCard.tsx",
    find: "grid grid-cols-3 gap-4 text-sm mb-3",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-3",
  },
  {
    file: "src/components/admin/CreateAdminUserDialog.tsx",
    find: "grid w-full grid-cols-3",
    replace: "grid w-full grid-cols-1 sm:grid-cols-3",
  },
  {
    file: "src/components/admin/ProviderDirectoryDetailModal.tsx",
    find: "mx-6 mt-3 grid grid-cols-3 flex-shrink-0",
    replace: "mx-6 mt-3 grid grid-cols-2 sm:grid-cols-3 flex-shrink-0",
  },
  {
    file: "src/components/admin/RetentionDashboard.tsx",
    find: "grid grid-cols-4 gap-4",
    replace: "grid grid-cols-2 sm:grid-cols-4 gap-4",
  },
  {
    file: "src/components/admin/SecurityAlertsPanel.tsx",
    find: "grid grid-cols-3 gap-4 mt-6 pt-4 border-t",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t",
  },
  {
    file: "src/components/admin/concierge/AllInvoicesTab.tsx",
    find: "grid grid-cols-4 gap-4",
    replace: "grid grid-cols-2 sm:grid-cols-4 gap-4",
  },
  {
    file: "src/components/admin/concierge/NetworkProvidersTab.tsx",
    find: "grid grid-cols-3 gap-4",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-4",
  },
  {
    file: "src/components/admin/dashboard/AdvisorEarningsCard.tsx",
    find: "grid grid-cols-3 gap-3",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-3",
  },
  {
    file: "src/components/admin/dashboard/CustomerRepDashboard.tsx",
    find: "grid grid-cols-3 gap-3",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-3",
  },
  {
    file: "src/components/admin/dashboard/LeadRedistributionCard.tsx",
    find: "grid grid-cols-3 gap-4",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-4",
  },
  {
    file: "src/components/admin/dashboard/ManagerDashboard.tsx",
    find: "grid grid-cols-3 gap-3",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-3",
  },
  {
    file: "src/components/admin/inquiries/InquiryDetailModal.tsx",
    find: "grid grid-cols-3 gap-4 text-sm",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm",
  },
  {
    file: "src/components/admin/international/InternationalCaseDetailSheet.tsx",
    find: "grid w-full grid-cols-4",
    replace: "grid w-full grid-cols-2 sm:grid-cols-4",
  },
  {
    file: "src/components/admin/users/tabs/SeekerActivityTab.tsx",
    find: "grid grid-cols-3 gap-3",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-3",
  },
  {
    file: "src/components/admin/users/tabs/SeekerAuditLogTab.tsx",
    find: "grid grid-cols-3 gap-3",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-3",
  },
  {
    file: "src/components/admin/users/tabs/SeekerInquiriesTab.tsx",
    find: "grid grid-cols-4 gap-3",
    replace: "grid grid-cols-2 sm:grid-cols-4 gap-3",
  },

  // ── FacilityPhotoGallery — show on mobile as single column ─────────────────
  {
    file: "src/components/facility/FacilityPhotoGallery.tsx",
    find: "hidden sm:grid grid-cols-4 grid-rows-2 gap-2 h-[220px] md:h-[260px] rounded-xl o",
    // We need to do a broader match since the string is truncated in the warning
    transform: (src) =>
      src.replace(
        /hidden sm:grid grid-cols-4 grid-rows-2/g,
        "grid grid-cols-2 sm:grid-cols-4 grid-rows-2 sm:grid-rows-2"
      ),
  },

  // ── Public-facing & provider components ────────────────────────────────────
  {
    file: "src/components/lead-intake/LeadIntakeSuccess.tsx",
    find: "grid grid-cols-3 gap-3 mb-8",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8",
  },
  {
    file: "src/components/lead-intake/SingleQuestionFlow.tsx",
    find: "grid grid-cols-5 gap-2 sm:gap-3",
    replace: "grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3",
  },
  {
    file: "src/components/provider/CentralizedLeadAnalyticsDashboard.tsx",
    find: "grid grid-cols-4 divide-x",
    replace: "grid grid-cols-2 sm:grid-cols-4 divide-x",
  },
  {
    file: "src/components/provider/EmbedBadgeWidget.tsx",
    find: "grid w-full grid-cols-4 h-8",
    replace: "grid w-full grid-cols-2 sm:grid-cols-4 h-8",
  },
  {
    file: "src/components/provider/ProMultiFacilityOverview.tsx",
    find: "grid grid-cols-3 gap-2 mb-3",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3",
  },
  {
    file: "src/components/provider/ROICalculatorWidget.tsx",
    find: "grid grid-cols-3 gap-3",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-3",
  },
  {
    file: "src/components/provider/UnlockLeadButton.tsx",
    find: "grid grid-cols-3 gap-2",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-2",
  },
  {
    file: "src/components/provider/badges/BadgeStyleSelector.tsx",
    find: "grid grid-cols-4 gap-2",
    replace: "grid grid-cols-2 sm:grid-cols-4 gap-2",
  },
  {
    file: "src/components/provider/inquiries/InquiriesStatsHeader.tsx",
    find: "grid grid-cols-5 gap-1.5 sm:gap-2",
    replace: "grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2",
  },
  {
    file: "src/components/provider/international/InternationalCandidatesTab.tsx",
    find: "grid grid-cols-3 gap-4",
    replace: "grid grid-cols-1 sm:grid-cols-3 gap-4",
  },
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

  let updated;
  if (fix.transform) {
    updated = fix.transform(src);
  } else {
    if (!src.includes(fix.find)) {
      console.log(`  SKIP (pattern not found): ${fix.file} — "${fix.find}"`);
      skipped++;
      continue;
    }
    updated = src.replace(fix.find, fix.replace);
  }

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
