import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook that redirects authenticated providers away from public/seeker routes
 * to their provider panel. This enforces separation between provider and public experiences.
 * 
 * Provider detection is based on having a profile in the `profiles` table (provider profiles).
 * Also checks for admin role to redirect admins to admin panel.
 * 
 * Skips redirect check when:
 * - Page is loaded in an iframe (for preview functionality)
 * - User is on provider or admin routes
 * 
 * @param options.enabled - Whether to enable the redirect check (default: true)
 * @returns { isProvider, isAdmin, isLoading } - Role status and loading state
 */
export function useProviderRedirect(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const navigate = useNavigate();
  const location = useLocation();
  const [isProvider, setIsProvider] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip if disabled or if loaded in an iframe (for preview functionality)
    const isInIframe = window.self !== window.top;
    if (!enabled || isInIframe) {
      setIsLoading(false);
      return;
    }

    const checkRoleStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsProvider(false);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        // Check admin role FIRST (higher priority)
        const { data: adminRole } = await supabase.rpc("has_role", {
          _user_id: session.user.id,
          _role: "admin",
        });

        if (adminRole === true) {
          setIsAdmin(true);
          setIsProvider(false);
          
          const currentPath = location.pathname;
          
          // If admin is on non-admin route, redirect to admin panel
          if (!currentPath.startsWith("/admin")) {
            navigate("/admin", { replace: true });
          }
          
          setIsLoading(false);
          return;
        }

        setIsAdmin(false);

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
            "/login",
            "/provider-signup",
            "/provider-forgot-password",
            "/provider-reset-password",
            "/provider-support",
            "/provider-faq",
            "/provider-resources",
            "/for-providers",
            "/privacy-policy",
            "/terms-of-service",
          ];
          
          // Check if already on provider routes or allowed paths
          const isProviderRoute = currentPath.startsWith("/provider");
          const isAllowedPath = allowedPaths.some(path => currentPath.startsWith(path));
          
          if (!isProviderRoute && !isAllowedPath) {
            // Redirect to provider dashboard
            navigate("/provider/dashboard", { replace: true });
          }
        }
      } catch (error) {
        console.error("Error checking role status:", error);
        setIsProvider(false);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkRoleStatus();
  }, [enabled, navigate, location.pathname]);

  return { isProvider, isAdmin, isLoading };
}
