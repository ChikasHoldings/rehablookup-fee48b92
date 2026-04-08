import { useRef, useEffect, useState, Suspense } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { Menu, ShieldX, LayoutDashboard, Building2, Users, CreditCard, Star, ClipboardList, Settings, BarChart3, Bell, Headphones, UserSearch, UserPlus, MessageSquare, FileText, Megaphone, ShieldAlert } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { AdminErrorBoundary } from "./AdminErrorBoundary";
import { AdminPageLoading } from "./AdminPageLoading";
import { ForcePasswordChangeDialog } from "./ForcePasswordChangeDialog";
import { TwoFactorEnforcementDialog } from "./TwoFactorEnforcementDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSentryBreadcrumbs } from "@/hooks/useSentryBreadcrumbs";
import { prefetchAdminPage, prefetchAdjacentPages } from "@/lib/adminPrefetch";
import { preloadAdminPages } from "@/lib/routePrefetch";
import { scrollContainerToTop } from "@/hooks/useScrollToTop";

// Both AdminHeader and AdminSidebar are already memoized in their exports

const mobileNavItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, permission: "dashboard" },
  { to: "/admin/leads", icon: Users, label: "Leads", permission: "leads" },
  { to: "/admin/seekers", icon: UserSearch, label: "Users", permission: "seekers" },
  { to: "/admin/providers", icon: Building2, label: "Providers", permission: "providers" },
  { to: "/admin/concierge", icon: UserPlus, label: "Placements", permission: "placements" },
  { to: "/admin/support", icon: Headphones, label: "Support", permission: "support" },
  { to: "/admin/marketing", icon: Megaphone, label: "Marketing", permission: "leads" },
  { to: "/admin/blog", icon: FileText, label: "Blog", permission: "providers" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions", permission: "subscriptions" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: "analytics" },
  { to: "/admin/reviews", icon: MessageSquare, label: "Reviews", permission: "reviews" },
  { to: "/admin/settings", icon: Settings, label: "Settings", permission: "settings" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications", permission: "dashboard" },
  { to: "/admin/users", icon: ShieldAlert, label: "Admin Staff", permission: "users" },
  { to: "/admin/audit-log", icon: ClipboardList, label: "Audit Log", permission: "audit_log" },
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
    adminRole,
    hasPermission, 
    canAccessRoute, 
    forcePasswordChange,
    clearForcePasswordChange,
    requireMfaSetup,
    completeMfaSetup,
    skipMfaSetup,
    isInitialized,
    logout 
  } = useAdminAuth();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Track navigation for Sentry breadcrumbs
  useSentryBreadcrumbs();

  // Preload all admin pages on mount for instant navigation
  useEffect(() => {
    preloadAdminPages();
  }, []);

  // Scroll to top and prefetch adjacent pages on route change
  useEffect(() => {
    scrollContainerToTop(mainContentRef.current);
    // Prefetch adjacent pages after the current page has loaded
    prefetchAdjacentPages(location.pathname);
  }, [location.pathname]);

  // NEVER show skeleton - render shell immediately
  // Redirects happen in hook, render null during redirect
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
    <div className="min-h-screen flex flex-col bg-slate-100 isolate" data-shell>
      {/* Force password change dialog */}
      <ForcePasswordChangeDialog 
        open={forcePasswordChange} 
        onPasswordChanged={clearForcePasswordChange} 
      />

      {/* 2FA enforcement dialog - shown after password change if needed */}
      <TwoFactorEnforcementDialog
        open={requireMfaSetup && !forcePasswordChange}
        onSuccess={completeMfaSetup}
        onSkip={skipMfaSetup}
      />
      
      <AdminHeader userEmail={user?.email} userId={user?.id} adminRole={adminRole} onLogout={logout} isSuperAdmin={isSuperAdmin} hasPermission={hasPermission} />
      
      <div className="flex flex-1 min-h-0">
        <AdminSidebar isSuperAdmin={isSuperAdmin} hasPermission={hasPermission} />
        
        <main
          ref={mainContentRef}
          className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] p-4 lg:p-6"
        >
          <div className="max-w-6xl mx-auto">
            <AdminErrorBoundary>
              {hasRouteAccess ? (
                <Suspense fallback={null}>
                  <Outlet />
                </Suspense>
              ) : (
                <AccessDenied />
              )}
            </AdminErrorBoundary>
          </div>
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
          <SheetContent side="left" className="w-72 p-0 bg-white border-r border-slate-200">
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
                    onMouseEnter={() => prefetchAdminPage(item.to)}
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
