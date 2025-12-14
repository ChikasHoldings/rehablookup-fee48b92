import { useEffect, useState, useCallback, memo, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProviderHeader } from "./ProviderHeader";
import { ProviderSidebar } from "./ProviderSidebar";
import { StatsBar } from "./StatsBar";
import { useToast } from "@/hooks/use-toast";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useProviderData } from "@/hooks/useProviderData";
import { useQueryClient } from "@tanstack/react-query";

// Memoized sidebar to prevent re-renders
const MemoizedSidebar = memo(ProviderSidebar);
const MemoizedHeader = memo(ProviderHeader);
const MemoizedStatsBar = memo(StatsBar);

export function ProviderShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: providerData, isLoading, error } = useProviderData();

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
        navigate("/provider-login", { replace: true });
        return;
      }
      setIsAuthChecked(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          navigate("/provider-login", { replace: true });
        }
      }
    );

    checkAuth();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = useCallback(async () => {
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
  if (!isAuthChecked || (isLoading && !providerData)) {
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
  const facility = providerData?.facility;
  const viewsCount = providerData?.viewsCount ?? 0;
  const leadsCount = providerData?.leadsCount ?? 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Fixed Header - z-50 to stay on top */}
      <div className="flex-shrink-0 z-50">
        <MemoizedHeader
          facilityName={facility?.name}
          facilityId={facility?.id}
          facilitySlug={facility?.slug}
          userName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
          onLogout={handleLogout}
        />
        {/* Stats Bar */}
        <MemoizedStatsBar 
          status={facility?.status || "inactive"} 
          leadsCount={leadsCount} 
          viewsCount={viewsCount} 
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Desktop Sidebar - z-40 below header */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-border bg-card/50 backdrop-blur-sm overflow-y-auto z-40">
          <div className="flex-1 overflow-y-auto">
            <MemoizedSidebar />
          </div>
          
          {/* Sidebar Footer */}
          <div className="flex-shrink-0 p-4 border-t border-border">
            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-4">
              <p className="text-xs font-medium text-foreground">Need Help?</p>
              <p className="text-xs text-muted-foreground mt-1">
                Contact our support team for assistance.
              </p>
              <Button variant="link" className="h-auto p-0 mt-2 text-xs" asChild>
                <a href="/provider-support">Get Support →</a>
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="default" 
              size="icon" 
              className="lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 border-r-0">
            <div className="flex flex-col h-full bg-card">
              <div className="p-4 border-b border-border">
                <p className="font-display font-semibold text-foreground">Navigation</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MemoizedSidebar onNavigate={handleCloseSidebar} />
              </div>
              <div className="flex-shrink-0 p-4 border-t border-border">
                <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                  <p className="text-xs font-medium text-foreground">Need Help?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact support for assistance.
                  </p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Scrollable Main Content Area - Outlet renders child routes */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
