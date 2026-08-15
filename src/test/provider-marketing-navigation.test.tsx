/**
 * R8 — A provider must always be able to reach Featured management from the
 * Marketing navigation without passing through a Concierge route.
 *
 * Stage 1 audit flagged `/provider/marketing` as interacting with the
 * Concierge marketing area. Verifying against the source refined that:
 *   • `/provider/marketing` renders the real MarketingHub (NOT a redirect to
 *     Concierge, despite a stale comment in ProviderSidebar.tsx saying so);
 *   • the mobile bottom nav DOES hard-link straight to
 *     `/provider/marketing/concierge`;
 *   • the legacy `/provider/placement` tombstone redirects to
 *     `/provider/marketing/concierge`.
 *
 * The last two become dead links the moment Concierge is removed. This file
 * pins the current wiring so Stage 3 can retarget them deliberately, and locks
 * the invariant that must hold before AND after: Marketing → Featured works.
 *
 * The sidebar assertion renders the real component. The route assertions read
 * the real route table — mounting all ~2,000 routes to resolve one redirect
 * target is not a practical alternative, and the route table IS the contract.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const APP_TSX = readFileSync(resolve(__dirname, "../App.tsx"), "utf8");
const MOBILE_NAV_SRC = readFileSync(
  resolve(__dirname, "../components/provider/MobileBottomNav.tsx"),
  "utf8",
);
const HUB_CARDS_SRC = readFileSync(
  resolve(__dirname, "../components/provider/marketing/MarketingHubCards.tsx"),
  "utf8",
);

vi.mock("@/contexts/SelectedFacilityContext", () => ({
  useSelectedFacility: () => ({ selectedFacility: { id: "facility-1" } }),
}));
vi.mock("@/hooks/useProStatus", () => ({
  useProStatus: () => ({ data: { isPro: true } }),
}));
vi.mock("@/hooks/usePendingConciergeCount", () => ({
  usePendingConciergeCount: () => ({ count: 0 }),
}));
vi.mock("@/hooks/usePendingInquiriesCount", () => ({
  usePendingInquiriesCount: () => ({ count: 0 }),
}));
vi.mock("@/lib/routePrefetch", () => ({ prefetchRoute: vi.fn() }));

/** Extract the element expression for a nested provider route path. */
function providerRouteElement(path: string): string | null {
  const re = new RegExp(`<Route\\s+path="${path}"\\s+element=\\{([^}]*(?:\\}[^}]*)*?)\\}\\s*/>`);
  const m = re.exec(APP_TSX);
  return m ? m[1].trim() : null;
}

describe("R8 — Marketing entry point reaches Featured", () => {
  it("the rendered provider sidebar exposes a Marketing entry that is not a Concierge route", async () => {
    const { ProviderSidebar } = await import("@/components/provider/ProviderSidebar");
    render(
      <MemoryRouter>
        <ProviderSidebar />
      </MemoryRouter>,
    );

    // The Marketing item must be present and reachable.
    const marketing = screen.getByText("Marketing");
    expect(marketing).toBeInTheDocument();

    // No sidebar entry may point at a Concierge surface — the sidebar is the
    // primary provider navigation and must survive Concierge removal intact.
    const conciergeLinks = screen.queryAllByText(/concierge/i);
    expect(conciergeLinks).toHaveLength(0);
  });

  it("/provider/marketing renders the Marketing hub rather than redirecting", () => {
    const element = providerRouteElement("marketing");
    expect(element).toBeTruthy();
    expect(element).toContain("ProviderMarketingHub");
    // A <Navigate> here would mean the entry point is a redirect that could
    // point at a removed route.
    expect(element).not.toContain("Navigate");
  });

  it("/provider/marketing/featured is a real mounted route", () => {
    const element = providerRouteElement("marketing/featured");
    expect(element).toBeTruthy();
    expect(element).toContain("ProviderMarketingFeatured");
    expect(element).not.toContain("Navigate");
  });

  it("the Marketing hub links to Featured management", () => {
    // The hub is the only surface the sidebar reaches; if it stopped linking
    // to Featured the add-on would become unmanageable from navigation.
    expect(HUB_CARDS_SRC).toContain('to="/provider/marketing/featured"');
  });

  it("the legacy /provider/placements tombstone already lands on Featured", () => {
    const element = providerRouteElement("placements");
    expect(element).toContain("Navigate");
    expect(element).toContain("/provider/marketing/featured");
  });
});

/**
 * TEMPORARY CHARACTERIZATION — these two entry points target Concierge today
 * and MUST be retargeted in Stage 3, or they become dead links. Failing here
 * after a retarget is the expected signal to update this block.
 */
describe("R8 [characterization] — nav entry points that still target Concierge", () => {
  it("the mobile bottom nav hard-links to /provider/marketing/concierge", () => {
    expect(MOBILE_NAV_SRC).toContain('href: "/provider/marketing/concierge"');
  });

  it("the legacy /provider/placement tombstone redirects to the Concierge page", () => {
    const element = providerRouteElement("placement");
    expect(element).toContain("Navigate");
    expect(element).toContain("/provider/marketing/concierge");
  });
});

describe("R8 — no provider redirect points at a route that does not exist", () => {
  it("every /provider/* <Navigate> target resolves to a declared provider route", () => {
    // Guards the specific Stage-3 hazard: removing a Concierge page while a
    // tombstone still points at it. Today every target resolves; after Stage 3
    // this fails unless the tombstones are retargeted in the same change.
    const navTargets = [...APP_TSX.matchAll(/<Navigate to="(\/provider\/[^"]+)"/g)].map(
      (m) => m[1].split("?")[0],
    );
    expect(navTargets.length).toBeGreaterThan(0);

    const declaredProviderPaths = new Set(
      [...APP_TSX.matchAll(/<Route\s+path="([a-z0-9\-/:]+)"/g)].map((m) => `/provider/${m[1]}`),
    );
    // Absolute provider routes declared at the top level too.
    for (const m of APP_TSX.matchAll(/<Route\s+path="(\/provider\/[^"]+)"/g)) {
      declaredProviderPaths.add(m[1]);
    }

    const unresolved = navTargets.filter((t) => !declaredProviderPaths.has(t));
    expect(
      unresolved,
      `provider redirect targets with no matching route: ${unresolved.join(", ")}`,
    ).toEqual([]);
  });
});
