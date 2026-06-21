import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { Navigate, Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AccessDenied } from "./AccessDenied";
import { ProviderHeader } from "./ProviderHeader";
import { ProviderSidebar } from "./ProviderSidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { ProviderErrorBoundary } from "./ProviderErrorBoundary";
import { WelcomeModal } from "./WelcomeModal";
import { ConversionPromoPopup } from "./promo/ConversionPromoPopup";
import { DunningBanner } from "./DunningBanner";
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
import { isOnboardingPath, resolveProviderPostLoginPath } from "@/lib/providerLanding";

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
    
    // If not authenticated, redirect to login (render-phase guard handles the
    // first render; this effect handles the case where the session expires
    // while the provider panel is already mounted).
    if (!isAuthenticated) {
      hasRedirected.current = true;
      clearSentryUser();
      navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
      return;
    }
    
    // If authenticated but not a provider (null role), redirect to login
    if (role === null && isAuthenticated) {
      // User might be signing up — the post-signup `profiles` trigger
      // can lag behind the auth session by 100–500ms. Poll up to 3 times
      // (≈1.5s total) before bouncing to login. (Audit fix M2)
      const checkProvider = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          hasRedirected.current = true;
          navigate("/login?type=provider", { replace: true });
          return;
        }

        const delays = [0, 500, 1000];
        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) {
            await new Promise((r) => setTimeout(r, delays[i]));
          }
          if (hasRedirected.current) return; // role resolved while we waited
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (profile) return; // profile exists — let role hook re-resolve
        }

        // After retries, still no profile — bounce to login
        hasRedirected.current = true;
        navigate("/login?type=provider", { replace: true });
      };
      checkProvider();
    }
    // location.* is read only to build the post-login redirect URL at the
    // moment of redirect — this guard must not re-run as the user navigates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      }).catch((err) => {
        // Sentry context is best-effort. Don't fail the shell just
        // because we couldn't tag the user — observability degrades
        // but the panel still works.
        console.warn("[ProviderShell] setSentryUser failed", err);
      });
    }
  }, [role, isAuthenticated]);

  // Activate any pending team invitations addressed to this provider's
  // email. Invites created before the invitee had an account land as
  // status='pending' rows keyed by email; this binds them to the now
  // signed-in user so they gain access immediately. Fire-and-forget,
  // once per shell mount.
  const hasLinkedInvites = useRef(false);
  useEffect(() => {
    if (role !== "provider" || !isAuthenticated || hasLinkedInvites.current) return;
    hasLinkedInvites.current = true;
    supabase
      .rpc("link_pending_team_invites" as never)
      .then(({ error }) => {
        if (error) {
          console.warn("[ProviderShell] link_pending_team_invites failed", error);
        } else {
          // Newly-linked memberships change which facilities this user
          // can reach — refresh the facility picker.
          queryClient.invalidateQueries({ queryKey: ["provider-facilities"] });
        }
      });
  }, [role, isAuthenticated, queryClient]);

  // Resume-from-where-you-stopped: any authenticated provider whose
  // onboarding isn't complete and who lands on a non-onboarding
  // provider route (e.g. /provider/dashboard via bookmark, deep link,
  // or stale session) gets bounced into the wizard. The wizard's
  // own state machine then routes them to the exact step they left
  // off on. We only fire once per shell mount (hasOnboardingRedirected)
  // and skip if we already started another redirect (hasRedirected).
  const hasOnboardingRedirected = useRef(false);
  useEffect(() => {
    if (role !== "provider" || !isAuthenticated) return;
    if (hasRedirected.current || hasOnboardingRedirected.current) return;
    if (isOnboardingPath(location.pathname)) return;

    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || cancelled) return;
      const { path, reason } = await resolveProviderPostLoginPath(
        session.user.id,
        null,
      );
      if (cancelled || hasRedirected.current || hasOnboardingRedirected.current) return;
      if (reason === "onboarding_incomplete" || reason === "profile_missing") {
        hasOnboardingRedirected.current = true;
        navigate(path, { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [role, isAuthenticated, location.pathname, navigate]);

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

  // Render-phase guards — evaluated synchronously on every render so the
  // <Outlet /> (and anything above it like ProviderHeader) never renders
  // for callers who shouldn't be here.  useEffect-based navigates are kept
  // as a backup for role changes that happen *after* the shell is mounted.

  // 1. Auth still resolving — render nothing rather than flash the full shell
  if (isRoleLoading) return null;

  // 2. Anonymous → login with destination preserved
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  // 3. Admin — redirect to admin panel (admins arriving via bookmark etc.)
  if (role === "admin") return <Navigate to="/admin" replace />;

  // 4. Seeker or any other non-provider authenticated role → access denied
  //    (distinguished from anonymous so the message is accurate)
  if (role === "seeker") return <AccessDenied requiredRole="provider" />;

  // 5. role === null + isAuthenticated: new-signup race — profile trigger
  //    hasn't resolved yet.  Return null while the polling useEffect retries.
  if (role === null) return null;

  // 6. Suspended listing — lock out the dashboard immediately.
  //    Suspension is admin-controlled via facilities.suspended (set by
  //    AdminProviders), NOT profiles.status (which doesn't exist). `facility`
  //    resolves to the selected/primary facility; only block when suspended is
  //    explicitly true so the shell renders normally while the query is
  //    in-flight (no flicker for active accounts).
  if (facility?.suspended === true) {
    return (
      <AccessDenied
        requiredRole="provider"
        title="Account suspended"
        message="This facility has been suspended. Contact our support team to resolve this or appeal the decision."
        action={{ label: "Contact support", href: "/provider-support" }}
      />
    );
  }

  // role === "provider" falls through to the full shell below.
  // Also suppress while a useEffect redirect is in flight.
  if (hasRedirected.current) return null;

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden bg-background isolate grid grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-rows-[auto_minmax(0,1fr)]"
      data-shell
    >
      {/* Row 1 — Header */}
      <div className="z-50 min-w-0">
        <ProviderHeader
          facilityName={facility?.name}
          facilityId={facility?.id}
          facilitySlug={facility?.slug}
          facilityLogo={facility?.logo_url}
          userName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
          onLogout={handleLogout}
        />
      </div>

      {/* Row 2 — Sidebar + Main (single grid cell, internal flex) */}
      <div className="flex min-h-0 w-full overflow-hidden">
        {/* Fixed Desktop Sidebar — clean white panel with a hairline
            divider, matches Healthgrades / Yelp directory chrome (no
            translucency tint that competes with content). */}
        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto z-40">
          <ProviderSidebar />
        </aside>

        {/* Mobile Sidebar Sheet — slides from right */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent
            side="right"
            className="w-[85vw] max-w-[320px] p-0 border-l border-border/50 [&>button]:hidden"
          >
            <div className="flex flex-col h-full bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                <p className="font-display font-semibold text-foreground text-sm">Menu</p>
                <button
                  onClick={handleCloseSidebar}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-muted/80 hover:bg-muted transition-colors"
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
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ProviderSidebar onNavigate={handleCloseSidebar} />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main scroll area — bounded by grid, no padding hack needed */}
        <main
          ref={mainContentRef}
          className="flex-1 min-w-0 min-h-0 overflow-x-hidden overflow-y-auto bg-slate-50"
        >
          <DunningBanner />
          <ProviderErrorBoundary>
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </ProviderErrorBoundary>
        </main>
        {/* One-time post-onboarding welcome. Self-gates: only shows
            when profiles.welcomed_at is null AND
            onboarding_completed_at is set, so it's a no-op for every
            other render of every other provider page. */}
        <WelcomeModal />
        {/* One-time conversion promo (Free→Pro / Pro→add-on). Self-gates on a
            live campaign for the provider's tier + once-per-campaign dismissal. */}
        <ConversionPromoPopup />
      </div>

      {/* Row 3 — Mobile Bottom Navigation (in-flow, not fixed) */}
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
