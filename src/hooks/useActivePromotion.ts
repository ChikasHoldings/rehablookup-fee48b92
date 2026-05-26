import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";

export type PromoAudience = "free" | "pro";
export type PromoTarget = "pro" | "featured" | "concierge";

export interface ActivePromotion {
  id: string;
  name: string;
  audience: string;
  target_product: PromoTarget;
  discount_percent: number | null;
  discount_duration_months: number | null;
  headline: string;
  subcopy: string | null;
  urgency_label: string | null;
  cta_label: string | null;
  starts_at: string;
  ends_at: string;
}

/**
 * Resolve the live conversion promo for a provider, scoped to their tier:
 *   • Free (no active Pro)                 → audience "free"  (upsell Pro)
 *   • Pro without any add-on               → audience "pro"   (upsell Featured/Concierge)
 *   • Pro WITH an add-on (already converted)→ no promo (audience null)
 *
 * Reads only the currently-live promo via the get_active_promotion RPC (drafts
 * and future-dated promos are never exposed). Returns { promo, audience }.
 */
export function useActivePromotion(facilityId?: string) {
  const { data: subscription } = useFacilitySubscription(facilityId);

  const isPro = subscription?.tier === "pro" && subscription?.status === "active";
  const hasAddon =
    subscription?.has_featured === true || subscription?.has_concierge_partner === true;

  const audience: PromoAudience | null = !subscription
    ? null
    : !isPro
      ? "free"
      : !hasAddon
        ? "pro"
        : null;

  const { data: promo } = useQuery({
    queryKey: ["active-promotion", audience],
    queryFn: async (): Promise<ActivePromotion | null> => {
      if (!audience) return null;
      const { data, error } = await supabase.rpc("get_active_promotion", { p_audience: audience });
      if (error) throw error;
      return (data as unknown as ActivePromotion | null) ?? null;
    },
    enabled: !!audience,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  return { promo: promo ?? null, audience };
}
