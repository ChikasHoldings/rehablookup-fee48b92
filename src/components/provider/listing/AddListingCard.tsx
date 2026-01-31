import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Building2, Lock, Sparkles, CreditCard, Loader2 } from "lucide-react";
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
}

export function AddListingCard({ 
  canAdd, 
  used, 
  limit, 
  planTier, 
  canPurchaseSlot = false,
  onAddClick 
}: AddListingCardProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchaseSlot = async () => {
    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-listing-slot");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error purchasing listing slot:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  if (!canAdd) {
    // Pro user at capacity - show purchase option
    if (canPurchaseSlot) {
      return (
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-foreground mb-1">
                  Add Another Listing
                </h3>
                <p className="text-sm text-muted-foreground">
                  You've used all {limit} listings. Purchase additional slots for $49 each (one-time).
                </p>
              </div>
              <Button 
                onClick={handlePurchaseSlot}
                disabled={isPurchasing}
                className="gap-2 shrink-0"
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
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-foreground mb-1">
                Listing Limit Reached
              </h3>
              <p className="text-sm text-muted-foreground">
                Free accounts are limited to 1 listing. Upgrade to Pro for up to 5 listings.
              </p>
            </div>
            <Button asChild className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shrink-0">
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
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors shrink-0">
            <Plus className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
              Add New Listing
            </h3>
            <p className="text-sm text-muted-foreground">
              Create another facility listing ({used} of {limit} used)
            </p>
          </div>
          <Button className="gap-2 shrink-0">
            <Building2 className="h-4 w-4" />
            Add Facility
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
