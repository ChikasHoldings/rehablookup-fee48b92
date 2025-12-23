import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionData {
  subscribed: boolean;
  plan: "basic" | "professional" | "featured";
  plan_name: string;
  lead_limit: number;
  subscription_end: string | null;
  current_period_start: string | null;
  product_id?: string;
  is_featured?: boolean;
  exclusivity?: 'shared' | 'exclusive';
  status?: 'active' | 'past_due' | 'trialing' | 'canceled' | 'incomplete' | null;
  cancel_at_period_end?: boolean;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  subscribed: false,
  plan: "basic",
  plan_name: "Basic Listing",
  lead_limit: 0,
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log("[useSubscription] Session check:", { hasSession: !!session, sessionError });
      
      if (!session) {
        console.warn("[useSubscription] No session, returning default");
        return DEFAULT_SUBSCRIPTION;
      }

      try {
        console.log("[useSubscription] Invoking check-subscription function");
        const { data, error } = await supabase.functions.invoke("check-subscription");
        
        if (error) {
          console.error("[useSubscription] Error checking subscription:", error);
          // Return cached data on error
          return getCachedSubscription() || DEFAULT_SUBSCRIPTION;
        }
        
        console.log("[useSubscription] Subscription result:", data);
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

// UNIFIED LEAD SYSTEM: Plan definitions
// - Professional: 100 shared leads/month (max 2 providers per lead)
// - Featured: 100 exclusive leads/month (1 provider per lead)
export const PLAN_DETAILS = {
  basic: {
    name: "Basic Listing",
    price: "Free",
    period: "",
    description: "Get listed and be discoverable",
    lead_limit: 0, // Basic plan: no qualified leads (direct only with upgrade prompt)
    location_limit: 1,
    gallery_limit: 5, // Basic: up to 5 gallery images
    featured: false,
    exclusivity: 'exclusive' as const,
    features: [
      "Public provider profile",
      "Listed in search results",
      "Facility name, location & services",
      "Basic dashboard (views & clicks)",
    ],
    notIncludedDetails: [
      "Phone number hidden on profile",
      "Website link hidden on profile",
    ],
    notIncluded: [
      "Qualified leads",
      "Lead routing",
      "Priority placement",
      "Homepage features",
      "Email lead notifications",
    ],
    upgradeMicrocopy: "Upgrade to receive qualified leads delivered directly to you.",
  },
  professional: {
    name: "Professional",
    price: "$399",
    period: "/month",
    description: "Shared leads + steady visibility",
    lead_limit: 100, // 100 shared qualified leads/month
    location_limit: 3,
    gallery_limit: 10, // Professional: up to 10 gallery images
    featured: false,
    exclusivity: 'shared' as const,
    features: [
      "100 qualified leads/month (shared)",
      "Unlimited calls from profile",
      "Unlimited website visits from profile",
      "Up to 3 facility locations",
      "Up to 10 gallery photos",
      "Standard search placement",
      "Email lead notifications",
      "Lead management dashboard",
      "Performance analytics & insights",
    ],
    microcopy: "Each lead may be shared with up to one other Professional provider.",
    price_id: "price_1Sel1C9fxdThyiakWLfgbl9K",
    product_id: "prod_Tbyz1bf6iYyzYd",
  },
  featured: {
    name: "Featured",
    price: "$1,099",
    period: "/month",
    description: "Exclusive leads & maximum visibility",
    lead_limit: 100, // 100 exclusive qualified leads/month
    location_limit: 5,
    gallery_limit: 10, // Featured: up to 10 gallery images
    featured: true,
    exclusivity: 'exclusive' as const,
    features: [
      "100 exclusive qualified leads/month",
      "Unlimited calls from profile",
      "Unlimited website visits from profile",
      "Up to 5 facility locations",
      "Up to 10 gallery photos",
      "Homepage featured placement",
      "Priority search placement",
      "Gold Featured badge",
      "Priority email support",
      "Advanced analytics",
      "All Professional features included",
    ],
    microcopy: "Every lead is exclusively yours — never shared with other providers.",
    price_id: "price_1Sel1P9fxdThyiakj5MaAvOE",
    product_id: "prod_TbyzJVNOQL71NN",
  },
};

// Plan enforcement rules
export const PLAN_RULES = {
  professional: {
    monthly_cap: 100,
    exclusivity: 'shared' as const,
    max_providers_per_lead: 2,
    allows_exclusive: false,
  },
  featured: {
    monthly_cap: 100,
    exclusivity: 'exclusive' as const,
    max_providers_per_lead: 1,
    allows_shared: false,
  },
};

// Marketing messaging
export const EXCLUSIVITY_MESSAGE = "Professional leads are shared with max 1 other provider. Featured leads are 100% exclusive.";
