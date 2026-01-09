import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProStatus } from "./useProStatus";

export type InquiryType = 'request_info' | 'request_callback';

interface UnlockPricing {
  request_info: { base: number; pro: number };
  request_callback: { base: number; pro: number };
  proDiscountPercent: number;
}

// Default prices in cents
const DEFAULT_PRICES = {
  request_info: 3900,      // $39.00
  request_callback: 4900,  // $49.00
};
const DEFAULT_PRO_DISCOUNT = 20;

export function useUnlockPricing(facilityId?: string) {
  const { data: proStatus } = useProStatus(facilityId);

  const { data: pricing, isLoading } = useQuery({
    queryKey: ["unlock-pricing"],
    queryFn: async () => {
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "unlock_price_request_info",
          "unlock_price_request_callback",
          "pro_discount_percent"
        ]);

      const prices = { ...DEFAULT_PRICES };
      let proDiscountPercent = DEFAULT_PRO_DISCOUNT;

      if (settings) {
        for (const setting of settings) {
          const value = setting.setting_value as Record<string, number>;
          if (setting.setting_key === "unlock_price_request_info") {
            prices.request_info = value?.cents ?? DEFAULT_PRICES.request_info;
          } else if (setting.setting_key === "unlock_price_request_callback") {
            prices.request_callback = value?.cents ?? DEFAULT_PRICES.request_callback;
          } else if (setting.setting_key === "pro_discount_percent") {
            proDiscountPercent = value?.value ?? DEFAULT_PRO_DISCOUNT;
          }
        }
      }

      return { prices, proDiscountPercent };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const prices = pricing?.prices ?? DEFAULT_PRICES;
  const proDiscountPercent = proStatus?.isPro 
    ? (proStatus.unlockDiscountPercent ?? pricing?.proDiscountPercent ?? DEFAULT_PRO_DISCOUNT)
    : 0;

  const calculateProPrice = (basePrice: number): number => {
    return Math.round(basePrice * (1 - proDiscountPercent / 100));
  };

  const unlockPricing: UnlockPricing = {
    request_info: {
      base: prices.request_info,
      pro: calculateProPrice(prices.request_info),
    },
    request_callback: {
      base: prices.request_callback,
      pro: calculateProPrice(prices.request_callback),
    },
    proDiscountPercent,
  };

  const getPrice = (inquiryType: InquiryType): number => {
    const priceInfo = unlockPricing[inquiryType];
    return proStatus?.isPro ? priceInfo.pro : priceInfo.base;
  };

  const getBasePrice = (inquiryType: InquiryType): number => {
    return unlockPricing[inquiryType].base;
  };

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return {
    pricing: unlockPricing,
    isPro: proStatus?.isPro ?? false,
    proDiscountPercent,
    getPrice,
    getBasePrice,
    formatPrice,
    isLoading,
  };
}
