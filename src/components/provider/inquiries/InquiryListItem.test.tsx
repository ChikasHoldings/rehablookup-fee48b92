import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InquiryListItem } from "./InquiryListItem";

/**
 * Verifies the lead inbox card on /provider/inquiries:
 *   1. Locked leads are visible to the facility owner (so they can decide to unlock).
 *   2. PII (name + phone) stays masked until the lead is unlocked.
 *
 * This protects the core PII-until-unlock contract enforced by RLS at the DB
 * layer (leads_provider_view) and mirrored at the UI layer here.
 */

const baseInquiry = {
  id: "lead-1",
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "(555) 867-5309",
  location_city_state: "Austin, TX",
  level_of_care: "Inpatient Detox",
  urgency: "Urgent",
  inquiry_type: "request_info" as const,
  provider_response_status: null,
  created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
  message: "Looking for help",
  source: "direct",
};

describe("InquiryListItem (provider inquiries inbox)", () => {
  it("shows a locked lead to the facility owner with non-PII fields visible", () => {
    render(
      <InquiryListItem
        inquiry={baseInquiry}
        isUnlocked={false}
        isSelected={false}
        onClick={() => {}}
      />
    );

    // Non-PII context the owner needs to decide whether to unlock
    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("Inpatient Detox")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();

    // Locked status indicator is present
    expect(screen.getByTitle("Locked")).toBeInTheDocument();
  });

  it("masks PII (phone) when the lead is locked", () => {
    render(
      <InquiryListItem
        inquiry={baseInquiry}
        isUnlocked={false}
        isSelected={false}
        onClick={() => {}}
      />
    );

    // Phone must be replaced with the masked placeholder
    expect(screen.getByText("(•••) •••-••••")).toBeInTheDocument();
    expect(screen.queryByText(baseInquiry.phone)).not.toBeInTheDocument();

    // Name is still rendered (so layout is stable) but inside a blurred span
    const nameEl = screen.getByText(baseInquiry.name);
    expect(nameEl).toBeInTheDocument();
    expect(nameEl.className).toMatch(/blur-/);
    expect(nameEl.className).toMatch(/select-none/);
  });

  it("reveals PII only after the lead is unlocked", () => {
    render(
      <InquiryListItem
        inquiry={baseInquiry}
        isUnlocked={true}
        isSelected={false}
        onClick={() => {}}
      />
    );

    // Real phone is shown, masked placeholder is not
    expect(screen.getByText(baseInquiry.phone)).toBeInTheDocument();
    expect(screen.queryByText("(•••) •••-••••")).not.toBeInTheDocument();

    // Name is rendered without the blur/select-none mask
    const nameEl = screen.getByText(baseInquiry.name);
    expect(nameEl.className).not.toMatch(/blur-/);
    expect(nameEl.className).not.toMatch(/select-none/);

    // Locked indicator is no longer present
    expect(screen.queryByTitle("Locked")).not.toBeInTheDocument();
  });
});
