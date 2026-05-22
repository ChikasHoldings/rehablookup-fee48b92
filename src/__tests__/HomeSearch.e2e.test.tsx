/**
 * Hero search form — submit behaviour
 *
 * What this covers
 * ────────────────
 * 1. Normal typing → navigate fires with correct URL.
 * 2. JS-set value  → navigate fires even when React state is stale because
 *    a browser extension / autofill / test automation set `input.value`
 *    directly without firing onChange (the controlled-input bypass).
 * 3. Empty submit  → navigate still fires (lands on /search-results with no
 *    location param; user always progresses).
 *
 * Why Vitest + jsdom (not Playwright)
 * ────────────────────────────────────
 * Playwright requires the dev server. These unit-level assertions run in CI
 * without a server and finish in <1s. The Playwright spec in
 * tests/visual/provider-auth-guard.spec.ts covers server-required behaviour.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// analytics is fire-and-forget; we don't want real network calls in tests.
vi.mock("@/lib/analytics", () => ({
  analytics: {
    search: vi.fn(),
    ctaClick: vi.fn(),
    formSubmit: vi.fn(),
  },
}));

// useZipcodeLookup makes Supabase network calls — stub it.
vi.mock("@/hooks/useZipcodeLookup", () => ({
  useZipcodeLookup: () => ({
    data: null,
    isLoading: false,
    error: null,
    lookup: vi.fn(),
    reset: vi.fn(),
  }),
}));

// LocationSuggestionsDropdown renders a portal + Supabase-backed list.
// For this test we only care about the form submission, not the dropdown.
vi.mock("@/components/search/LocationSuggestionsDropdown", () => ({
  LocationSuggestionsDropdown: () => null,
}));

// MultiSelectDropdown uses Radix UI portals that can flake in jsdom.
vi.mock("@/components/search/MultiSelectDropdown", () => ({
  MultiSelectDropdown: ({ label }: { label: string }) => (
    <span data-testid={`multi-select-${label}`} />
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

// Import AFTER mocks are registered (Vitest hoists vi.mock automatically).
import { SearchForm } from "@/components/search/SearchForm";

function renderForm(props: React.ComponentProps<typeof SearchForm> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SearchForm variant="directory" {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SearchForm hero (variant=directory) — submit behaviour", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("navigates with location param when user types a city (normal path)", async () => {
    renderForm();
    const input = screen.getByPlaceholderText("Enter city, state, or ZIP code");

    await userEvent.type(input, "Los Angeles, CA");
    await userEvent.click(screen.getByRole("button", { name: /search centers/i }));

    expect(mockNavigate).toHaveBeenCalledOnce();
    const calledUrl: string = mockNavigate.mock.calls[0][0];
    expect(calledUrl).toContain("/search-results");
    // URLSearchParams handles both %XX and + encoding correctly.
    const locationParam = new URLSearchParams(calledUrl.split("?")[1]).get("location");
    expect(locationParam).toBe("Los Angeles, CA");
  });

  it("navigates with location param when value is set via JS (controlled-input bypass)", async () => {
    // Simulates a browser extension / autofill that does
    //   element.value = "..."  without firing React's onChange.
    renderForm();
    const input = screen.getByPlaceholderText(
      "Enter city, state, or ZIP code",
    ) as HTMLInputElement;

    // Set the DOM value directly — React state stays "".
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      input,
      "Los Angeles, CA",
    );
    // Do NOT fire a change event — that's the point of this test.

    // Submit the form (simulates clicking the button).
    fireEvent.submit(input.closest("form")!);

    expect(mockNavigate).toHaveBeenCalledOnce();
    const calledUrl: string = mockNavigate.mock.calls[0][0];
    expect(calledUrl).toContain("/search-results");
    const locationParam = new URLSearchParams(calledUrl.split("?")[1]).get("location");
    expect(locationParam).toBe("Los Angeles, CA");
  });

  it("still navigates when submitted empty (lands on /search-results, no location param)", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: /search centers/i }));

    expect(mockNavigate).toHaveBeenCalledOnce();
    const calledUrl: string = mockNavigate.mock.calls[0][0];
    expect(calledUrl).toContain("/search-results");
  });

  it("respects a custom targetPath", async () => {
    renderForm({ targetPath: "/rehab-centers" });
    const input = screen.getByPlaceholderText("Enter city, state, or ZIP code");

    await userEvent.type(input, "Austin, TX");
    await userEvent.click(screen.getByRole("button", { name: /search centers/i }));

    expect(mockNavigate).toHaveBeenCalledOnce();
    const calledUrl: string = mockNavigate.mock.calls[0][0];
    expect(calledUrl).toContain("/rehab-centers");
    const locationParam = new URLSearchParams(calledUrl.split("?")[1]).get("location");
    expect(locationParam).toBe("Austin, TX");
  });
});
