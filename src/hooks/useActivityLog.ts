import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type ActivityEventType =
  | "sign_in"
  | "sign_out"
  | "password_change"
  | "profile_update"
  | "email_change"
  | "avatar_update"
  | "avatar_remove"
  | "phone_verify";

interface LogActivityParams {
  eventType: ActivityEventType;
  description: string;
  metadata?: Record<string, Json>;
}

// Simple function for seeker settings.
//
// The direct `from('account_activity_log').insert(...)` path is blocked by
// RLS — only service_role can INSERT into the table (intentional, to stop
// a malicious client from forging entries against another user_id). We
// route through a SECURITY DEFINER RPC `log_account_activity` instead. The
// function reads `auth.uid()` server-side, so the user_id is authoritative
// and clients cannot impersonate. event_type is whitelisted inside the
// function; description is length-checked.
export async function logActivity({ eventType, description, metadata }: LogActivityParams) {
  try {
    const { error } = await supabase.rpc("log_account_activity", {
      p_event_type: eventType,
      p_event_description: description,
      p_metadata: (metadata || {}) as Json,
    });
    if (error) {
      // Logging is best-effort — never block the user-facing flow. Surface
      // to console so ops can spot misconfiguration (e.g. RPC removed, JWT
      // expired, new event_type not whitelisted) without breaking the app.
      console.error("[logActivity] failed:", error.message);
    }
  } catch (error) {
    console.error("[logActivity] unexpected error:", error);
  }
}

// React Query mutation hook for provider settings
export const useLogActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      eventType,
      eventDescription,
      metadata,
    }: {
      userId: string;
      eventType: string;
      eventDescription: string;
      metadata?: Record<string, Json>;
    }) => {
      const { error } = await supabase.from("account_activity_log").insert([{
        user_id: userId,
        event_type: eventType,
        event_description: eventDescription,
        metadata: (metadata || {}) as Json,
      }]);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["activity-log", variables.userId] });
    },
  });
};
