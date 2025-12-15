import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionData {
  subscribed: boolean;
  plan: "basic" | "professional" | "featured";
  plan_name: string;
  lead_limit: number;
  subscription_end: string | null;
  product_id?: string;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  subscribed: false,
  plan: "basic",
  plan_name: "Basic Listing",
  lead_limit: 5, // Basic plan includes 5 leads for display purposes
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
        
        // Ensure lead_limit is at least 5 for display purposes
        const result = data as SubscriptionData;
        if (result.lead_limit === 0) {
          result.lead_limit = 5;
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
    lead_limit: 5,
    location_limit: 1,
    featured: false,
    features: [
      "1 facility location",
      "Public profile listing",
      "Logo and gallery upload",
      "Basic search visibility",
      "5 leads/month",
    ],
  },
  professional: {
    name: "Professional",
    price: "$349",
    period: "/month",
    description: "Start receiving qualified leads",
    lead_limit: 25,
    location_limit: 3,
    featured: false,
    features: [
      "Up to 3 facility locations",
      "Up to 25 leads/month",
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
    lead_limit: 75,
    location_limit: 5,
    featured: true,
    features: [
      "Up to 5 facility locations",
      "Up to 75 leads/month",
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
