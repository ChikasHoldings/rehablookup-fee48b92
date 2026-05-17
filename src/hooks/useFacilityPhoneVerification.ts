import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-trigger phone verification for the facility-phone field in the
 * listing-details step.
 *
 * Returns the session userId + whether the supplied `currentPhone`
 * (typically `formData.facilityPhone`) is already covered by the
 * provider's verified phone on `profiles`. If the provider hasn't
 * verified yet, the consumer renders an inline <PhoneVerificationStep>;
 * if they verify, `markVerified()` invalidates the cache so the inline
 * UI collapses to a checked state immediately.
 *
 * Phone numbers are normalized to digit-only strings for comparison so
 * "(214) 555-1212", "214-555-1212", "+1 2145551212" all match.
 */

function digitsOnly(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\D/g, "");
}

interface ProfilePhoneState {
  userId: string | null;
  storedPhone: string | null;
  storedPhoneVerifiedAt: string | null;
}

export function useFacilityPhoneVerification(currentPhone: string) {
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["provider-facility-phone-verification"],
    queryFn: async (): Promise<ProfilePhoneState> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id ?? null;
      if (!userId) return { userId: null, storedPhone: null, storedPhoneVerifiedAt: null };
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, phone, phone_verified_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.warn("[useFacilityPhoneVerification] profile read failed", error);
        return { userId, storedPhone: null, storedPhoneVerifiedAt: null };
      }
      const row = data as { phone: string | null; phone_verified_at: string | null } | null;
      return {
        userId,
        storedPhone: row?.phone ?? null,
        storedPhoneVerifiedAt: row?.phone_verified_at ?? null,
      };
    },
    staleTime: 1000 * 10,
  });

  const userId = profile?.userId ?? null;
  const storedDigits = digitsOnly(profile?.storedPhone);
  const currentDigits = digitsOnly(currentPhone);

  const isVerifiedForCurrentNumber =
    !!profile?.storedPhoneVerifiedAt &&
    storedDigits.length >= 10 &&
    currentDigits.length >= 10 &&
    storedDigits.endsWith(currentDigits.slice(-10));

  const markVerified = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["provider-facility-phone-verification"] });
  }, [qc]);

  return {
    userId,
    isVerifiedForCurrentNumber,
    markVerified,
  };
}
