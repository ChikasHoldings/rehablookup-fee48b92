import { describe, it, expect } from "vitest";
import {
  getNavSectionsForRole,
  getMobileNavForRole,
  isNavGroup,
  type NavSection,
} from "../adminNavConfig";

/**
 * Every admin route mounted under <AdminShell /> in src/App.tsx. Mirrored here
 * (not imported, to keep the test self-contained and free of the router/
 * supabase import chain). Update this set when an admin <Route> is added or
 * removed. A nav link that is NOT in this set is a DEAD LINK — it would render
 * the public 404 catch-all instead of an admin page.
 */
const KNOWN_ADMIN_ROUTES = new Set<string>([
  "/admin",
  "/admin/leads",
  "/admin/insurance-verifications",
  "/admin/re-verification",
  "/admin/providers",
  "/admin/seekers",
  "/admin/concierge",
  "/admin/subscriptions",
  "/admin/support",
  "/admin/reviews",
  "/admin/escalations",
  "/admin/marketing",
  "/admin/blog",
  "/admin/analytics",
  "/admin/users",
  "/admin/back-office",
  "/admin/email-logs",
  "/admin/security-logs",
  "/admin/audit-log",
  "/admin/not-found-events",
  "/admin/settings",
  "/admin/notifications",
]);

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

describe("adminNavConfig — no dead or duplicate nav links", () => {
  const roleCases = [
    ["super_admin", true],
    ["manager", false],
    ["advisor", false],
    ["customer_rep", false],
  ] as const;

  for (const [role, isSuper] of roleCases) {
    it(`${role} desktop nav links all resolve to a real admin route`, () => {
      const links = allLinks(getNavSectionsForRole(role, isSuper));
      const dead = links.filter((to) => !KNOWN_ADMIN_ROUTES.has(to));
      expect(dead).toEqual([]);
    });

    it(`${role} mobile nav links all resolve to a real admin route`, () => {
      const mobileLinks = getMobileNavForRole(role, isSuper).flatMap((s) =>
        s.items.map((i) => i.to),
      );
      const dead = mobileLinks.filter((to) => !KNOWN_ADMIN_ROUTES.has(to));
      expect(dead).toEqual([]);
    });

    it(`${role} nav has no duplicate links`, () => {
      const links = allLinks(getNavSectionsForRole(role, isSuper));
      expect(links.length).toBe(new Set(links).size);
    });
  }
});

/**
 * Mirror of routePermissionMap in useAdminAuth.ts (kept here, not imported, for
 * the same reason as KNOWN_ADMIN_ROUTES — to avoid the hook's supabase/router
 * import chain). Update this when routePermissionMap changes.
 *
 * canAccessRoute is now FAIL-CLOSED: an /admin route with no permission mapping
 * is denied for every non-super tier (previously it fell through to "allow").
 * So every mounted admin route MUST resolve to a permission key here (directly
 * or via a longest-prefix match), or lower tiers would hit a false
 * AccessDenied.
 */
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/admin": "dashboard",
  "/admin/dashboard": "dashboard",
  "/admin/analytics": "analytics",
  "/admin/providers": "providers",
  "/admin/leads": "leads",
  "/admin/seekers": "seekers",
  "/admin/subscriptions": "subscriptions",
  "/admin/featured": "featured",
  "/admin/users": "users",
  "/admin/audit-log": "audit_log",
  "/admin/settings": "settings",
  "/admin/notifications": "notifications",
  "/admin/profile": "dashboard",
  "/admin/reviews": "reviews",
  "/admin/concierge": "placements",
  "/admin/support": "support",
  "/admin/placement-revenue": "placements",
  "/admin/credentials": "providers",
  "/admin/security-logs": "security_logs",
  "/admin/marketing": "leads",
  "/admin/blog": "providers",
  "/admin/international": "placements",
  "/admin/inbox": "placements",
  "/admin/escalations": "escalations",
  "/admin/back-office": "back_office",
  "/admin/provider-directory": "placements",
  "/admin/email-logs": "security_logs",
  "/admin/insurance-verifications": "leads",
  "/admin/re-verification": "providers",
  "/admin/not-found-events": "audit_log",
  "/admin/claims": "providers",
};

function resolveRoutePermission(pathname: string): string | undefined {
  if (ROUTE_PERMISSION_MAP[pathname]) return ROUTE_PERMISSION_MAP[pathname];
  const sorted = Object.entries(ROUTE_PERMISSION_MAP)
    .filter(([route]) => route !== "/admin")
    .sort((a, b) => b[0].length - a[0].length);
  for (const [route, perm] of sorted) {
    if (pathname.startsWith(route)) return perm;
  }
  return undefined;
}

describe("admin route guard — fail-closed completeness", () => {
  it("every mounted admin route resolves to a permission key (no fail-closed dead-end)", () => {
    const unmapped = [...KNOWN_ADMIN_ROUTES].filter(
      (route) => !resolveRoutePermission(route),
    );
    expect(unmapped).toEqual([]);
  });
});

describe("adminNavConfig — advisor Escalations dead-end (D4 regression)", () => {
  // Advisors are `escalations: false` by default, so an Escalations nav link
  // would route to /admin/escalations and immediately hit AccessDenied. The
  // advisor "Tools" section was removed for this reason.
  it("advisor nav does not link to /admin/escalations", () => {
    expect(allLinks(getNavSectionsForRole("advisor", false))).not.toContain(
      "/admin/escalations",
    );
  });

  it("customer_rep nav still links to /admin/escalations (reps are escalations:true)", () => {
    expect(allLinks(getNavSectionsForRole("customer_rep", false))).toContain(
      "/admin/escalations",
    );
  });
});
