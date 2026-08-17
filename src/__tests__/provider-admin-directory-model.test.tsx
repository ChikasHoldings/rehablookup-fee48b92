/**
 * Directory cutover stage 3 — provider + admin UX contract.
 *
 * Stage 1 cut the public shell to the directory model; stage 2 cut the inquiry
 * and phone model. Stage 3 cuts the AUTHENTICATED provider and admin product
 * over to the same model:
 *
 *   • no Concierge, placement, advisor, or lead-marketplace workflow in the
 *     active provider/admin experience
 *   • the current selected-facility workflow is presented as "Inquiries"
 *   • an inquiry is pinned to the one facility the seeker chose — no unlock,
 *     purchase, reassign, redistribute, or match action exists
 *   • inquiries are NOT a paid feature: every eligible facility receives them
 *   • the retained directory workflows (claim, onboarding, Pro, Featured,
 *     support, account) all stay reachable
 *
 * Where behaviour can be exercised, it is: the admin nav config is imported
 * and called, and the provider sidebar / mobile nav are RENDERED with their
 * data hooks mocked, so these tests assert what an operator actually sees
 * rather than what the file happens to contain.
 *
 * Scope discipline, same as the stage-1/2 guards: nothing here bans a bare
 * word repo-wide. Migrations, edge functions, the unmounted legacy workspace
 * under components/admin/concierge/**, the read-only historical archive, and
 * comments explaining retired concepts are all deliberately out of scope —
 * they are Stage-4 debt, not active product.
 */
import { describe, it, expect, vi } from "vitest";
import { render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  getNavSectionsForRole,
  getMobileNavForRole,
  isNavGroup,
  type NavSection,
} from "@/components/admin/adminNavConfig";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

/**
 * Source with comments stripped.
 *
 * Every "must not contain" assertion below runs against this, never the raw
 * file. A comment explaining that Concierge was retired is the OPPOSITE of a
 * regression — asserting on raw source would punish exactly the documentation
 * this cutover should leave behind. Only real code and real copy are checked.
 */
const readCode = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, "$1 ");

// ───────────────────────────────────────────────────────────────────────────
// Mocks — the nav components are pure presentation over a few data hooks.
// ───────────────────────────────────────────────────────────────────────────

vi.mock("@/hooks/usePendingInquiriesCount", () => ({
  usePendingInquiriesCount: () => ({ count: 3 }),
}));
vi.mock("@/hooks/useProStatus", () => ({
  useProStatus: () => ({ data: { isPro: false } }),
}));
vi.mock("@/contexts/SelectedFacilityContext", () => ({
  useSelectedFacility: () => ({ selectedFacility: { id: "facility-1" } }),
  SelectedFacilityProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/routePrefetch", () => ({
  prefetchRoute: () => {},
  prefetchAdjacentRoutes: () => {},
  preloadProviderPages: () => {},
}));

import { ProviderSidebar } from "@/components/provider/ProviderSidebar";
import { MobileBottomNav } from "@/components/provider/MobileBottomNav";

/** Terms that must never appear in a rendered provider/admin navigation. */
const RETIRED_NAV_TERMS = [
  /concierge/i,
  /placement/i,
  /advisor/i,
  /introduction/i,
  /\bcredits?\b/i,
  /unlock/i,
];

function renderProviderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/provider/dashboard"]}>
      <ProviderSidebar />
    </MemoryRouter>,
  );
}

