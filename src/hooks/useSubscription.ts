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
    price: "$399",
    period: "/month",
    description: "Exclusive leads + steady visibility",
    lead_limit: 25, // 25 exclusive qualified leads/month
    qualified_lead_limit: 25,
    direct_lead_limit: -1, // Unlimited direct leads from profile
    location_limit: 3,
    featured: false,
    features: [
      "25 exclusive qualified leads/month",
      "Unlimited direct profile inquiries",
      "Up to 3 facility locations",
      "Standard search placement",
      "Email lead notifications",
      "Lead management dashboard",
      "Performance analytics & insights",
    ],
    microcopy: "Each lead is delivered exclusively to one provider — never shared.",
    price_id: "price_1Sel1C9fxdThyiakWLfgbl9K",
    product_id: "prod_Tbyz1bf6iYyzYd",
  },
  featured: {
    name: "Featured",
    price: "$1,099",
    period: "/month",
    description: "Maximum visibility & priority access",
    lead_limit: 75, // 75 exclusive qualified leads/month
    qualified_lead_limit: 75,
    direct_lead_limit: -1, // Unlimited direct leads
    location_limit: 5,
    featured: true,
    features: [
      "75 exclusive qualified leads/month",
      "Unlimited direct profile inquiries",
      "Up to 5 facility locations",
      "Homepage featured placement",
      "Priority search placement",
      "Gold Featured badge",
      "Priority email support",
      "Advanced analytics",
      "All Professional features included",
    ],
    microcopy: "Priority access to exclusive leads with enhanced visibility across the platform.",
    price_id: "price_1Sel1P9fxdThyiakj5MaAvOE",
    product_id: "prod_TbyzJVNOQL71NN",
  },
};

// Direct inquiry clarification text for UI usage
export const DIRECT_INQUIRY_CLARIFICATION = "Direct inquiries come from users who contact your profile directly and do not count toward monthly lead limits.";

// Marketing messaging
export const EXCLUSIVITY_MESSAGE = "No shared leads. No bidding. No race to call.";