import { useRef, useEffect, useState, memo } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { Menu, ShieldX, LayoutDashboard, Building2, Users, CreditCard, Star, ClipboardList, Settings, BarChart3 } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { ForcePasswordChangeDialog } from "./ForcePasswordChangeDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const MemoizedHeader = memo(AdminHeader);
const MemoizedSidebar = memo(AdminSidebar);

const mobileNavItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, permission: "dashboard" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: "analytics" },
  { to: "/admin/providers", icon: Building2, label: "Providers", permission: "providers" },
  { to: "/admin/leads", icon: Users, label: "Leads", permission: "leads" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions", permission: "subscriptions" },
  { to: "/admin/featured", icon: Star, label: "Featured", permission: "featured" },
  { to: "/admin/users", icon: Users, label: "User Mgmt", permission: "users" },
  { to: "/admin/audit-log", icon: ClipboardList, label: "Audit Log", permission: "audit_log" },
  { to: "/admin/settings", icon: Settings, label: "Settings", permission: "settings" },
];

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <div className="bg-destructive/10 p-4 rounded-full mb-4">
        <ShieldX className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
      <p className="text-slate-600 text-center max-w-md">
        You don't have permission to access this page. Contact a Super Admin to request access.
      </p>
      <Link to="/admin">
        <Button variant="outline" className="mt-6">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}

export function AdminShell() {
  const { 
    user, 
    isAdmin, 
    isSuperAdmin, 
    hasPermission, 
    canAccessRoute, 
    forcePasswordChange,
    clearForcePasswordChange,
    isLoading, 
    logout 
  } = useAdminAuth();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Check if user can access current route
  const hasRouteAccess = canAccessRoute(location.pathname);

  // Filter mobile nav items based on permissions
  const visibleNavItems = mobileNavItems.filter(
    (item) => isSuperAdmin || item.permission === "dashboard" || hasPermission(item.permission)
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Force password change dialog */}
      <ForcePasswordChangeDialog 
        open={forcePasswordChange} 
        onPasswordChanged={clearForcePasswordChange} 
      />
      
      <MemoizedHeader userEmail={user?.email} onLogout={logout} />
      
      <div className="flex flex-1">
        <MemoizedSidebar isSuperAdmin={isSuperAdmin} hasPermission={hasPermission} />
        
        <main
          ref={mainContentRef}
          className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] p-4 lg:p-6"
        >
          {hasRouteAccess ? <Outlet /> : <AccessDenied />}
        </main>
      </div>

      {/* Mobile FAB */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="h-14 w-14 rounded-full shadow-lg bg-slate-900 hover:bg-slate-800 text-white">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="p-4 border-b bg-slate-900 text-white">
              <span className="text-lg font-bold">Admin Menu</span>
            </div>
            <nav className="p-4 space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
