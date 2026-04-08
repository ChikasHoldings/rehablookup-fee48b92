import { useRef, useEffect, useState, Suspense } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { Menu, ShieldX, LayoutDashboard, Building2, Users, CreditCard, Star, ClipboardList, Settings, BarChart3, Bell, Headphones, UserSearch, UserPlus, MessageSquare, FileText, Megaphone, ShieldAlert, Inbox, AlertTriangle, Landmark, Eye, X } from "lucide-react";
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
import { useImpersonation } from "@/hooks/useImpersonation";

// Both AdminHeader and AdminSidebar are already memoized in their exports

const mobileNavItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true, permission: "dashboard" },
  { to: "/admin/leads", icon: Users, label: "Leads", permission: "leads" },
  { to: "/admin/seekers", icon: UserSearch, label: "Users", permission: "seekers" },
  { to: "/admin/providers", icon: Building2, label: "Providers", permission: "providers" },
  { to: "/admin/concierge", icon: UserPlus, label: "Placements", permission: "placements" },
  { to: "/admin/inbox", icon: Inbox, label: "Inbox", permission: "placements" },
  { to: "/admin/support", icon: Headphones, label: "Support", permission: "support" },
  { to: "/admin/marketing", icon: Megaphone, label: "Marketing", permission: "leads" },
  { to: "/admin/blog", icon: FileText, label: "Blog", permission: "providers" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions", permission: "subscriptions" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: "analytics" },
  { to: "/admin/reviews", icon: MessageSquare, label: "Reviews", permission: "reviews" },
  { to: "/admin/escalations", icon: AlertTriangle, label: "Escalations", permission: "escalations" },
  { to: "/admin/settings", icon: Settings, label: "Settings", permission: "settings" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications", permission: "dashboard" },
  { to: "/admin/users", icon: ShieldAlert, label: "Admin Staff", permission: "users" },
  { to: "/admin/back-office", icon: Landmark, label: "Back Office", permission: "back_office" },
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
  const { impersonating, isImpersonating, stopImpersonation } = useImpersonation();
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
    prefetchAdjacentPages(location.pathname);
  }, [location.pathname]);

  if (!isAdmin) {
    return null;
  }

  // When impersonating, use impersonated role's permissions for sidebar/routing
  const effectiveIsSuperAdmin = isImpersonating ? false : isSuperAdmin;
  const effectiveHasPermission = isImpersonating
    ? (key: string) => impersonating?.permissions?.[key] === true
    : hasPermission;
  const effectiveCanAccessRoute = isImpersonating
    ? (pathname: string) => {
        // During impersonation, check the impersonated user's permissions
        const routeMap: Record<string, string> = {
          "/admin": "dashboard", "/admin/dashboard": "dashboard",
          "/admin/analytics": "analytics", "/admin/providers": "providers",
          "/admin/leads": "leads", "/admin/seekers": "seekers",
          "/admin/subscriptions": "subscriptions", "/admin/featured": "featured",
          "/admin/users": "users", "/admin/audit-log": "audit_log",
          "/admin/settings": "settings", "/admin/notifications": "notifications",
          "/admin/profile": "dashboard", "/admin/reviews": "reviews",
          "/admin/concierge": "placements", "/admin/support": "support",
          "/admin/placement-revenue": "placements", "/admin/credentials": "providers",
          "/admin/security-logs": "security_logs", "/admin/marketing": "leads",
          "/admin/blog": "providers", "/admin/international": "placements",
          "/admin/inbox": "placements", "/admin/escalations": "escalations",
          "/admin/back-office": "back_office",
        };
        let permKey = routeMap[pathname];
        if (!permKey) {
          for (const [route, perm] of Object.entries(routeMap).sort((a, b) => b[0].length - a[0].length)) {
            if (pathname.startsWith(route) && route !== "/admin") { permKey = perm; break; }
          }
        }
        if (!permKey || permKey === "dashboard" || permKey === "notifications") return true;
        return impersonating?.permissions?.[permKey] === true;
      }
    : canAccessRoute;

  // Check if user can access current route
  const hasRouteAccess = effectiveCanAccessRoute(location.pathname);

  // Filter mobile nav items based on effective permissions
  const visibleNavItems = mobileNavItems.filter(
    (item) => effectiveIsSuperAdmin || item.permission === "dashboard" || effectiveHasPermission(item.permission)
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 isolate" data-shell>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-amber-400 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium z-[60] relative">
          <Eye className="h-4 w-4" />
          <span>Viewing as <strong>{impersonating?.displayName}</strong> ({impersonating?.role?.replace('_', ' ')})</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => user?.id && stopImpersonation(user.id)}
            className="h-6 px-2 text-amber-950 hover:bg-amber-500/50 ml-2"
          >
            <X className="h-3 w-3 mr-1" />
            Exit
          </Button>
        </div>
      )}

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
      
      <AdminHeader userEmail={user?.email} userId={user?.id} adminRole={isImpersonating ? impersonating!.role : adminRole} onLogout={logout} isSuperAdmin={effectiveIsSuperAdmin} hasPermission={effectiveHasPermission} />
      
      <div className="flex flex-1 min-h-0">
        <AdminSidebar isSuperAdmin={effectiveIsSuperAdmin} hasPermission={effectiveHasPermission} />
        
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
