import { useEffect, useState, useCallback, useRef } from "react";
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

// Use components directly - memo can cause issues with hot reloading

function ProviderShellContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedFacility } = useSelectedFacility();
  const hasRedirected = useRef(false);

  const { data: providerData } = useProviderData(selectedFacility?.id);
  
  // Track navigation for Sentry breadcrumbs
  useSentryBreadcrumbs();

  // Scroll content area to top on route change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Auth check - non-blocking, just redirects if no session
  useEffect(() => {
    if (hasRedirected.current) return;
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        hasRedirected.current = true;
        clearSentryUser();
        navigate("/provider-login", { replace: true });
        return;
      }
      
      // Set Sentry user context
      setSentryUser({
        id: session.user.id,
        email: session.user.email,
        role: "provider",
      });
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session && !hasRedirected.current) {
          hasRedirected.current = true;
          clearSentryUser();
          navigate("/provider-login", { replace: true });
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

  const profile = providerData?.profile;
  const facility = selectedFacility || providerData?.facility;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
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
        {/* Fixed Desktop Sidebar - Responsive width */}
        <aside className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-sm overflow-y-auto z-40">
          <ProviderSidebar />
        </aside>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[280px] sm:w-72 p-0 border-r-0">
            <div className="flex flex-col h-full bg-card">
              <div className="p-4 border-b border-border">
                <p className="font-display font-semibold text-foreground">Menu</p>
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
          className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-muted/30 pb-20 lg:pb-0"
        >
          <ProviderErrorBoundary>
            <Outlet />
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
