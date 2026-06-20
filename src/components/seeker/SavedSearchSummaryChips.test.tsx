/**
 * Regression guard for the saved-search criteria preview.
 *
 * Bug: searches saved from inside the account panel (SeekerSearch) persist
 * criteria with short keys ({ q, loc, t, ft, ins, g, v }), but SummaryChips
 * only understood the public SearchResults long-key shape. The result was that
 * a fully-filtered in-panel save rendered as "All facilities (no filters)".
 *
 * These tests lock in that BOTH key shapes render their real filters.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryChips } from "./SavedSearchSummaryChips";

describe("SummaryChips", () => {
  it("renders chips for in-panel (short-key) criteria", () => {
    render(
      <SummaryChips
        criteria={{
          q: "detox",
          loc: "Portland, OR",
          t: ["residential"],
          ft: ["inpatient"],
          ins: ["aetna"],
          g: ["female"],
          v: true,
          sort: "proximity",
        }}
      />
    );

    expect(screen.queryByText(/no filters/i)).toBeNull();
    expect(screen.getByText("detox")).toBeInTheDocument();
    expect(screen.getByText("Portland, OR")).toBeInTheDocument();
    expect(screen.getByText("residential")).toBeInTheDocument();
    expect(screen.getByText("inpatient")).toBeInTheDocument();
    expect(screen.getByText("aetna")).toBeInTheDocument();
    expect(screen.getByText("female")).toBeInTheDocument();
    expect(screen.getByText("Verified only:")).toBeInTheDocument();
  });

  it("renders chips for public (long-key) criteria", () => {
    render(
      <SummaryChips
        criteria={{
          location: "Austin, TX",
          state: "TX",
          treatmentTypes: ["outpatient"],
          insuranceTypes: ["cigna"],
          amenities: ["pool"],
          distance: "25",
          verified: true,
          featuredOnly: true,
        }}
      />
    );

    expect(screen.queryByText(/no filters/i)).toBeNull();
    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("TX")).toBeInTheDocument();
    expect(screen.getByText("outpatient")).toBeInTheDocument();
    expect(screen.getByText("cigna")).toBeInTheDocument();
    expect(screen.getByText("pool")).toBeInTheDocument();
    expect(screen.getByText("25 mi")).toBeInTheDocument();
  });

  it("shows the no-filters message only when there are genuinely no filters", () => {
    // `sort` is ordering, not a filter, so it must not produce a chip.
    render(<SummaryChips criteria={{ sort: "proximity" }} />);
    expect(screen.getByText(/no filters/i)).toBeInTheDocument();
  });

  it("merges treatment values from both shapes without dropping any", () => {
    render(<SummaryChips criteria={{ treatmentTypes: ["a"], t: ["b"], treatment: "c" }} />);
    expect(screen.getByText("a, b, c")).toBeInTheDocument();
  });
});
