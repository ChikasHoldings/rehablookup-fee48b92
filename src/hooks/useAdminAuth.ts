import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error("Exception checking admin status:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener with synchronous updates only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Synchronous state updates only
        setUser(session?.user ?? null);

        if (!session?.user) {
          setIsAdmin(false);
          setIsLoading(false);
          navigate("/admin-login", { replace: true });
          return;
        }

        // Defer admin check to avoid deadlock
        setTimeout(async () => {
          try {
            const adminStatus = await checkAdminStatus(session.user.id);
            setIsAdmin(adminStatus);
            if (!adminStatus) {
              navigate("/", { replace: true });
            }
          } catch (err) {
            console.error("Error in deferred admin check:", err);
            setIsAdmin(false);
          } finally {
            setIsLoading(false);
          }
        }, 0);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (!session?.user) {
        setIsLoading(false);
        navigate("/admin-login", { replace: true });
        return;
      }

      // Defer admin check
      setTimeout(async () => {
        try {
          const adminStatus = await checkAdminStatus(session.user.id);
          setIsAdmin(adminStatus);
          if (!adminStatus) {
            navigate("/", { replace: true });
          }
        } catch (err) {
          console.error("Error in initial admin check:", err);
          setIsAdmin(false);
        } finally {
          setIsLoading(false);
        }
      }, 0);
    }).catch((error) => {
      console.error("Error getting auth session:", error);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, checkAdminStatus]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login", { replace: true });
  };

  return { user, isAdmin, isLoading, logout };
}
