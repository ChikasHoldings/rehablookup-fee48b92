import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProviderHeader } from "./ProviderHeader";
import { ProviderSidebar } from "./ProviderSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { ProviderErrorBoundary } from "./ProviderErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useProviderData } from "@/hooks/useProviderData";
import { useQueryClient } from "@tanstack/react-query";
import { SelectedFacilityProvider, useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";
import { useSentryBreadcrumbs } from "@/hooks/useSentryBreadcrumbs";
import { useUserRole } from "@/hooks/useUserRole";
import { prefetchAdjacentRoutes, preloadProviderPages } from "@/lib/routePrefetch";
import { scrollContainerToTop } from "@/hooks/useScrollToTop";

// Preload all provider pages on module load for instant navigation
preloadProviderPages();

function ProviderShellContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const hasRedirected = useRef(false);
  
  // Use unified role system
  const { role, isLoading: isRoleLoading, isAuthenticated } = useUserRole();

  const { data: providerData } = useProviderData(selectedFacility?.id);
  
  // Track navigation for Sentry breadcrumbs
  useSentryBreadcrumbs();

  // Scroll content area to top and prefetch on route change
  useEffect(() => {
    scrollContainerToTop(mainContentRef.current);
    prefetchAdjacentRoutes(location.pathname);
  }, [location.pathname]);

  // Role-based redirect - Admins go to admin panel, non-providers go to login
  useEffect(() => {
    if (isRoleLoading || hasRedirected.current) return;
    
    // If user is admin, redirect to admin panel
    if (role === "admin") {
      hasRedirected.current = true;
      navigate("/admin", { replace: true });
      return;
    }
    
    // If user is client, redirect to client home
    if (role === "seeker") {
      hasRedirected.current = true;
      navigate("/account", { replace: true });
      return;
    }
    
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      hasRedirected.current = true;
      clearSentryUser();
      navigate("/login?type=provider", { replace: true });
      return;
    }
    
    // If authenticated but not a provider (null role), redirect to login
    if (role === null && isAuthenticated) {
      // User might be signing up - check if they have a provider profile
      const checkProvider = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          hasRedirected.current = true;
          navigate("/login?type=provider", { replace: true });
          return;
        }
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (!profile) {
          // Not a provider - redirect
          hasRedirected.current = true;
          navigate("/login?type=provider", { replace: true });
        }
      };
      checkProvider();
    }
  }, [role, isRoleLoading, isAuthenticated, navigate]);

  // Set Sentry user context when authenticated as provider
  useEffect(() => {
    if (role === "provider" && isAuthenticated) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSentryUser({
            id: session.user.id,
            email: session.user.email,
            role: "provider",
          });
        }
      });
    }
  }, [role, isAuthenticated]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session && !hasRedirected.current) {
          hasRedirected.current = true;
          clearSentryUser();
          navigate("/login?type=provider", { replace: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        supabase.functions.invoke("log-activity", {
          body: {
            user_id: session.user.id,
            event_type: "logout",
            event_description: "Signed out of account",
          },
        }).catch(console.error);
      }
      
      clearSentryUser();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Logout failed",
          description: "Please try again or refresh the page.",
          variant: "destructive",
        });
        return;
      }

      queryClient.clear();
      toast({
        title: "Signed out",
        description: "You've been successfully logged out.",
      });
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout exception:", err);
      toast({
        title: "Logout failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [navigate, toast, queryClient]);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleMoreClick = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const profile = providerData?.profile;
  const facility = selectedFacility || providerData?.facility;

  // NEVER show skeleton - render shell immediately
  // Redirects happen via useEffect, show null only during active redirect
  if (hasRedirected.current || role === "admin" || role === "seeker") {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background isolate" data-shell>
      {/* Fixed Header */}
      <div className="flex-shrink-0 z-50">
        <ProviderHeader
          facilityName={facility?.name}
          facilityId={facility?.id}
          facilitySlug={facility?.slug}
          facilityLogo={facility?.logo_url}
          userName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
          onLogout={handleLogout}
        />
      </div>

      <div className="flex flex-1 min-h-0 w-full">
        {/* Fixed Desktop Sidebar - Consistent width */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-sm overflow-y-auto z-40">
          <ProviderSidebar />
        </aside>

        {/* Mobile Sidebar Sheet - slides from right */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent 
            side="right" 
            className="w-[80vw] max-w-[300px] p-0 border-l border-border/50 [&>button]:hidden"
          >
            <div className="flex flex-col h-full bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="font-display font-semibold text-foreground text-sm">Menu</p>
                <button
                  onClick={handleCloseSidebar}
                  className="flex items-center justify-center h-7 w-7 rounded-full bg-muted/80 hover:bg-muted transition-colors"
                  aria-label="Close menu"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="text-muted-foreground"
                  >
                    <path d="M18 6 6 18"/>
                    <path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ProviderSidebar onNavigate={handleCloseSidebar} />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content Area - Responsive with proper overflow handling */}
        <main 
          ref={mainContentRef} 
          className="flex-1 min-w-0 min-h-0 overflow-x-hidden overflow-y-auto bg-muted/30 pb-20 lg:pb-0"
        >
          <ProviderErrorBoundary>
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </ProviderErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMoreClick={handleMoreClick} />
    </div>
  );
}

export function ProviderShell() {
  return (
    <SelectedFacilityProvider>
      <ProviderShellContent />
    </SelectedFacilityProvider>
  );
}