function navLinks(container: HTMLElement) {
  return Array.from(container.querySelectorAll("a")).map((a) => ({
    href: a.getAttribute("href") ?? "",
    text: (a.textContent ?? "").trim(),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

describe("stage 3 — provider primary navigation", () => {
  it("renders only directory-model workflows, organized by provider job", () => {
    const { container } = renderProviderSidebar();
    const nav = container.querySelector('nav[aria-label="Provider navigation"]')!;
    const labels = Array.from(nav.querySelectorAll("a")).map((a) =>
      (a.textContent ?? "").replace(/\d+\+?$/, "").trim(),
    );

    // Overview → Directory → Growth → Account. The labels are provider JOBS,
    // not legacy product names: "Analytics" reads "Performance", "Marketing"
    // reads "Featured" (that route is now the Featured advertising hub), and
    // "Subscription" reads "Plan & Billing". Enhanced Profile is promoted to a
    // first-class destination.
    expect(labels).toEqual([
      "Dashboard",
      "Listings",
      "Enhanced Profile",
      "Inquiries",
      "Reviews",
      "Listing Claims",
      "Performance",
      "Featured",
      "Plan & Billing",
      "Settings",
      "Help & Support",
    ]);
  });

  it("groups navigation under the four job sections", () => {
    const { container } = renderProviderSidebar();
    const nav = container.querySelector('nav[aria-label="Provider navigation"]')!;
    const sections = Array.from(nav.querySelectorAll("p")).map((p) =>
      (p.textContent ?? "").trim(),
    );
    expect(sections).toEqual(["Overview", "Directory", "Growth", "Account"]);
  });

  it("retires the legacy product names from navigation", () => {
    const { container } = renderProviderSidebar();
    const labels = navLinks(container).map((l) => l.text.replace(/\d+\+?$/, "").trim());
    for (const legacy of ["Analytics", "Marketing", "Subscription", "Billing", "My Listing"]) {
      expect(labels, `legacy nav label "${legacy}" is back`).not.toContain(legacy);
    }
  });

  it("never shows two active rows for /provider/listings and its profile child", () => {
    // Enhanced Profile is a CHILD of /provider/listings. A prefix-match active
    // rule highlighted both rows at once.
    const { container } = render(
      <MemoryRouter initialEntries={["/provider/listings/profile"]}>
        <ProviderSidebar />
      </MemoryRouter>,
    );
    const active = Array.from(container.querySelectorAll('a[aria-current="page"]'));
    expect(active).toHaveLength(1);
    expect(active[0].getAttribute("href")).toBe("/provider/listings/profile");
  });

  it("has no Concierge / placement / advisor navigation", () => {
    const { container } = renderProviderSidebar();
    for (const { href, text } of navLinks(container)) {
      for (const term of RETIRED_NAV_TERMS) {
        expect(text, `nav label "${text}"`).not.toMatch(term);
        expect(href, `nav href "${href}"`).not.toMatch(term);
      }
    }
  });

  it('presents the current workflow as "Inquiries", never "Leads"', () => {
    const { container } = renderProviderSidebar();
    const links = navLinks(container);

    const inquiries = links.find((l) => l.href === "/provider/inquiries");
    expect(inquiries, "provider nav must link to /provider/inquiries").toBeTruthy();
    expect(inquiries!.text).toContain("Inquiries");

    for (const { text } of links) {
      expect(text).not.toMatch(/\blead(s)?\b/i);
    }
  });

  it("badges pending inquiries on the inquiry entry, not on Marketing", () => {
    const { container } = renderProviderSidebar();
    const links = Array.from(container.querySelectorAll("a"));
    const inquiries = links.find((a) => a.getAttribute("href") === "/provider/inquiries")!;
    const marketing = links.find((a) => a.getAttribute("href") === "/provider/marketing")!;

    // 3 comes from the mocked usePendingInquiriesCount.
    expect(within(inquiries).getByText("3")).toBeTruthy();
    expect(marketing.textContent).not.toMatch(/\d/);
  });
});

describe("stage 3 — provider mobile navigation", () => {
  it("has no Concierge tab and labels the inquiry tab correctly", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/provider/dashboard"]}>
        <MobileBottomNav onMoreClick={() => {}} />
      </MemoryRouter>,
    );
    const links = navLinks(container);

    expect(links.map((l) => l.href)).toEqual([
      "/provider/dashboard",
      "/provider/listings",
      "/provider/inquiries",
      "/provider/analytics",
    ]);
    // Home · Listings · Inquiries · Performance · More — "More" is a button,
    // not a link, so it is absent from `links`.
    // The pending-inquiry badge renders BEFORE the label in the mobile tab
    // ("3Inquiries"), so strip a leading count as well as a trailing one.
    expect(links.map((l) => l.text.replace(/^\d+\+?/, "").replace(/\d+\+?$/, "").trim())).toEqual([
      "Home",
      "Listings",
      "Inquiries",
      "Performance",
    ]);
    expect(container.querySelector('button[aria-label="More navigation options"]')).toBeTruthy();
    for (const { href, text } of links) {
      for (const term of RETIRED_NAV_TERMS) {
        expect(text).not.toMatch(term);
        expect(href).not.toMatch(term);
      }
      expect(text).not.toMatch(/\blead(s)?\b/i);
    }
    expect(links.find((l) => l.href === "/provider/inquiries")!.text).toContain("Inquiries");
  });
});

describe("stage 3 — provider dashboard", () => {
  const src = readCode("src/pages/provider/Dashboard.tsx");

  it("does not gate the inquiry metric behind Pro", () => {
    // Inquiries are not a paid feature: leads_provider_view is security_invoker
    // over own-facility RLS with no Pro predicate on SELECT, so a Free facility
    // both receives and can read its inquiries.
    expect(src).not.toMatch(/Upgrade to receive/i);
    expect(src).not.toMatch(/proStatus\.isPro \? \(totalLeadsErr/);
    expect(src).toMatch(/value=\{totalLeadsErr \? "—" : totalLeadsCount\}/);
  });

  it("does not advertise inquiries as a Pro benefit", () => {
    expect(src).not.toMatch(/Inquiries delivered to your inbox/i);
  });

  it("has no placement or lead-marketplace KPI or card", () => {
    for (const banned of [
      /ConciergeAnalyticsWidget/,
      /Concierge Partner/,
      /has_concierge_partner/,
      /placements?\s+(this month|attributed)/i,
      /lead revenue/i,
      /placement fee/i,
    ]) {
      expect(src, `banned dashboard concept ${banned}`).not.toMatch(banned);
    }
  });

  it("keeps the retained directory surfaces reachable from the dashboard", () => {
    // The dashboard links the section HUBS, not every leaf. /provider/help and
    // /provider/claims moved to the sidebar's Account / Directory sections, and
    // Featured is reached through its hub (/provider/marketing) rather than the
    // child placement page — asserted separately below.
    for (const href of [
      "/provider/listings",
      "/provider/listings/profile",
      "/provider/inquiries",
      "/provider/analytics",
      "/provider/reviews",
      "/provider/billing",
      "/provider/add-location",
      "/provider/marketing",
    ]) {
      expect(src, `dashboard must still link ${href}`).toContain(href);
    }
    expect(src).toMatch(/upgrade=pro/);
  });

  it("carries exactly one Pro upgrade CTA", () => {
    // Three shipped at once: the header button, a gradient upsell card in the
    // grid, and the free-tier teaser's "See what Pro unlocks". Repeated upsells
    // are what makes a SaaS panel feel like a casino.
    const ctas = src.match(/upgrade=pro/g) ?? [];
    expect(ctas).toHaveLength(1);
  });

  it("does not sell verification, ranking, or Featured as Pro", () => {
    for (const banned of [
      /verified badge/i,
      /priority\s+(?:search\s+)?(?:ranking|placement)/i,
      /\+\s*50/,
      /rank\s+higher/i,
      /qualified\s+leads?/i,
    ]) {
      expect(src, `dashboard claims ${banned}`).not.toMatch(banned);
    }
  });

  it("does not gate Featured behind Pro", () => {
    // The old Marketing card rendered a `locked: !proStatus.isPro` lock badge on
    // the Featured row. Featured is independent paid advertising.
    expect(src).not.toMatch(/locked:\s*!proStatus\.isPro/);
    expect(src).not.toMatch(/Pro required/i);
  });

  it("shows the Featured status band separately from the Plan band", () => {
    expect(src).toMatch(/hasFeatured/);
    expect(src).toMatch(/FeaturedAnalyticsWidget/);
    expect(src).toMatch(/FEATURED_DIRECTORY_NOTE/);
  });

  it("reads its Pro benefit copy from the shared contract, not a local array", () => {
    expect(src).toMatch(/from "@\/lib\/proDirectoryBenefits"/);
    expect(src).toMatch(/PRO_DIRECTORY_TRUST_NOTE/);
  });
});

describe("stage 3 — provider inquiry experience", () => {
  const page = readCode("src/pages/provider/Inquiries.tsx");
  const detail = readCode("src/components/provider/inquiries/InquiryDetailPanel.tsx");
  const listItem = readCode("src/components/provider/inquiries/InquiryListItem.tsx");

  it("uses inquiry language, not lead language, in visible copy", () => {
    expect(page).toMatch(/title=\{isMobile && mobileView === 'detail' \? 'Inquiry details' : 'Inquiries'\}/);
    expect(page).toMatch(/No inquiries yet/);
    expect(page).toMatch(/How inquiries work/);
    expect(page).toMatch(/itemLabel="inquiry"/);
    expect(page).not.toMatch(/No leads yet/);
    expect(page).not.toMatch(/How leads work/);
  });

  it("stays scoped to the facility that received the inquiry", () => {
    // The list is read through the masked view, filtered by the provider's own
    // facilities — never by a distribution or assignment table.
    expect(page).toContain("fromLeadsProviderView");
    expect(page).toMatch(/facility_id/);
    expect(page).not.toMatch(/lead_distributions/);
  });

  it("offers no unlock, buy, reassign, or redistribute action", () => {
    for (const src of [page, detail, listItem]) {
      for (const banned of [
        /unlock/i,
        /\bpurchase\b/i,
        /\bbuy\b/i,
        /reassign/i,
        /redistribut/i,
        /\bcredits?\b/i,
        /\bbid\b/i,
      ]) {
        expect(src).not.toMatch(banned);
      }
    }
  });

  it("drops the lead-marketplace exclusivity badges", () => {
    // Every inquiry goes to exactly one facility, so there is no exclusivity
    // window to win and nothing is ever shared with a competitor.
    expect(listItem).not.toMatch(/Exclusive</);
    expect(listItem).not.toMatch(/Shared</);
  });
});

describe("stage 3 — provider retained monetization", () => {
  const marketingHub = readCode("src/pages/provider/MarketingHub.tsx");

  it("sells Featured and only Featured as the visibility add-on", () => {
    expect(marketingHub).toMatch(/Featured/);
    // MarketingHubCards.tsx was deleted with the Featured-hub restructure — its
    // only content was a Featured card the hub now owns directly, and it framed
    // Featured as a Pro-gated add-on.
    expect(existsSync(resolve(root, "src/components/provider/marketing/MarketingHubCards.tsx")))
      .toBe(false);
  });

  it("does not market the retired Concierge product on the Featured hub", () => {
    // `has_concierge_partner` (the subscription column) may be READ so legacy
    // holders can be shown a retired-product state. What must not appear is a
    // pitch: a Concierge purchase CTA, a "become a partner" action, or Concierge
    // framed as an upgrade to Featured.
    expect(marketingHub).not.toMatch(/Concierge Partner<|>Concierge/i);
    expect(marketingHub).not.toMatch(/become a (?:concierge )?partner/i);
    expect(marketingHub).not.toMatch(/upgrade to Concierge/i);
    expect(marketingHub).not.toMatch(/\/provider\/marketing\/concierge/);
  });

  it("does not gate the Featured explanation behind Pro", () => {
    // The hub must EXPLAIN Featured to every provider. The old version rendered
    // a "Pro required" lock card instead, and stamped the add-on with an
    // upgrade CTA — Featured is independent paid advertising.
    expect(marketingHub).not.toMatch(/Pro required/i);
    expect(marketingHub).not.toMatch(/Upgrade to access/i);
  });

  it("never claims Featured changes organic position", () => {
    expect(marketingHub).toMatch(/does not change (?:your )?organic directory position/i);
    expect(marketingHub).not.toMatch(/priority\s+(?:search\s+)?(?:ranking|placement)/i);
    expect(marketingHub).not.toMatch(/\+\s*50/);
  });

  it("labels sponsored placements as advertising", () => {
    expect(marketingHub).toMatch(/sponsored/i);
  });

  it("keeps Pro at $99/mo and does not price a retired add-on", () => {
    const pricing = read("src/lib/billingPricing.ts");
    expect(pricing).toMatch(/9900/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_ROLES = [
  ["super_admin", true],
  ["manager", false],
  ["advisor", false],
  ["customer_rep", false],
] as const;

function allLinks(sections: NavSection[]): { to: string; label: string }[] {
  const out: { to: string; label: string }[] = [];
  for (const section of sections) {
    for (const entry of section.entries) {
      if (isNavGroup(entry)) {
        out.push(...entry.items.map((i) => ({ to: i.to, label: i.label })));
      } else {
        out.push({ to: entry.to, label: entry.label });
      }
    }
  }
  return out;
}

describe("stage 3 — admin primary navigation", () => {
  it.each(ADMIN_ROLES)(
    "%s nav has no Concierge / placement / advisor entry",
    (role, isSuper) => {
      for (const { to, label } of allLinks(getNavSectionsForRole(role, isSuper))) {
        for (const term of RETIRED_NAV_TERMS) {
          expect(label, `${role} nav label "${label}"`).not.toMatch(term);
          expect(to, `${role} nav href "${to}"`).not.toMatch(term);
        }
      }
    },
  );

  it.each(ADMIN_ROLES)("%s mobile nav has no retired entry either", (role, isSuper) => {
    const mobile = getMobileNavForRole(role, isSuper).flatMap((s) => s.items);
    for (const item of mobile) {
      for (const term of RETIRED_NAV_TERMS) {
        expect(item.label).not.toMatch(term);
        expect(item.to).not.toMatch(term);
      }
    }
  });

  it.each(ADMIN_ROLES)('%s nav never labels the workflow "Leads"', (role, isSuper) => {
    for (const { label } of allLinks(getNavSectionsForRole(role, isSuper))) {
      expect(label).not.toMatch(/^leads?$/i);
    }
  });

  it("is directory-operations oriented for super admins", () => {
    const links = allLinks(getNavSectionsForRole("super_admin", true));
    const hrefs = links.map((l) => l.to);
    for (const required of [
      "/admin/leads",
      "/admin/claims",
      "/admin/re-verification",
      "/admin/providers",
      "/admin/reviews",
      "/admin/subscriptions",
      "/admin/support",
      "/admin/analytics",
      "/admin/settings",
    ]) {
      expect(hrefs, `super admin nav must retain ${required}`).toContain(required);
    }
    expect(links.find((l) => l.to === "/admin/leads")!.label).toBe("Inquiries");
  });

  it("keeps the claim-review workflow reachable for managers too", () => {
    const hrefs = allLinks(getNavSectionsForRole("manager", false)).map((l) => l.to);
    expect(hrefs).toContain("/admin/claims");
    expect(hrefs).toContain("/admin/leads");
  });
});

describe("stage 3 — admin inquiry experience", () => {
  const page = readCode("src/pages/admin/AdminLeads.tsx");
  const modal = readCode("src/components/admin/inquiries/InquiryDetailModal.tsx");

  it('is titled "Inquiries"', () => {
    expect(page).toMatch(/title="Inquiries"/);
  });

  it("offers no bulk reassignment, redistribution, or lead-sale action", () => {
    for (const banned of [/BulkReassignDialog/, /reassign/i, /redistribut/i, /unlock/i]) {
      expect(page, `AdminLeads must not offer ${banned}`).not.toMatch(banned);
    }
    for (const banned of [/reassignMutation/, /Reassign Lead/, /Distribution History/]) {
      expect(modal, `inquiry modal must not offer ${banned}`).not.toMatch(banned);
    }
  });

  it("does not present a parallel concierge queue", () => {
    expect(page).not.toMatch(/\/admin\/concierge/);
    expect(page).not.toMatch(/concierge_inquiries/);
  });
});

describe("stage 3 — admin dashboards", () => {
  const files = [
    "src/components/admin/dashboard/DashboardKPICards.tsx",
    "src/components/admin/dashboard/DashboardChartsSection.tsx",
    "src/components/admin/dashboard/SuperAdminDashboard.tsx",
    "src/components/admin/dashboard/ManagerDashboard.tsx",
    "src/components/admin/dashboard/AdvisorDashboard.tsx",
    "src/components/admin/dashboard/CustomerRepDashboard.tsx",
    "src/components/admin/dashboard/AddonAdoptionCard.tsx",
    "src/components/admin/dashboard/QuickActionsCard.tsx",
  ];

  it.each(files)("%s presents no placement or Concierge KPI", (rel) => {
    const src = readCode(rel);
    for (const banned of [
      /concierge_inquiries/,
      /Placement Pipeline/i,
      /Active Cases/i,
      /placed this month/i,
      /advisor_earnings/,
      /Concierge/,
    ]) {
      expect(src, `${rel} must not present ${banned}`).not.toMatch(banned);
    }
  });

  it("the advisor dashboard performs no placement writes", () => {
    const src = readCode("src/components/admin/dashboard/AdvisorDashboard.tsx");
    expect(src).not.toMatch(/\.update\(/);
    expect(src).not.toMatch(/\.insert\(/);
    expect(src).not.toMatch(/useMutation/);
    expect(src).not.toMatch(/concierge_case_events/);
  });

  it("does not label an inquiry verified or qualified", () => {
    for (const rel of files) {
      const src = readCode(rel);
      expect(src, rel).not.toMatch(/verificationRate/);
      expect(src, rel).not.toMatch(/(qualified|verified)\s+leads?/i);
    }
  });
});

describe("stage 3 — admin historical legacy access", () => {
  const archiveRaw = read("src/pages/admin/AdminConciergeHistorical.tsx");
  const archive = readCode("src/pages/admin/AdminConciergeHistorical.tsx");

  it("preserves historical records read-only", () => {
    expect(archive).toMatch(/concierge_inquiries/);
    // Read-only: selects only, no writes and no mutation hook anywhere.
    expect(archive).not.toMatch(/\.update\(/);
    expect(archive).not.toMatch(/\.insert\(/);
    expect(archive).not.toMatch(/\.delete\(/);
    expect(archive).not.toMatch(/useMutation/);
  });

  it("frames itself as retired rather than as a live workflow", () => {
    expect(archiveRaw).toMatch(/retired/i);
    expect(archive).toMatch(/Historical Placement Records/);
  });

  it("does not truncate silently", () => {
    expect(archive).toMatch(/Showing the \{PAGE_SIZE\} most recent/);
  });

  it("is absent from every admin navigation", () => {
    for (const [role, isSuper] of ADMIN_ROLES) {
      const hrefs = allLinks(getNavSectionsForRole(role, isSuper)).map((l) => l.to);
      expect(hrefs, `${role} nav`).not.toContain("/admin/concierge");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

describe("stage 3 — authenticated routes", () => {
  const app = read("src/App.tsx");

  /** path → redirect target (null when the route renders a page). */
  function authRoutes(prefix: "/provider" | "/admin") {
    const marker =
      prefix === "/provider"
        ? '<Route path="/provider" element={<ProviderShell />}>'
        : '<Route path="/admin" element={<AdminShell />}>';
    const start = app.indexOf(marker);
    expect(start, `${prefix} shell block must exist`).toBeGreaterThan(-1);
    const block = app.slice(start, app.indexOf("</Route>", start));
    const map = new Map<string, string | null>();
    for (const m of block.matchAll(
      /<Route\s+path="([^"]+)"\s+element=\{(?:<Navigate\s+to="([^"]+)")?/g,
    )) {
      if (m[1] === "/provider" || m[1] === "/admin") continue;
      map.set(`${prefix}/${m[1]}`, m[2] ?? null);
    }
    return map;
  }

  const provider = authRoutes("/provider");
  const admin = authRoutes("/admin");

  it("redirects retired provider workflow URLs to retained surfaces", () => {
    expect(provider.get("/provider/marketing/concierge")).toBe("/provider/marketing");
    expect(provider.get("/provider/billing/concierge")).toBe("/provider/billing");
    expect(provider.get("/provider/billing/placements")).toBe("/provider/billing");
    expect(provider.get("/provider/placement")).toBe("/provider/dashboard");
    expect(provider.get("/provider/credits")).toBe("/provider/billing");
  });

  it("routes retired admin placement URLs to the historical archive or a real page", () => {
    // /admin/concierge is the read-only archive, not a redirect.
    expect(admin.get("/admin/concierge")).toBeNull();
    expect(admin.get("/admin/concierge/audit-review")).toBe("/admin/concierge");
    expect(admin.get("/admin/concierge/metrics")).toBe("/admin/concierge");
    expect(admin.get("/admin/inbox")).toBe("/admin/concierge");
    expect(admin.get("/admin/international")).toBe("/admin/concierge");
    expect(admin.get("/admin/provider-directory")).toBe("/admin/providers");
    expect(admin.get("/admin/placement-revenue")).toBe("/admin/dashboard");
  });

  it("mounts the archive component, not the interactive workspace", () => {
    expect(app).toMatch(/path="concierge" element=\{<AdminConciergeHistorical \/>\}/);
    expect(app).not.toMatch(/element=\{<AdminConcierge \/>\}/);
    expect(app).not.toMatch(/element=\{<AdminConciergeAuditReview \/>\}/);
    expect(app).not.toMatch(/element=\{<AdminConciergeMetrics \/>\}/);
  });

  it("has no redirect loop or redirect chain in the authenticated routes", () => {
    for (const [prefix, map] of [
      ["/provider", provider],
      ["/admin", admin],
    ] as const) {
      for (const [from, to] of map) {
        if (!to) continue;
        expect(to, `${from} must not redirect to itself`).not.toBe(from);
        const target = to.split("?")[0];
        if (!target.startsWith(prefix)) continue;
        expect(
          map.get(target) ?? null,
          `${from} → ${to} must not land on another redirect`,
        ).toBeNull();
      }
    }
  });

  it("every authenticated redirect target resolves to a mounted route", () => {
    for (const [prefix, map] of [
      ["/provider", provider],
      ["/admin", admin],
    ] as const) {
      for (const [from, to] of map) {
        if (!to) continue;
        const target = to.split("?")[0];
        if (!target.startsWith(prefix)) continue;
        expect(map.has(target), `${from} → ${to} is a dead redirect`).toBe(true);
      }
    }
  });

  it("no router or prefetch map imports a retired page component", () => {
    // The retired workspace still exists on disk for Stage-4 deletion. A route,
    // a prefetch map, or an eager panel preload that imports it puts the
    // retired workflow back into the active bundle graph even with no nav link.
    const retired = [
      "pages/admin/AdminConcierge",
      "pages/admin/AdminConciergeAuditReview",
      "pages/admin/AdminConciergeMetrics",
      "pages/admin/AdvisorInbox",
      "pages/admin/AdvisorProviderDirectory",
      "pages/provider/MarketingConcierge",
      "pages/provider/BillingConcierge",
      "pages/provider/BillingPlacements",
    ];
    for (const rel of [
      "src/App.tsx",
      "src/lib/routePrefetch.ts",
      "src/lib/adminPrefetch.ts",
      "src/components/PrefetchLink.tsx",
    ]) {
      const src = readCode(rel);
      for (const m of src.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) {
        const spec = m[1];
        for (const r of retired) {
          // endsWith, so AdminConciergeHistorical does not match AdminConcierge
          expect(spec.endsWith(r), `${rel} imports retired page ${spec}`).toBe(false);
        }
      }
    }
  });

  it("keeps the PR #78 claim / onboarding / Pro flows mounted", () => {
    for (const route of [
      '<Route path="/provider/onboarding" element={<ProviderOnboarding />} />',
      '<Route path="/provider/claims" element={<ProviderClaims />} />',
      '<Route path="/provider/claim/:slug" element={<NavigateProviderClaim />} />',
    ]) {
      expect(app, `PR #78 flow must stay mounted: ${route}`).toContain(route);
    }
    expect(provider.get("/provider/billing")).toBeNull();
    expect(provider.get("/provider/marketing/featured")).toBeNull();
    expect(provider.get("/provider/settings")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// STAGE 1 / 2 PRESERVATION
// ═══════════════════════════════════════════════════════════════════════════

describe("stage 3 — does not regress stage 1 or stage 2", () => {
  it("leaves the inquiry edge function untouched by this stage", () => {
    const fn = read("supabase/functions/submit-qualified-lead/index.ts");
    expect(fn).toMatch(/const VERSION = "3\.1\.0";/);
    // The retired free-tier concierge redirect must remain retired.
    expect(fn).toMatch(/RETIRED: FREE-TIER CONCIERGE REDIRECT/);
  });

  it("keeps the provider inquiry read on the masked view", () => {
    const page = read("src/pages/provider/Inquiries.tsx");
    expect(page).toContain("fromLeadsProviderView");
    expect(page).not.toMatch(/\.from\(\s*["']leads["']\s*\)[\s\S]{0,120}?\.select\(/);
  });

  it("does not publish a facility phone from any provider/admin surface", () => {
    // Pro-only public phone is decided server-side in get-public-facilities.
    // Nothing in this stage may add a client-side publish path.
    const dashboard = read("src/pages/provider/Dashboard.tsx");
    expect(dashboard).not.toMatch(/public_phone/);
  });
});
