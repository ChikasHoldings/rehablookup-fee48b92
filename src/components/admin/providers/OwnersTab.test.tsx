/**
 * Render tests for the Admin › Providers › Owners tab.
 *
 * Proves the tab is fully wired end-to-end against a mocked
 * `admin_list_provider_owners` RPC: owner cards render account-level data,
 * the KPI strip counts the full owner set, and the "Facilities" action
 * deep-links back to the parent with the owner's id. The pure filter/sort/CSV
 * logic is covered separately in src/lib/__tests__/providerOwners.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ProviderOwnerRow } from "@/lib/providerOwners";

const mockState = {
  rpc: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockState.rpc(...args),
    // Realtime is best-effort; a chainable no-op channel is enough here.
    channel: () => {
      const ch: Record<string, unknown> = {};
      ch.on = () => ch;
      ch.subscribe = () => ch;
      return ch;
    },
    removeChannel: () => {},
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { OwnersTab } from "./OwnersTab";

function mkOwner(p: Partial<ProviderOwnerRow>): ProviderOwnerRow {
  return {
    user_id: p.user_id ?? crypto.randomUUID(),
    first_name: null, last_name: null, email: null, phone: null,
    created_at: "2026-01-01T00:00:00Z", email_verified_at: null, onboarding_completed_at: null,
    total_facilities: 0, live_count: 0, pending_count: 0, rejected_count: 0, suspended_count: 0,
    plan_state: "free", grace_expires_at: null, has_stripe_customer: false,
    last_facility_update: null, facility_names: null,
    ...p,
  };
}

function renderTab(rows: ProviderOwnerRow[], onView = vi.fn()) {
  mockState.rpc.mockResolvedValue({ data: rows, error: null });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OwnersTab onViewOwnerFacilities={onView} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onView };
}

describe("OwnersTab", () => {
  beforeEach(() => { mockState.rpc.mockReset(); });

  it("renders one card per owner with identity + plan", async () => {
    renderTab([
      mkOwner({ user_id: "a", first_name: "Ada", last_name: "Lovelace", email: "ada@x.com", plan_state: "pro", total_facilities: 3, live_count: 3, created_at: "2026-06-01T00:00:00Z" }),
      mkOwner({ user_id: "g", first_name: "Gwen", plan_state: "grace", grace_expires_at: "2026-08-01T00:00:00Z", total_facilities: 1, created_at: "2026-05-01T00:00:00Z" }),
    ]);
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Gwen")).toBeInTheDocument();
    expect(screen.getByText("ada@x.com")).toBeInTheDocument();
    // Grace is surfaced distinctly (never as Pro).
    expect(screen.getByText(/until/i)).toBeInTheDocument();
  });

  it("KPI strip counts the full owner set", async () => {
    renderTab([
      mkOwner({ user_id: "a", plan_state: "pro" }),
      mkOwner({ user_id: "b", plan_state: "pro" }),
      mkOwner({ user_id: "c", plan_state: "grace" }),
      mkOwner({ user_id: "d", plan_state: "past_due" }), // action needed
    ]);
    // Wait for the RPC-backed render.
    await screen.findByRole("button", { name: /All owners/i });
    const pro = screen.getByRole("button", { name: /Pro/i });
    expect(pro.textContent).toMatch(/2/);
    // "Action needed" is both a KPI tile (with a count) and the filter toggle;
    // assert the tile carries the count of 1 (the past_due owner).
    const actionButtons = screen.getAllByRole("button", { name: /Action needed/i });
    expect(actionButtons.some((b) => /1/.test(b.textContent ?? ""))).toBe(true);
  });

  it("the Facilities action deep-links to the parent with the owner id", async () => {
    const onView = vi.fn();
    renderTab([
      mkOwner({ user_id: "owner-42", first_name: "Pat", plan_state: "free", total_facilities: 2, live_count: 2 }),
    ], onView);
    const btn = await screen.findByRole("button", { name: /Facilities/i });
    await userEvent.click(btn);
    expect(onView).toHaveBeenCalledWith("owner-42", "Pat");
  });

  it("shows an empty state when there are no owners", async () => {
    renderTab([]);
    expect(await screen.findByText(/No provider owner accounts yet/i)).toBeInTheDocument();
  });
});
