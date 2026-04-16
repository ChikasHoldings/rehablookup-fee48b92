import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";

type ContactType = "call" | "email" | "sms";

/**
 * Lightweight hook to log provider contact actions on leads.
 * Fire-and-forget — never blocks UI or throws to caller.
 */
export function useLeadContactTracking() {
  const trackContact = useCallback(
    async (leadId: string, facilityId: string, contactType: ContactType) => {
      try {
        const session = await getCachedSession();
        if (!session) return;

        await supabase.from("lead_contact_events" as any).insert({
          lead_id: leadId,
          facility_id: facilityId,
          provider_id: session.user.id,
          contact_type: contactType,
        });
      } catch {
        // Fire-and-forget — never block the contact action
      }
    },
    []
  );

  return { trackContact };
}
