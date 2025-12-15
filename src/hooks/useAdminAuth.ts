import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export function useAdminAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async (userId: string) => {
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
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          if (session?.user) {
            setUser(session.user);
            const adminStatus = await checkAdminStatus(session.user.id);
            setIsAdmin(adminStatus);
            if (!adminStatus) {
              navigate("/", { replace: true });
            }
          } else {
            setUser(null);
            setIsAdmin(false);
            navigate("/admin-login", { replace: true });
          }
        } finally {
          setIsLoading(false);
        }
      }
    );

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        try {
          if (session?.user) {
            setUser(session.user);
            const adminStatus = await checkAdminStatus(session.user.id);
            setIsAdmin(adminStatus);
            if (!adminStatus) {
              navigate("/", { replace: true });
            }
          } else {
            navigate("/admin-login", { replace: true });
          }
        } finally {
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error getting auth session:", error);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login", { replace: true });
  };

  return { user, isAdmin, isLoading, logout };
}
