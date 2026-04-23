import { useEffect, useRef, useCallback, Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SeekerHeader } from "./SeekerHeader";
import { SeekerMobileNav } from "./SeekerMobileNav";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuthReady } from "@/hooks/useAuthReady";
import { prefetchAdjacentRoutes, preloadSeekerPages } from "@/lib/routePrefetch";
import { scrollContainerToTop } from "@/hooks/useScrollToTop";

// Preload all seeker pages on module load for instant navigation
preloadSeekerPages();

interface SeekerProfile {
  display_name: string | null;
  first_name: string | null;
  avatar_url: string | null;
}

export function SeekerShell() {
  const { user, userId, email: userEmail, isAuthenticated, isReady } = useAuthReady();

  const mainContentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch seeker profile via React Query (allows invalidation from settings)
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
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
    if (!isReady || !userRole) return;
    if (typeof window !== "undefined" && window.self !== window.top) return;

    if (userRole === "admin") {
      navigate("/admin", { replace: true });
    } else if (userRole === "provider") {
      navigate("/provider/dashboard", { replace: true });
    }
  }, [userRole, isReady, navigate]);

  // Redirect unauthenticated users to login (only after auth is fully resolved)
  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
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

  // Hide shell during redirect
  if (userRole === "admin" || userRole === "provider") return null;

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
        <Suspense fallback={null}>
          <Outlet context={{ isAuthenticated, userName: displayName, userId }} />
        </Suspense>
      </main>

      {/* Row 3 — Mobile Bottom Navigation (in-flow, not fixed) */}
      <SeekerMobileNav isAuthenticated={isAuthenticated} />
    </div>
  );
}
