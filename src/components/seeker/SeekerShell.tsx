import { useEffect, useRef, useCallback, useState, Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SeekerHeader } from "./SeekerHeader";
import { SeekerMobileNav } from "./SeekerMobileNav";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
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
  // Use unified role system - redirects admins and providers
  const { role, isLoading: isRoleLoading, isAuthenticated } = useUserRole();
  
  const mainContentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  // Use React Query to fetch profile - this allows invalidation from settings
  const { data: profile } = useQuery({
    queryKey: ['seeker-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('seeker_profiles')
        .select('display_name, first_name, avatar_url')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        // Silent fail - profile may not exist yet
      }
      return data as SeekerProfile | null;
    },
    enabled: !!userId,
    staleTime: 0, // Always check for fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Scroll content area to top and prefetch adjacent routes on navigation
  useEffect(() => {
    scrollContainerToTop(mainContentRef.current);
    // Prefetch adjacent routes for faster navigation
    prefetchAdjacentRoutes(location.pathname);
  }, [location.pathname]);

  // Redirect admins and providers to their respective portals
  useEffect(() => {
    if (isRoleLoading) return;
    
    // Skip in iframe
    if (typeof window !== "undefined" && window.self !== window.top) return;

    // If admin or provider, redirect to their portal
    if (role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }
    
    if (role === "provider") {
      navigate("/provider/dashboard", { replace: true });
      return;
    }
  }, [role, isRoleLoading, navigate]);

  // Auth check - use getSession as source of truth, trust useUserRole for immediate state
  useEffect(() => {
    let isMounted = true;

    // If useUserRole already resolved auth, seed userId/email from stored session immediately
    if (isAuthenticated) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
        const projectRef = supabaseUrl?.split("//")[1]?.split(".")[0] || "plckxokpyiubuekvodtc";
        const key = `sb-${projectRef}-auth-token`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          const s = parsed?.currentSession || parsed;
          if (s?.user) {
            setUserEmail(s.user.email);
            setUserId(s.user.id);
          }
        }
      } catch {}
    }

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setUserEmail(session?.user?.email);
        setUserId(session?.user?.id || null);

        // Check email verification
        if (session?.user?.email) {
          const { data: verified } = await supabase
            .rpc('is_email_verified', { p_email: session.user.email });
          setIsEmailVerified(!!verified);
        } else {
          setIsEmailVerified(false);
        }

        // Redirect to login if not authenticated and no stored session
        if (!session && !isAuthenticated) {
          navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
        }
      } catch {
        // Auth check failed silently
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setUserEmail(session?.user?.email);
        setUserId(session?.user?.id || null);
        setIsLoading(false);

        if (session?.user?.email) {
          const { data: verified } = await supabase
            .rpc('is_email_verified', { p_email: session.user.email });
          if (isMounted) setIsEmailVerified(!!verified);
        } else {
          setIsEmailVerified(false);
        }

        if (event === "SIGNED_OUT") {
          navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, isAuthenticated]);

  const handleLogout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Logout failed",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }

      queryClient.clear();
      toast({
        title: "Signed out",
        description: "You've been successfully logged out.",
      });
      navigate("/", { replace: true });
    } catch {
      toast({
        title: "Logout failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [navigate, toast, queryClient]);

  // Get display name - prefer first name, fall back to display name or email
  const displayName = profile?.first_name || profile?.display_name || userEmail?.split('@')[0];
  const resolvedIsAuthenticated = isAuthenticated || !!userId;

  // NEVER show skeleton - render shell immediately
  // Redirects happen via useEffect, render null during redirect
  if (role === "admin" || role === "provider") {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background isolate" data-shell>
      {/* Email Verification Banner */}
      {resolvedIsAuthenticated && !isLoading && !isEmailVerified && (
        <EmailVerificationBanner email={userEmail} onVerified={() => setIsEmailVerified(true)} />
      )}
      
      {/* Fixed Header */}
      <div className="flex-shrink-0 z-50">
        <SeekerHeader 
          userName={displayName} 
          avatarUrl={profile?.avatar_url}
          onLogout={handleLogout} 
          isAuthenticated={resolvedIsAuthenticated}
        />
      </div>

      {/* Main Content Area */}
      <main 
        ref={mainContentRef} 
        className="flex-1 min-h-0 overflow-y-auto bg-muted/30 pb-20 lg:pb-0"
      >
        <Suspense fallback={null}>
          <Outlet context={{ isAuthenticated: resolvedIsAuthenticated, userName: displayName, userId }} />
        </Suspense>
      </main>

      {/* Mobile Bottom Navigation */}
      <SeekerMobileNav isAuthenticated={resolvedIsAuthenticated} />
    </div>
  );
}
