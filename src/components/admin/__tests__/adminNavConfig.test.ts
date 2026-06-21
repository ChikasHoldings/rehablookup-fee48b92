import { describe, it, expect } from "vitest";
import {
  getNavSectionsForRole,
  isNavGroup,
  type NavSection,
} from "../adminNavConfig";

/**
 * Super-admin-only permission keys. The admin route guard
 * (useAdminAuth.canAccessRoute) only grants these routes to super admins, so a
 * lower-tier admin nav tree must NOT surface links to them — otherwise a
 * manager / customer_rep / advisor sees a nav item that dead-ends on
 * <AccessDenied/>.
 *
 * Regression guard for the admin hardening pass: the managerNav "Staff
 * Management" → /admin/users (permission "users") entry was removed because
 * managers lack the `users` permission by default.
 */
const SUPER_ONLY_PERMISSIONS = [
  "users",
  "audit_log",
  "security_logs",
  "back_office",
  "settings",
];

function allPermissions(sections: NavSection[]): string[] {
  const perms: string[] = [];
  for (const section of sections) {
    for (const entry of section.entries) {
      if (isNavGroup(entry)) {
        perms.push(entry.permission, ...entry.items.map((i) => i.permission));
      } else {
        perms.push(entry.permission);
      }
    }
  }
  return perms;
}

function allLinks(sections: NavSection[]): string[] {
  const links: string[] = [];
  for (const section of sections) {
    for (const entry of section.entries) {
      if (isNavGroup(entry)) {
        links.push(...entry.items.map((i) => i.to));
      } else {
        links.push(entry.to);
      }
    }
  }
  return links;
}

describe("adminNavConfig — lower-tier nav must not expose super-admin-only routes", () => {
  for (const role of ["manager", "advisor", "customer_rep"] as const) {
    it(`${role} nav contains no super-admin-only permission keys`, () => {
      const perms = allPermissions(getNavSectionsForRole(role, false));
      const leaked = perms.filter((p) => SUPER_ONLY_PERMISSIONS.includes(p));
      expect(leaked).toEqual([]);
    });
  }

  it("manager nav no longer links to Admin Staff management (/admin/users)", () => {
    expect(allLinks(getNavSectionsForRole("manager", false))).not.toContain(
      "/admin/users",
    );
  });

  it("super admin retains full access (Admin Staff + audit log + settings)", () => {
    const perms = allPermissions(getNavSectionsForRole("super_admin", true));
    expect(perms).toContain("users");
    expect(perms).toContain("audit_log");
    expect(perms).toContain("settings");
  });
});
