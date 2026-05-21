import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  SuperAdminDashboard,
  ManagerDashboard,
  CustomerRepDashboard,
  AdvisorDashboard,
} from "@/components/admin/dashboard";
import { AdminDashboardSkeleton } from "@/components/admin/AdminPageLoading";

export default function AdminDashboard() {
  const { adminRole, isInitialized, isSuperAdmin, adminProfile } = useAdminAuth();

  // `isInitialized` flips to true the moment the cached `isAdmin=true`
  // boolean is read from localStorage — that's fast, but the actual role
  // fetch (`adminProfile`) is still in flight at that point. Without the
  // second gate here, `useAdminAuth` returns `adminRole='customer_rep'`
  // as its loading-state default (hook line 444), which would render the
  // CustomerRepDashboard for ~1s and then swap to the real dashboard
  // when the role lands — the visible "flash" admins reported on
  // 2026-05-21. Super-admin doesn't need the adminProfile row (their
  // role is resolved from `user_roles` directly), so the gate excludes
  // that case.
  if (!isInitialized || (!isSuperAdmin && !adminProfile)) {
    return <AdminDashboardSkeleton />;
  }

  // Render role-specific dashboard
  switch (adminRole) {
    case "super_admin":
      return <SuperAdminDashboard />;
    case "manager":
      return <ManagerDashboard />;
    case "customer_rep":
      return <CustomerRepDashboard />;
    case "advisor":
      return <AdvisorDashboard />;
    default:
      // Should be unreachable now that the gate above blocks render
      // until role is known. Keep skeleton (not CustomerRepDashboard)
      // so a stale enum value doesn't downgrade an admin's UI.
      return <AdminDashboardSkeleton />;
  }
}
