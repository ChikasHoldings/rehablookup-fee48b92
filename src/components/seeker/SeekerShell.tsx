import { useEffect, useRef, useCallback, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SeekerHeader } from "./SeekerHeader";
import { SeekerMobileNav } from "./SeekerMobileNav";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useUserRole, getPortalHome } from "@/hooks/useUserRole";

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

  // Scroll content area to top on route change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
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

  // Routes that are publicly accessible without authentication
  const PUBLIC_SEEKER_ROUTES = ["/account/concierge"];
  const isPublicRoute = PUBLIC_SEEKER_ROUTES.some(route => location.pathname.startsWith(route));

  // Auth check - redirect unauthenticated users to login (except for public routes)
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setIsEmailVerified(!!session?.user?.email_confirmed_at);
        setUserEmail(session?.user?.email);
        setUserId(session?.user?.id || null);

        // Redirect to login if not authenticated and not on a public route
        if (!session && !isPublicRoute) {
          navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
          return;
        }
      } catch {
        // Auth check failed silently
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setIsEmailVerified(!!session?.user?.email_confirmed_at);
        setUserEmail(session?.user?.email);
        setUserId(session?.user?.id || null);
        setIsLoading(false);

        // Redirect to login if signed out and not on a public route
        if (event === "SIGNED_OUT" && !isPublicRoute) {
          navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, isPublicRoute]);

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

  // Show loading while checking role or auth
  if (isRoleLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is admin or provider, show loading (redirect is happening)
  if (role === "admin" || role === "provider") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Email Verification Banner */}
      {isAuthenticated && !isEmailVerified && (
        <EmailVerificationBanner email={userEmail} />
      )}
      
      {/* Fixed Header */}
      <div className="flex-shrink-0 z-50">
        <SeekerHeader 
          userName={displayName} 
          avatarUrl={profile?.avatar_url}
          onLogout={handleLogout} 
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* Main Content Area */}
      <main 
        ref={mainContentRef} 
        className="flex-1 overflow-y-auto bg-muted/30 pb-20 lg:pb-0"
      >
        <Outlet context={{ isAuthenticated, userName: displayName }} />
      </main>

      {/* Mobile Bottom Navigation */}
      <SeekerMobileNav isAuthenticated={isAuthenticated} />
    </div>
  );
}
