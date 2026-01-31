import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook that redirects authenticated providers away from public/seeker routes
 * to their provider panel. This enforces separation between provider and public experiences.
 * 
 * Provider detection is based on having a profile in the `profiles` table (provider profiles).
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

        // Check if user has a provider profile (profiles table is for providers only)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const userIsProvider = !!profile;
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
