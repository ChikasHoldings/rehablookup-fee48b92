import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  SuperAdminDashboard,
  ManagerDashboard,
  CustomerRepDashboard,
  AdvisorDashboard,
} from "@/components/admin/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { adminRole, isInitialized } = useAdminAuth();

  // Show loading state while auth is initializing
  if (!isInitialized) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div>
            <Skeleton className="h-6 w-48 mb-1" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
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
