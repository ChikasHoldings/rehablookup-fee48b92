import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionData {
  subscribed: boolean;
  plan: "free" | "professional" | "enterprise";
  plan_name: string;
  lead_limit: number;
  subscription_end: string | null;
  product_id?: string;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  subscribed: false,
  plan: "free",
  plan_name: "Free Trial",
  lead_limit: 5,
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
  free: {
    name: "Free Trial",
    price: "$0",
    period: "/month",
    description: "Get started with basic features",
    lead_limit: 5,
    features: [
      "Basic listing",
      "Up to 5 leads/month",
      "Email support",
    ],
  },
  professional: {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "Everything you need to grow",
    lead_limit: 75,
    features: [
      "Featured listing",
      "Up to 75 leads/month",
      "Priority support",
      "Analytics dashboard",
      "Lead notifications",
    ],
    price_id: "price_1SeNBt9fxdThyiakUrYBFpFE",
    product_id: "prod_TbaMy3tA8gNlTk",
  },
  enterprise: {
    name: "Enterprise",
    price: "$249",
    period: "/month",
    description: "For large treatment centers",
    lead_limit: 999999,
    features: [
      "Multiple listings",
      "Unlimited leads",
      "Dedicated support",
      "Advanced analytics",
      "API access",
      "Custom integrations",
    ],
    price_id: "price_1SeND19fxdThyiaktubejVtz",
    product_id: "prod_TbaN67Fyjmfhgo",
  },
};
