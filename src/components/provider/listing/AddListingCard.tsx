import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Building2, Lock, Sparkles, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddListingCardProps {
  canAdd: boolean;
  used: number;
  limit: number;
  planTier: "pro" | "free";
  canPurchaseSlot?: boolean;
  onAddClick: () => void;
  onSlotPurchased?: () => void;
}

export function AddListingCard({ 
  canAdd, 
  used, 
  limit, 
  planTier, 
  canPurchaseSlot = false,
  onAddClick,
  onSlotPurchased 
}: AddListingCardProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle slot purchase confirmation from URL params
  useEffect(() => {
    const slotPurchased = searchParams.get("slot_purchased");
    const slotCancelled = searchParams.get("slot_cancelled");

    if (slotPurchased === "true") {
      toast.success("Listing slot purchased successfully! You can now add another facility.", {
        duration: 5000,
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      });
      // Clear the param and trigger refetch
      setSearchParams((prev) => {
        prev.delete("slot_purchased");
        return prev;
      });
      onSlotPurchased?.();
    } else if (slotCancelled === "true") {
      toast.info("Slot purchase was cancelled.");
      setSearchParams((prev) => {
        prev.delete("slot_cancelled");
        return prev;
      });
    }
  }, [searchParams, setSearchParams, onSlotPurchased]);

  const handlePurchaseSlot = async () => {
    setIsPurchasing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("purchase-listing-slot", {
        method: "POST",
      });
      
      if (error) {
        console.error("[AddListingCard] Invoke error:", error);
        throw error;
      }
      
      if (data?.url && (data.url.startsWith("https://checkout.stripe.com") || data.url.startsWith("https://billing.stripe.com"))) {
        window.location.href = data.url;
      } else if (data?.url) {
        throw new Error("Invalid checkout URL");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("[AddListingCard] Error purchasing listing slot:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout";
      toast.error(errorMessage + ". Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!canAdd) {
    // Pro user at capacity - show purchase option
    if (canPurchaseSlot) {
      return (
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-foreground text-sm sm:text-base mb-0.5 sm:mb-1">
                  Add Another Listing
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  You've used all {limit} listings. Purchase additional slots for $49 each.
                </p>
              </div>
              <Button 
                onClick={handlePurchaseSlot}
                disabled={isPurchasing}
                className="gap-2 shrink-0 w-full sm:w-auto h-9 sm:h-10 text-sm"
              >
                {isPurchasing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Buy Slot - $49
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Free user at capacity - show upgrade prompt
    return (
      <Card className="border-2 border-dashed border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-foreground text-sm sm:text-base mb-0.5 sm:mb-1">
                Listing Limit Reached
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Free accounts are limited to 1 listing. Upgrade to Pro for up to 5 listings.
              </p>
            </div>
            <Button asChild className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shrink-0 w-full sm:w-auto h-9 sm:h-10 text-sm">
              <Link to="/provider/billing">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="border-2 border-dashed border-primary/30 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all duration-200 cursor-pointer group"
      onClick={onAddClick}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors shrink-0">
            <Plus className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-0.5 sm:mb-1 group-hover:text-primary transition-colors">
              Add New Listing
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Create another facility listing ({used} of {limit} used)
            </p>
          </div>
          <Button className="gap-2 shrink-0 w-full sm:w-auto h-9 sm:h-10 text-sm">
            <Building2 className="h-4 w-4" />
            Add Facility
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
