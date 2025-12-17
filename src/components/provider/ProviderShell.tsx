import { useEffect, useState, useCallback, memo, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProviderHeader } from "./ProviderHeader";
import { ProviderSidebar } from "./ProviderSidebar";
import { ProviderErrorBoundary } from "./ProviderErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
    // Log logout activity before signing out
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      supabase.functions.invoke("log-activity", {
        body: {
          user_id: session.user.id,
          event_type: "logout",
          event_description: "Signed out of account",
        },
      });
    }
    
    clearSentryUser();
    await supabase.auth.signOut();
    // Clear provider data cache on logout
    queryClient.removeQueries({ queryKey: ["provider-data"] });
    queryClient.removeQueries({ queryKey: ["provider-leads"] });
    toast({
      title: "Signed out",
      description: "You've been successfully logged out.",
    });
    navigate("/provider-login", { replace: true });
  }, [navigate, toast, queryClient]);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
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
          facilityStatus={facility?.status}
          userName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
          onLogout={handleLogout}
        />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Fixed Desktop Sidebar - z-40 below header */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-sm overflow-y-auto z-40">
          <MemoizedSidebar />
        </aside>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="default" 
              size="icon" 
              className="lg:hidden fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {sidebarOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-72 p-0 border-r-0">
            <div className="flex flex-col h-full bg-card">
              <div className="p-3 sm:p-4 border-b border-border">
                <p className="font-display font-semibold text-foreground text-sm sm:text-base">Navigation</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MemoizedSidebar onNavigate={handleCloseSidebar} />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Content Area - Outlet renders child routes */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto bg-muted/30">
          <ProviderErrorBoundary>
            <Outlet />
          </ProviderErrorBoundary>
        </main>
      </div>
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
