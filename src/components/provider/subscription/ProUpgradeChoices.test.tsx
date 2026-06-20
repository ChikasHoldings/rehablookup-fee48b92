/**
 * Regression guard for the Pro-upgrade double-click protection.
 *
 * Bug: the Pro upgrade (checkout) buttons had no disabled/in-flight state, so a
 * double-click could launch two create-checkout-session calls. The Billing page
 * now passes a `busy` interval; both buttons must disable while it's set.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProUpgradeChoices } from "./ProUpgradeChoices";

const renderIt = (busy: "monthly" | "annual" | null = null) =>
  render(
    <MemoryRouter>
      <ProUpgradeChoices onChoose={vi.fn()} busy={busy} />
    </MemoryRouter>
  );

describe("ProUpgradeChoices double-click guard", () => {
  it("enables both choose buttons when idle", () => {
    renderIt(null);
    expect(screen.getByRole("button", { name: /Choose Pro Monthly/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Choose Pro Annual/i })).toBeEnabled();
  });

  it("disables BOTH buttons (and shows progress) while a checkout is launching", () => {
    renderIt("monthly");
    // Chosen button shows progress and is disabled...
    expect(screen.getByRole("button", { name: /Redirecting/i })).toBeDisabled();
    // ...and the OTHER interval is disabled too, so a second session can't start.
    expect(screen.getByRole("button", { name: /Choose Pro Annual/i })).toBeDisabled();
  });
});
