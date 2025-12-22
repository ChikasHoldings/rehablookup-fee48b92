import { useEffect, useRef, useCallback, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SeekerHeader } from "./SeekerHeader";
import { SeekerMobileNav } from "./SeekerMobileNav";
import { EmailVerificationBanner } from "./EmailVerificationBanner";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function SeekerShell() {
  const mainContentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState<string | undefined>();
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  // Scroll content area to top on route change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Auth check - NO FORCED REDIRECT
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      setIsAuthenticated(!!session);
      setIsEmailVerified(!!session?.user?.email_confirmed_at);
      setUserEmail(session?.user?.email);
      
      if (session) {
        // Get profile
        const { data: profile } = await supabase
          .from('seeker_profiles')
          .select('display_name')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        setUserName(profile?.display_name || session.user.email?.split('@')[0]);
      }
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsAuthenticated(!!session);
        setIsEmailVerified(!!session?.user?.email_confirmed_at);
        setUserEmail(session?.user?.email);
        
        if (session) {
          const { data: profile } = await supabase
            .from('seeker_profiles')
            .select('display_name')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          setUserName(profile?.display_name || session.user.email?.split('@')[0]);
        } else {
          setUserName(undefined);
          setUserEmail(undefined);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
    } catch (err) {
      console.error("Logout exception:", err);
      toast({
        title: "Logout failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  }, [navigate, toast, queryClient]);

  if (isLoading) {
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
          userName={userName} 
          onLogout={handleLogout} 
          isAuthenticated={isAuthenticated}
        />
      </div>

      {/* Main Content Area */}
      <main 
        ref={mainContentRef} 
        className="flex-1 overflow-y-auto bg-muted/30 pb-20 lg:pb-0"
      >
        <Outlet context={{ isAuthenticated, userName }} />
      </main>

      {/* Mobile Bottom Navigation */}
      <SeekerMobileNav isAuthenticated={isAuthenticated} />
    </div>
  );
}

// Hook to get auth context in child routes
export function useSeekerShellContext() {
  return { isAuthenticated: false, userName: undefined };
}
