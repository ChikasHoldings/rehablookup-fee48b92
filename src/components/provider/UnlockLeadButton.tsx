import { useState } from "react";
import { Lock, Zap, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { useLeadUnlocks } from "@/hooks/useLeadUnlocks";
import { useProviderCredits } from "@/hooks/useProviderCredits";
import { useProStatus } from "@/hooks/useProStatus";
import { cn } from "@/lib/utils";

// Default unlock price in cents
const BASE_UNLOCK_PRICE_CENTS = 2500; // $25

interface UnlockLeadButtonProps {
  leadId: string;
  facilityId: string;
  leadName?: string;
  variant?: "default" | "compact" | "card";
  className?: string;
  onUnlockSuccess?: () => void;
}

export function UnlockLeadButton({
  leadId,
  facilityId,
  leadName = "this lead",
  variant = "default",
  className,
  onUnlockSuccess,
}: UnlockLeadButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { unlockLead, isUnlocking, isLeadUnlocked } = useLeadUnlocks(facilityId);
  const { balance } = useProviderCredits(facilityId);
  const { data: proStatus } = useProStatus(facilityId);

  // Calculate price with Pro discount
  const discountPercent = proStatus?.isPro ? (proStatus.unlockDiscountPercent ?? 20) : 0;
  const finalPrice = Math.round(BASE_UNLOCK_PRICE_CENTS * (1 - discountPercent / 100));
  const hasEnoughCredits = balance >= finalPrice;

  // If already unlocked, don't show button
  if (isLeadUnlocked(leadId)) {
    return null;
  }

  const handleUnlock = async () => {
    if (!hasEnoughCredits) {
      // Redirect to purchase credits
      window.location.href = `/provider/credits?purchase_credits=true&amount=${finalPrice}`;
      return;
    }

    await unlockLead.mutateAsync({
      leadId,
      facilityId,
      paymentMethod: 'credits',
    });
    setShowConfirmDialog(false);
    onUnlockSuccess?.();
  };

  const priceDisplay = `$${(finalPrice / 100).toFixed(2)}`;
  const originalPriceDisplay = discountPercent > 0 ? `$${(BASE_UNLOCK_PRICE_CENTS / 100).toFixed(2)}` : null;

  if (variant === "compact") {
    return (
      <Button
        size="sm"
        variant="secondary"
        className={cn("gap-1.5", className)}
        onClick={() => setShowConfirmDialog(true)}
        disabled={isUnlocking}
      >
        {isUnlocking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Lock className="h-3.5 w-3.5" />
        )}
        Unlock {priceDisplay}
      </Button>
    );
  }

  if (variant === "card") {
    return (
      <>
        <div 
          onClick={() => setShowConfirmDialog(true)}
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer",
            className
          )}
        >
          <Button size="sm" className="gap-1.5 shadow-lg" disabled={isUnlocking}>
            {isUnlocking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            Unlock for {priceDisplay}
          </Button>
        </div>

        <UnlockConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          leadName={leadName}
          finalPrice={finalPrice}
          originalPrice={originalPriceDisplay ? BASE_UNLOCK_PRICE_CENTS : null}
          discountPercent={discountPercent}
          hasEnoughCredits={hasEnoughCredits}
          currentBalance={balance}
          onConfirm={handleUnlock}
          isLoading={isUnlocking}
        />
      </>
    );
  }

  // Default variant
  return (
    <>
      <Button
        className={cn("gap-2", className)}
        onClick={() => setShowConfirmDialog(true)}
        disabled={isUnlocking}
      >
        {isUnlocking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        <span>Unlock Lead</span>
        <span className="font-bold">{priceDisplay}</span>
        {discountPercent > 0 && (
          <span className="text-xs line-through opacity-60">{originalPriceDisplay}</span>
        )}
      </Button>

      <UnlockConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        leadName={leadName}
        finalPrice={finalPrice}
        originalPrice={originalPriceDisplay ? BASE_UNLOCK_PRICE_CENTS : null}
        discountPercent={discountPercent}
        hasEnoughCredits={hasEnoughCredits}
        currentBalance={balance}
        onConfirm={handleUnlock}
        isLoading={isUnlocking}
      />
    </>
  );
}

interface UnlockConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  finalPrice: number;
  originalPrice: number | null;
  discountPercent: number;
  hasEnoughCredits: boolean;
  currentBalance: number;
  onConfirm: () => void;
  isLoading: boolean;
}

function UnlockConfirmDialog({
  open,
  onOpenChange,
  leadName,
  finalPrice,
  originalPrice,
  discountPercent,
  hasEnoughCredits,
  currentBalance,
  onConfirm,
  isLoading,
}: UnlockConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Unlock Lead
          </DialogTitle>
          <DialogDescription>
            View full contact details and connect with {leadName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price breakdown */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Unlock price</span>
              <div className="flex items-center gap-2">
                {originalPrice && (
                  <span className="text-sm line-through text-muted-foreground">
                    ${(originalPrice / 100).toFixed(2)}
                  </span>
                )}
                <span className="font-bold text-foreground">
                  ${(finalPrice / 100).toFixed(2)}
                </span>
              </div>
            </div>
            
            {discountPercent > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <span className="text-sm flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  Pro Discount
                </span>
                <span className="text-sm font-medium">-{discountPercent}%</span>
              </div>
            )}
            
            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your balance</span>
              <span className={cn(
                "font-medium",
                hasEnoughCredits ? "text-foreground" : "text-destructive"
              )}>
                ${(currentBalance / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* What you'll get */}
          <div className="space-y-2">
            <p className="text-sm font-medium">What you'll get:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Full name and contact details</li>
              <li>• Phone number and email</li>
              <li>• Complete intake information</li>
              <li>• Ability to reach out directly</li>
            </ul>
          </div>

          {!hasEnoughCredits && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                You need ${((finalPrice - currentBalance) / 100).toFixed(2)} more in credits. 
                Click below to add credits to your account.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : hasEnoughCredits ? (
              <Lock className="h-4 w-4 mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            {hasEnoughCredits ? `Unlock for $${(finalPrice / 100).toFixed(2)}` : "Buy Credits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
