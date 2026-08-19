/**
 * PHASE 3A — RESULT CARD DATA TRUTH.
 *
 * The card is where a claim reaches the visitor as a fact about a specific
 * facility, so its copy is held to what the record actually establishes:
 *
 *   • `insuranceAccepted` is a MIXED list — payers, public programs and
 *     payment methods. "N Insurance Plans" asserted that every entry was an
 *     insurance plan and that the facility was in network with it.
 *   • The secondary CTA runs an EXACT-CITY search. Labelling it "Nearby" /
 *     "See Centers Nearby" promised a radius the catalogue cannot measure
 *     (no coordinates) and described the wrong query besides.
 *   • The location-relation badge is only attached when a location was
 *     explicitly searched; when it is shown it describes the SEARCHED place,
 *     not "your" city.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: async () => ({ data: null, error: null }) } },
}));
vi.mock("@/lib/analytics", () => ({
  analytics: new Proxy({}, { get: () => () => {} }),
  trackEvent: () => {},
}));
vi.mock("@/hooks/useProviderEventTracking", () => ({
  useProviderEventTracking: () => ({ trackImpression: () => {}, trackClickToCall: () => {} }),
}));
vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({ toggleFavorite: () => {}, isFavorite: () => false }),
}));
vi.mock("@/components/comparison/CompareButton", () => ({ CompareButton: () => null }));
vi.mock("@/components/profile/RequestInfoModal", () => ({ RequestInfoModal: () => null }));

const { SearchResultCard } = await import("@/components/cards/SearchResultCard");

type CardCenter = Parameters<typeof SearchResultCard>[0]["center"];

const center = (over: Partial<CardCenter> = {}): CardCenter =>
  ({
    id: "f1",
    name: "Lakeshore Recovery",
    slug: "lakeshore-recovery",
    city: "Los Angeles",
    state: "CA",
    description: "Adult treatment programming.",
    treatmentTypes: ["Detox"],
    insuranceAccepted: ["Aetna", "Medicaid", "Self-Pay/Private Pay"],
    verified: false,
    featured: false,
    isFromDatabase: true,
    ...over,
  }) as CardCenter;

const renderCard = (over: Partial<CardCenter> = {}, featured = false) =>
  render(
    <MemoryRouter>
      <SearchResultCard center={center(over)} featured={featured} />
    </MemoryRouter>,
  );

const bodyText = () => (document.body.textContent ?? "").replace(/\s+/g, " ");

describe("SearchResultCard — payment / insurance wording", () => {
  it("44. never says 'Insurance Plans'", () => {
    renderCard();
    expect(bodyText()).not.toMatch(/insurance plans/i);
  });

  it("never claims acceptance, coverage or network participation", () => {
    renderCard();
    const text = bodyText();
    for (const forbidden of [
      /accepted plans/i,
      /in-network/i,
      /covered by/i,
      /we accept/i,
      /accepts your insurance/i,
    ]) {
      expect(text).not.toMatch(forbidden);
    }
  });

  it("45. counts payment / insurance OPTIONS, matching the stored list length", () => {
    renderCard();
    expect(screen.getByText(/3 payment \/ insurance options/i)).toBeTruthy();
  });

  it("uses the singular form for a single option", () => {
    renderCard({ insuranceAccepted: ["Medicaid"] });
    expect(screen.getByText(/1 payment \/ insurance option$/i)).toBeTruthy();
  });

  it("shows no payment badge at all when the record carries no options", () => {
    renderCard({ insuranceAccepted: [] });
    expect(bodyText()).not.toMatch(/payment \/ insurance/i);
  });

  it("counts a payment METHOD the same as a payer — it does not filter the list", () => {
    // Self-Pay and Sliding Scale are payment methods, not carriers. They are
    // counted because the badge counts options, not plans.
    renderCard({ insuranceAccepted: ["Self-Pay/Private Pay", "Sliding Scale/Financial Assistance"] });
    expect(screen.getByText(/2 payment \/ insurance options/i)).toBeTruthy();
  });
});

describe("SearchResultCard — the secondary CTA is an exact-city search", () => {
  it("46. never says 'Nearby' or 'See Centers Nearby'", () => {
    renderCard();
    const text = bodyText();
    expect(text).not.toMatch(/\bnear(by|est)?\b/i);
    expect(text).not.toMatch(/\bclosest\b/i);
    expect(text).not.toMatch(/within\s+\d+\s*mi/i);
  });

  it("names the exact city in the visible copy", () => {
    renderCard();
    expect(screen.getByText(/see more in Los Angeles/i)).toBeTruthy();
  });

  it("47. links to an EXACT city, state search", () => {
    renderCard();
    const link = screen.getByRole("link", { name: /see more treatment centers in Los Angeles, CA/i });
    expect(link.getAttribute("href")).toBe(
      `/search-results?location=${encodeURIComponent("Los Angeles, CA")}`,
    );
  });

  it("carries no distance semantics in its accessible name", () => {
    renderCard();
    const link = screen.getByRole("link", { name: /see more treatment centers in/i });
    expect(link.getAttribute("aria-label")).not.toMatch(/near|mile|distance/i);
  });
});

describe("SearchResultCard — location-relation badge", () => {
  it("48. renders NO location badge when the page attached no tier", () => {
    // The page only attaches `_proximityTier` for an EXPLICIT location
    // search, so a geo-IP-only visit produces an unannotated card.
    renderCard();
    const text = bodyText();
    expect(text).not.toMatch(/exact location match/i);
    expect(text).not.toMatch(/in searched (city|state)/i);
    expect(text).not.toMatch(/in your (city|state)/i);
  });

  it("49. renders a factual, search-relative badge when a tier IS attached", () => {
    renderCard({ _proximityTier: "city" } as Partial<CardCenter>);
    expect(screen.getByText(/in searched city/i)).toBeTruthy();
  });

  it("never phrases the searched place as the user's own", () => {
    for (const tier of ["exact", "city", "state", "nearby"] as const) {
      const { unmount } = renderCard({ _proximityTier: tier } as Partial<CardCenter>);
      expect(bodyText()).not.toMatch(/\byour (city|state)\b/i);
      unmount();
    }
  });

  it("labels the adjacent-state tier as a neighbour, never as a distance", () => {
    renderCard({ _proximityTier: "nearby" } as Partial<CardCenter>);
    expect(screen.getByText(/neighboring state/i)).toBeTruthy();
    expect(bodyText()).not.toMatch(/\bnearby\b/i);
  });
});

describe("SearchResultCard — behaviour unchanged by Phase 3A", () => {
  it("50. still renders the Featured badge for a featured listing, and only then", () => {
    const { unmount } = renderCard({}, true);
    expect(screen.getByLabelText(/featured treatment center/i)).toBeTruthy();
    unmount();

    renderCard({}, false);
    expect(screen.queryByLabelText(/featured treatment center/i)).toBeNull();
  });

  it("51. still withholds the phone number for a non-Pro listing", () => {
    renderCard({ phone: "555-123-4567" } as Partial<CardCenter>);
    expect(screen.queryByRole("link", { name: /^Call /i })).toBeNull();
  });

  it("51b. still publishes the phone number for an active-Pro listing", () => {
    renderCard({ phone: "555-123-4567", isPro: true } as Partial<CardCenter>);
    expect(screen.getByRole("link", { name: /^Call /i })).toBeTruthy();
  });

  it("still renders the Verified badge only for a verified record", () => {
    const { unmount } = renderCard({ verified: true });
    expect(screen.getByText(/verified provider/i)).toBeTruthy();
    unmount();

    renderCard({ verified: false });
    expect(screen.queryByText(/verified provider/i)).toBeNull();
  });
});
