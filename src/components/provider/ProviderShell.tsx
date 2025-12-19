import { useEffect, useState, useCallback, memo, useRef } from "react";
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

// Memoized sidebar to prevent re-renders
const MemoizedSidebar = memo(ProviderSidebar);
const MemoizedHeader = memo(ProviderHeader);

function ProviderShellContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedFacility, isLoading: facilityLoading } = useSelectedFacility();

  const { data: providerData, isLoading, error } = useProviderData(selectedFacility?.id);
  
  // Track navigation for Sentry breadcrumbs
  useSentryBreadcrumbs();

  // Scroll content area to top on route change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Auth check effect
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        clearSentryUser();
        navigate("/provider-login", { replace: true });
        return;
      }
      
      // Set Sentry user context for error tracking
      setSentryUser({
        id: session.user.id,
        email: session.user.email,
        role: "provider",
      });
      
      setIsAuthChecked(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          clearSentryUser();
          navigate("/provider-login", { replace: true });
        }
      }
    );

    checkAuth();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try {
      // Log logout activity before signing out
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Fire and forget - don't block logout on activity logging
        supabase.functions.invoke("log-activity", {
          body: {
            user_id: session.user.id,
            event_type: "logout",
            event_description: "Signed out of account",
          },
        }).catch(console.error);
      }
      
      // Clear Sentry user context
      clearSentryUser();

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
        toast({
          title: "Logout failed",
          description: "Please try again or refresh the page.",
          variant: "destructive",
        });
        return;
      }

      // Clear all provider data caches
      queryClient.clear();

      // Show success toast
      toast({
        title: "Signed out",
        description: "You've been successfully logged out.",
      });

      // Navigate to login
      navigate("/provider-login", { replace: true });
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

  // Show loading only on initial auth check
  if (!isAuthChecked || facilityLoading || (isLoading && !providerData)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    navigate("/provider-login", { replace: true });
    return null;
  }

  const profile = providerData?.profile;
  const facility = selectedFacility || providerData?.facility;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Fixed Header - z-50 to stay on top */}
      <div className="flex-shrink-0 z-50">
        <MemoizedHeader
          facilityName={facility?.name}
          facilityId={facility?.id}
          facilitySlug={facility?.slug}
          facilityLogo={facility?.logo_url}
          userName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
          onLogout={handleLogout}
        />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Fixed Desktop Sidebar - z-40 below header */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-sm overflow-y-auto z-40">
          <MemoizedSidebar />
        </aside>

        {/* Mobile Sidebar Sheet - accessed via "More" button */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[280px] sm:w-72 p-0 border-r-0">
            <div className="flex flex-col h-full bg-card">
              <div className="p-4 border-b border-border">
                <p className="font-display font-semibold text-foreground">Menu</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MemoizedSidebar onNavigate={handleCloseSidebar} />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content Area - with bottom padding on mobile for nav bar */}
        <main 
          ref={mainContentRef} 
          className="flex-1 overflow-y-auto bg-muted/30 pb-20 lg:pb-0"
        >
          <ProviderErrorBoundary>
            <Outlet />
          </ProviderErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation - PWA style */}
      <MobileBottomNav onMoreClick={handleMoreClick} />
    </div>
  );
}

// Wrap with provider
export function ProviderShell() {
  return (
    <SelectedFacilityProvider>
      <ProviderShellContent />
    </SelectedFacilityProvider>
  );
}
