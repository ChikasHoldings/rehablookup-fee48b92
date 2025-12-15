import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionData {
  subscribed: boolean;
  plan: "basic" | "professional" | "featured";
  plan_name: string;
  lead_limit: number;
  qualified_lead_limit?: number;
  direct_lead_limit?: number; // -1 means unlimited
  subscription_end: string | null;
  product_id?: string;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  subscribed: false,
  plan: "basic",
  plan_name: "Basic Listing",
  lead_limit: 4, // Basic plan includes 4 leads/month (1 per week)
  qualified_lead_limit: 4,
  direct_lead_limit: 4,
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
        
        // For Basic plan, ensure lead_limit is 4
        const result = data as SubscriptionData;
        if (result.lead_limit === 0 || (result.plan === "basic" && result.lead_limit !== 4)) {
          result.lead_limit = 4;
        }
        
        return result;
      } catch (err) {
        console.error("Network error checking subscription:", err);
        return DEFAULT_SUBSCRIPTION;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
    retry: 2, // Retry failed requests up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export const PLAN_DETAILS = {
  basic: {
    name: "Basic Listing",
    price: "$0",
    period: "/month",
    description: "Public profile with limited leads",
    lead_limit: 4, // 4 qualified leads/month (1 per week)
    qualified_lead_limit: 4,
    direct_lead_limit: 4, // Direct leads also limited for Basic
    location_limit: 1,
    featured: false,
    features: [
      "1 facility location",
      "Public profile listing",
      "Logo and gallery upload",
      "Basic search visibility",
      "4 leads/month (1 per week)",
    ],
  },
  professional: {
    name: "Professional",
    price: "$349",
    period: "/month",
    description: "Qualified leads + unlimited direct inquiries",
    lead_limit: 25, // 25 qualified leads/month
    qualified_lead_limit: 25,
    direct_lead_limit: -1, // Unlimited direct leads from profile
    location_limit: 3,
    featured: false,
    features: [
      "Up to 3 facility locations",
      "25 qualified leads/month",
      "Unlimited direct profile inquiries",
      "Standard search placement",
      "Email lead notifications",
      "Lead management dashboard",
      "Analytics & insights",
    ],
    price_id: "price_1SeNZz9fxdThyiakUJKysCFz",
    product_id: "prod_TbalLOPujTIoUe",
  },
  featured: {
    name: "Featured",
    price: "$899",
    period: "/month",
    description: "Maximum visibility & lead volume",
    lead_limit: 75, // 75 qualified leads/month
    qualified_lead_limit: 75,
    direct_lead_limit: -1, // Unlimited direct leads
    location_limit: 5,
    featured: true,
    features: [
      "Up to 5 facility locations",
      "75 qualified leads/month",
      "Unlimited direct profile inquiries",
      "Homepage featured section",
      "Priority search placement",
      "Gold Featured badge",
      "Priority email support",
      "All Professional features",
    ],
    price_id: "price_1SeNaD9fxdThyiakNFokIAVC",
    product_id: "prod_TbalOeJZA2ZoJl",
  },
};
