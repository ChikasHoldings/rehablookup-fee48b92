import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionData {
  subscribed: boolean;
  plan: "basic" | "professional" | "featured";
  plan_name: string;
  lead_limit: number;
  subscription_end: string | null;
  product_id?: string;
  is_featured?: boolean;
  exclusivity?: 'shared' | 'exclusive';
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  subscribed: false,
  plan: "basic",
  plan_name: "Basic Listing",
  lead_limit: 1, // Basic plan gets 1 lifetime lead
  subscription_end: null,
};

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async (): Promise<SubscriptionData> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return DEFAULT_SUBSCRIPTION;
      }

      try {
        const { data, error } = await supabase.functions.invoke("check-subscription");
        
        if (error) {
          console.error("Error checking subscription:", error);
          return DEFAULT_SUBSCRIPTION;
        }
        
        return data as SubscriptionData;
      } catch (err) {
        console.error("Network error checking subscription:", err);
        return DEFAULT_SUBSCRIPTION;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// UNIFIED LEAD SYSTEM: Plan definitions
// - All leads are now "qualified leads" (no more "inquiry" distinction)
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
    featured: false,
    exclusivity: 'shared' as const,
    features: [
      "100 qualified leads/month (shared)",
      "Unlimited calls from profile",
      "Unlimited website visits from profile",
      "Up to 3 facility locations",
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
    featured: true,
    exclusivity: 'exclusive' as const,
    features: [
      "100 exclusive qualified leads/month",
      "Unlimited calls from profile",
      "Unlimited website visits from profile",
      "Up to 5 facility locations",
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
