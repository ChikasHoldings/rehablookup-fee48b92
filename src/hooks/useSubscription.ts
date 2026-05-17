import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";

export interface SubscriptionData {
  subscribed: boolean;
  isPro: boolean;
  plan: "free" | "pro";
  plan_name: string;
  subscription_end: string | null;
  current_period_start: string | null;
  product_id?: string;
  status?: 'active' | 'past_due' | 'trialing' | 'canceled' | 'incomplete' | null;
  cancel_at_period_end?: boolean;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  subscribed: false,
  isPro: false,
  plan: "free",
  plan_name: "Free Listing",
  subscription_end: null,
  current_period_start: null,
  status: null,
  cancel_at_period_end: false,
};

const SUBSCRIPTION_CACHE_KEY = "subscription_cache";
const SUBSCRIPTION_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// Get cached subscription from localStorage for instant loading
function getCachedSubscription(): SubscriptionData | null {
  try {
    const cached = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Return cached data if not expired
      if (Date.now() - timestamp < SUBSCRIPTION_CACHE_TTL) {
        return data as SubscriptionData;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Save subscription to localStorage cache
function cacheSubscription(data: SubscriptionData) {
  try {
    localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore storage errors
  }
}

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async (): Promise<SubscriptionData> => {
      const session = await getCachedSession();
      
      
      
      if (!session) {
        
        return DEFAULT_SUBSCRIPTION;
      }

      try {
        
        const { data, error } = await supabase.functions.invoke("check-subscription");
        
        if (error) {
          console.error("[useSubscription] Error checking subscription:", error);
          // Return cached data on error
          return getCachedSubscription() || DEFAULT_SUBSCRIPTION;
        }
        
        
        const subscriptionData = data as SubscriptionData;
        // Cache the result for instant future loads
        cacheSubscription(subscriptionData);
        return subscriptionData;
      } catch (err) {
        console.error("[useSubscription] Network error checking subscription:", err);
        // Return cached data on network error
        return getCachedSubscription() || DEFAULT_SUBSCRIPTION;
      }
    },
    // Use cached data for instant initial render
    placeholderData: getCachedSubscription() || undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour cache
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// MONETIZATION (EKRA flat-fee): two tiers + 2 independent add-ons.
// - Free: directory listing, family contact form, 5 photos.
// - Pro:  $99/mo flat fee — verified badge, lead analytics, priority
//         placement (+50 ranking), 10 photos + 1 video, Marketing Hub.
//         Featured ($599/mo) and Concierge ($1,000/mo) are independent
//         add-ons available to Pro subscribers.
// No per-lead unlock fees, no credit purchases, no per-placement charges.
export const PLAN_DETAILS = {
  free: {
    name: "Free Listing",
    price: "Free",
    period: "",
    description: "Get listed and receive direct inquiries",
    location_limit: 1,
    unlock_discount: 0,
    features: [
      "Directory placement",
      "Family contact form on your profile",
      "Up to 5 photos",
      "Basic dashboard",
    ],
    notIncluded: [
      "Verified badge",
      "Lead analytics + response insights",
      "Priority placement (+50 ranking)",
      "10 photos + 1 facility video",
      "Marketing Hub (Featured + Concierge add-ons)",
    ],
  },
  pro: {
    name: "Pro",
    price: "$99",
    period: "/mo",
    description: "Verified listing, lead analytics, priority placement",
    location_limit: 5,
    unlock_discount: 0,
    features: [
      "Verified badge on listing",
      "Lead analytics + response insights",
      "Priority placement on city & state pages",
      "+50 ranking-score boost",
      "10 photos + 1 facility video",
      "Marketing Hub (Featured + Concierge add-ons)",
      "Up to 5 facility listings",
    ],
    // Stripe price/product ids are read from STRIPE_PRICE_PRO_ANNUAL
    // at runtime (see scripts/stripe-setup-monetization.ts). Static
    // ids are no longer hardcoded here.
    price_id: null,
    product_id: null,
  },
};

