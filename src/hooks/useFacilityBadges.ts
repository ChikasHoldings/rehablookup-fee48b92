import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BADGE_TYPES, 
  getAvailableBadges, 
  type FacilityMetrics,
  type BadgeTier,
  type BadgeType,
  type BadgeTierConfig
} from "@/lib/badges/badgeTypes";

interface FacilityBadgeData {
  badge: BadgeType;
  tier: BadgeTier;
  config: BadgeTierConfig | null;
  nextTier: BadgeTierConfig | null;
  progress: number;
}

export function useFacilityBadges(facilityId: string | undefined) {
  return useQuery({
    queryKey: ["facility-badges", facilityId],
    queryFn: async (): Promise<{
      metrics: FacilityMetrics;
      badges: FacilityBadgeData[];
      unlockedBadges: FacilityBadgeData[];
      lockedBadges: FacilityBadgeData[];
    }> => {
      if (!facilityId) throw new Error("Facility ID required");

      // Fetch all required data in parallel
      const [facilityResult, reviewsResult, proResult, inquiriesResult] = await Promise.all([
        supabase
          .from("facilities")
          .select("id, name, verified, featured, status, created_at, listing_completeness_score")
          .eq("id", facilityId)
          .single(),
        supabase
          .from("facility_reviews")
          .select("rating")
          .eq("facility_id", facilityId)
          .eq("status", "approved"),
        supabase
          .from("pro_subscriptions")
          .select("status, current_period_end")
          .eq("facility_id", facilityId)
          .eq("status", "active")
          .maybeSingle(),
        // Use leads_provider_view for accurate count (RLS on leads blocks non-unlocked)
        supabase
          .from("leads_provider_view")
          .select("id", { count: "exact", head: true })
          .eq("facility_id", facilityId),
      ]);

      const facility = facilityResult.data;
      const reviews = reviewsResult.data || [];
      const proSub = proResult.data;
      const inquiryCount = inquiriesResult.count || 0;

      if (!facility) throw new Error("Facility not found");

      // Calculate metrics
      const reviewCount = reviews.length;
      const avgRating = reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;
      
      const createdAt = new Date(facility.created_at);
      const now = new Date();
      const yearsVerified = Math.floor(
        (now.getTime() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );

      const isPro = !!(
        proSub &&
        proSub.status === "active" &&
        (!proSub.current_period_end || new Date(proSub.current_period_end) > now)
      );

      const metrics: FacilityMetrics = {
        avgRating,
        reviewCount,
        yearsVerified,
        isPro,
        isFeatured: facility.featured || false,
        profileCompletion: facility.listing_completeness_score || 0,
        totalInquiries: inquiryCount,
      };

      // Get all badges with unlock status
      const badges = getAvailableBadges(metrics);
      
      // Separate into unlocked and locked
      const unlockedBadges = badges.filter((b) => b.tier !== "locked");
      const lockedBadges = badges.filter((b) => b.tier === "locked");

      return {
        metrics,
        badges,
        unlockedBadges,
        lockedBadges,
      };
    },
    enabled: !!facilityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
