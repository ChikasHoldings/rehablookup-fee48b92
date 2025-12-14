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
  lead_limit: 0,
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

      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("Error checking subscription:", error);
        return DEFAULT_SUBSCRIPTION;
      }
      
      return data as SubscriptionData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
  });
}

export const PLAN_DETAILS = {
  basic: {
    name: "Basic Listing",
    price: "$0",
    period: "/month",
    description: "Public profile with no lead delivery",
    lead_limit: 0,
    featured: false,
    features: [
      "Public profile listing",
      "Logo and gallery upload",
      "Basic search visibility",
      "0 leads/month",
    ],
  },
  professional: {
    name: "Professional",
    price: "$349",
    period: "/month",
    description: "Start receiving qualified leads",
    lead_limit: 25,
    featured: false,
    features: [
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
    featured: true,
    features: [
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
