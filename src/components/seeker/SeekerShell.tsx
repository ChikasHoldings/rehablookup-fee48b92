import { useEffect, useRef, useCallback, Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SeekerHeader } from "./SeekerHeader";
import { SeekerMobileNav } from "./SeekerMobileNav";
import { SeekerErrorBoundary } from "./SeekerErrorBoundary";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuthReady } from "@/hooks/useAuthReady";
import { prefetchAdjacentRoutes, preloadSeekerPages } from "@/lib/routePrefetch";
import { scrollContainerToTop } from "@/hooks/useScrollToTop";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle2 } from "lucide-react";

// Preload all seeker pages on module load for instant navigation
preloadSeekerPages();

interface SeekerProfile {
  display_name: string | null;
  first_name: string | null;
  avatar_url: string | null;
}

/**
 * Loading skeleton for the seeker shell while auth/profile resolves.
 * Prevents blank flashes during initial load.
 */
function SeekerShellSkeleton() {
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background isolate grid grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-rows-[auto_minmax(0,1fr)]">
      {/* Header skeleton */}
      <div className="z-50 min-w-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="min-w-0 min-h-0 overflow-x-hidden overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-px w-full" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Mobile nav skeleton */}
      <div className="lg:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex justify-around p-2">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state for when a seeker has no profile data.
 * Provides a clear path to complete their profile.
 */
function SeekerEmptyState({ onCompleteProfile }: { onCompleteProfile: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <UserCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Complete Your Profile</h2>
          <p className="text-muted-foreground mb-4">
            We need a few details to personalize your experience and help you find the right treatment options.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={onCompleteProfile}>
              Complete Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SeekerShell() {
  const { user, userId, email: userEmail, isAuthenticated, isReady } = useAuthReady();

  const mainContentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasRedirected = useRef(false);

  // Fetch seeker profile once per session.
  // Cached for the full session — settings page invalidates this key after edits.
  const { data: profile } = useQuery({
    queryKey: ['seeker-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('seeker_profiles')
        .select('display_name, first_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();
      return data as SeekerProfile | null;
    },
    enabled: isReady && !!userId,
    staleTime: Infinity,        // never auto-refetch within session
    gcTime: Infinity,           // keep in cache across route changes
    refetchOnMount: false,      // don't refetch on every navigation
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Check email verification status
  const { data: isEmailVerified } = useQuery({
    queryKey: ['email-verified', userEmail],
    queryFn: async () => {
      if (!userEmail) return true; // Default to true to hide banner
      const { data } = await supabase.rpc('is_email_verified', { p_email: userEmail });
      return !!data;
    },
    enabled: isReady && !!userEmail,
    staleTime: 60000, // Cache for 1 min
  });

  // Scroll content area to top and prefetch adjacent routes on navigation
  useEffect(() => {
    scrollContainerToTop(mainContentRef.current);
    prefetchAdjacentRoutes(location.pathname);
  }, [location.pathname]);

  // Redirect admins/providers away from seeker panel
  // We check the user's actual role from the DB, not route hints
  const { data: userRole } = useQuery({
    queryKey: ['shell-role-check', userId],
    queryFn: async () => {
      if (!userId) return null;
      const [adminResult, providerResult] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle(),
      ]);
      if (adminResult.data === true) return "admin";
      if (providerResult.data) return "provider";
      return "seeker";
    },
    enabled: isReady && !!userId,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!isReady || !userRole || hasRedirected.current) return;
    if (typeof window !== "undefined" && window.self !== window.top) return;

    if (userRole === "admin") {
      hasRedirected.current = true;
      navigate("/admin", { replace: true });
    } else if (userRole === "provider") {
      hasRedirected.current = true;
      navigate("/provider/dashboard", { replace: true });
    }
  }, [userRole, isReady, navigate]);

  // Redirect unauthenticated users to login (only after auth is fully resolved)
  useEffect(() => {
    if (!isReady || hasRedirected.current) return;
    if (!isAuthenticated) {
      hasRedirected.current = true;
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [isReady, isAuthenticated, navigate, location.pathname]);

  const handleLogout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({ title: "Logout failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      queryClient.clear();
      toast({ title: "Signed out", description: "You've been successfully logged out." });
      navigate("/", { replace: true });
    } catch {
      toast({ title: "Logout failed", description: "An unexpected error occurred.", variant: "destructive" });
    }
  }, [navigate, toast, queryClient]);

  const displayName = profile?.first_name || profile?.display_name || userEmail?.split('@')[0];

  // Show loading skeleton while auth/profile is resolving
  if (!isReady || (isAuthenticated && profile === undefined)) {
    return <SeekerShellSkeleton />;
  }

  // Show empty state for authenticated users with no profile
  if (isAuthenticated && profile === null) {
    return (
      <SeekerEmptyState 
        onCompleteProfile={() => navigate('/account/settings')} 
      />
    );
  }

  // Hide shell during redirect
  if (userRole === "admin" || userRole === "provider" || hasRedirected.current) return null;

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden bg-background isolate grid grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-rows-[auto_minmax(0,1fr)]"
      data-shell
    >
      {/* Row 1 — Header (+ optional verification banner) */}
      <div className="z-50 min-w-0">
        {isAuthenticated && isEmailVerified === false && (
          <EmailVerificationBanner
            email={userEmail ?? undefined}
            onVerified={() => queryClient.invalidateQueries({ queryKey: ['email-verified', userEmail] })}
          />
        )}
        <SeekerHeader
          userName={displayName}
          avatarUrl={profile?.avatar_url}
          onLogout={handleLogout}
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* Row 2 — Main scroll area (bounded by grid, no padding-hack needed) */}
      <main
        ref={mainContentRef}
        className="min-w-0 min-h-0 overflow-x-hidden overflow-y-auto bg-muted/30"
      >
        <SeekerErrorBoundary>
          <Suspense fallback={null}>
            <Outlet context={{ isAuthenticated, userName: displayName, userId }} />
          </Suspense>
        </SeekerErrorBoundary>
      </main>

      {/* Row 3 — Mobile Bottom Navigation (in-flow, not fixed) */}
      <SeekerMobileNav isAuthenticated={isAuthenticated} />
    </div>
  );
}
