import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

type ActivityEventType = 
  | "sign_in" 
  | "password_change" 
  | "profile_update" 
  | "email_change" 
  | "avatar_update"
  | "avatar_remove";

interface LogActivityParams {
  eventType: ActivityEventType;
  description: string;
  metadata?: Record<string, Json>;
}

// Simple function for seeker settings
export async function logActivity({ eventType, description, metadata }: LogActivityParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from("account_activity_log").insert([{
      user_id: session.user.id,
      event_type: eventType,
      event_description: description,
      metadata: (metadata || {}) as Json,
    }]);
  } catch (error) {
    // Silently fail - activity logging shouldn't break the app
    console.error("Failed to log activity:", error);
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
