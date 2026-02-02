import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  SuperAdminDashboard,
  ManagerDashboard,
  CustomerRepDashboard,
  AdvisorDashboard,
} from "@/components/admin/dashboard";
import { AdminDashboardSkeleton } from "@/components/admin/AdminPageLoading";

export default function AdminDashboard() {
  const { adminRole, isInitialized } = useAdminAuth();

  // Show instant skeleton while auth is initializing
  if (!isInitialized) {
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
      // Fallback to customer rep dashboard for unknown roles
      return <CustomerRepDashboard />;
  }
}
