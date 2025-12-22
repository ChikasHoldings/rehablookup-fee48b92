import { useEffect, useRef, useCallback, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SeekerHeader } from "./SeekerHeader";
import { SeekerMobileNav } from "./SeekerMobileNav";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function SeekerShell() {
  const mainContentRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasRedirected = useRef(false);
  const [userName, setUserName] = useState<string | undefined>();

  // Scroll content area to top on route change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Auth check
  useEffect(() => {
    if (hasRedirected.current) return;
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        hasRedirected.current = true;
        navigate("/auth", { replace: true });
        return;
      }

      // Get profile
      const { data: profile } = await supabase
        .from('seeker_profiles')
        .select('display_name')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      setUserName(profile?.display_name || session.user.email?.split('@')[0]);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session && !hasRedirected.current) {
          hasRedirected.current = true;
          navigate("/auth", { replace: true });
        } else if (session) {
          const { data: profile } = await supabase
            .from('seeker_profiles')
            .select('display_name')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          setUserName(profile?.display_name || session.user.email?.split('@')[0]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Fixed Header */}
      <div className="flex-shrink-0 z-50">
        <SeekerHeader userName={userName} onLogout={handleLogout} />
      </div>

      {/* Main Content Area */}
      <main 
        ref={mainContentRef} 
        className="flex-1 overflow-y-auto bg-muted/30 pb-20 lg:pb-0"
      >
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <SeekerMobileNav />
    </div>
  );
}
