import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke("log-activity", {
        body: {
          user_id: userId,
          event_type: eventType,
          event_description: eventDescription,
          metadata,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["activity-log", variables.userId] });
    },
  });
};
