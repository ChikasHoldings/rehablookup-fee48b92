import { describe, it, expect } from "vitest";
import { facilityRoleFlags, type FacilityRole } from "@/lib/facilityRole";

// Regression guard for the provider RBAC permission matrix used for UI gating.
// canEdit must equal the backend user_can_edit_facility set (owner|manager);
// viewers are strictly read-only; null = no access.
describe("facilityRoleFlags — provider permission matrix", () => {
  it("owner can edit and is flagged owner", () => {
    const f = facilityRoleFlags("owner");
    expect(f).toMatchObject({ isOwner: true, isManager: false, isViewer: false, canEdit: true });
  });

  it("manager can edit but is not owner", () => {
    const f = facilityRoleFlags("manager");
    expect(f).toMatchObject({ isOwner: false, isManager: true, isViewer: false, canEdit: true });
  });

  it("viewer is read-only (cannot edit)", () => {
    const f = facilityRoleFlags("viewer");
    expect(f).toMatchObject({ isOwner: false, isManager: false, isViewer: true, canEdit: false });
  });

  it("null role has no access and cannot edit", () => {
    const f = facilityRoleFlags(null);
    expect(f).toMatchObject({ isOwner: false, isManager: false, isViewer: false, canEdit: false });
  });

  it("only owner and manager ever get canEdit", () => {
    const roles: FacilityRole[] = ["owner", "manager", "viewer", null];
    const canEdit = roles.filter((r) => facilityRoleFlags(r).canEdit);
    expect(canEdit).toEqual(["owner", "manager"]);
  });
});
