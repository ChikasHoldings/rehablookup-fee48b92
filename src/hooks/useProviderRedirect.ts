import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook that redirects authenticated providers away from public/seeker routes
 * to their provider panel. This enforces separation between provider and public experiences.
 * 
 * Skips redirect check when:
 * - Page is loaded in an iframe (for preview functionality)
 * - User is on provider or admin routes
 * 
 * @param options.enabled - Whether to enable the redirect check (default: true)
 * @returns { isProvider, isLoading } - Provider status and loading state
 */
export function useProviderRedirect(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const [isProvider, setIsProvider] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip if disabled or if loaded in an iframe (for preview functionality)
    const isInIframe = window.self !== window.top;
    if (!enabled || isInIframe) {
      setIsLoading(false);
      return;
    }

    const checkProviderStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsProvider(false);
          setIsLoading(false);
          return;
        }

        // Check if user has any facilities (is a provider)
        const { data: facilities } = await supabase
          .from("facilities")
          .select("id")
          .eq("user_id", session.user.id)
          .limit(1);

        const userIsProvider = facilities && facilities.length > 0;
        setIsProvider(userIsProvider);

        // If user is a provider and on a public/seeker route, redirect to provider panel
        if (userIsProvider) {
          const currentPath = location.pathname;
          
          // Allow certain public routes even for providers
          const allowedPaths = [
            "/provider-login",
            "/provider-signup", 
            "/provider-forgot-password",
            "/provider-reset-password",
            "/admin",
          ];
          
          // Check if already on provider routes, admin routes, or allowed paths
          const isProviderRoute = currentPath.startsWith("/provider");
          const isAdminRoute = currentPath.startsWith("/admin");
          const isAllowedPath = allowedPaths.some(path => currentPath.startsWith(path));
          
          if (!isProviderRoute && !isAdminRoute && !isAllowedPath) {
            // Redirect to provider dashboard
            navigate("/provider/dashboard", { replace: true });
          }
        }
      } catch (error) {
        console.error("Error checking provider status:", error);
        setIsProvider(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkProviderStatus();
  }, [enabled, navigate, location.pathname]);

  return { isProvider, isLoading };
}
