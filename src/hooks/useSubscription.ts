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
  lead_limit: 0, // Basic plan does NOT receive routed leads
  qualified_lead_limit: 0,
  direct_lead_limit: -1, // Unlimited direct inquiries only
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
        
        // Return the result as-is - Basic plan should have lead_limit = 0
        return data as SubscriptionData;
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
    price: "Free",
    period: "",
    description: "Get listed and be discoverable",
    lead_limit: 0, // No routed leads for Basic
    qualified_lead_limit: 0,
    direct_lead_limit: -1, // Unlimited direct inquiries from profile only
    location_limit: 1,
    featured: false,
    features: [
      "Public provider profile",
      "Listed in search results",
      "Facility name, location & services",
      "Website link",
      "Receive direct inquiries only",
      "Basic dashboard (views & clicks)",
    ],
    notIncluded: [
      "Exclusive qualified leads",
      "Lead routing",
      "Priority placement",
      "Homepage features",
      "Email lead notifications",
    ],
    upgradeMicrocopy: "Upgrade to receive exclusive qualified leads delivered directly to you.",
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