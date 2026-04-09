import { useRef, useEffect, useState, Suspense } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { Menu, ShieldX, Eye, X } from "lucide-react";
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
import { getMobileNavForRole } from "./adminNavConfig";

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
  const effectiveAdminRole = isImpersonating ? (impersonating?.role || "customer_rep") as any : adminRole;
  const effectiveHasPermission = isImpersonating
    ? (key: string) => impersonating?.permissions?.[key] === true
    : hasPermission;
  const effectiveCanAccessRoute = isImpersonating
    ? (pathname: string) => {
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

  // Get role-specific mobile nav and filter by permissions
  const mobileNavSections = getMobileNavForRole(effectiveAdminRole, effectiveIsSuperAdmin);
  const visibleMobileSections = mobileNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => effectiveIsSuperAdmin || item.permission === "dashboard" || effectiveHasPermission(item.permission)
      ),
    }))
    .filter((section) => section.items.length > 0);

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
            <nav className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
              {visibleMobileSections.map((section) => (
                <div key={section.label || "core"}>
                  {section.label && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1">
                      {section.label}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
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
                  </div>
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
