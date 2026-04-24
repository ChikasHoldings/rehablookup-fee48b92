import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { useUnlockPricing, type InquiryType } from "@/hooks/useUnlockPricing";
import { useLeadAccess } from "@/hooks/useLeadAccess";
import { InquiryTypeBadge, getInquiryTypeLabel } from "./InquiryTypeBadge";
import { cn } from "@/lib/utils";

interface UnlockLeadButtonProps {
  leadId: string;
  facilityId: string;
  leadName?: string;
  inquiryType?: InquiryType | string | null;
  cityState?: string | null;
  variant?: "default" | "compact" | "card";
  className?: string;
  hidePrice?: boolean;
  onUnlockSuccess?: () => void;
}

export function UnlockLeadButton({
  leadId,
  facilityId,
  leadName = "this inquiry",
  inquiryType = "request_info",
  cityState,
  variant = "default",
  className,
  hidePrice = false,
  onUnlockSuccess,
}: UnlockLeadButtonProps) {
  const navigate = useNavigate();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const unlockingRef = useRef(false); // StrictMode double-fire guard
  const { unlockLead, isUnlocking, isLeadUnlocked } = useLeadUnlocks(facilityId);
  const { balance } = useProviderCredits(facilityId);
  const { getPriceForLead, getBasePrice, formatPrice, isPro, proDiscountPercent, getRedistributedPrice } = useUnlockPricing(facilityId);
  const { isRedistributed } = useLeadAccess(leadId, facilityId);

  // Calculate price with dynamic pricing
  const type = (inquiryType || 'request_info') as InquiryType;
  
  // For redistributed leads, use flat $15 price; for original leads, use normal pricing
  const finalPrice = isRedistributed ? getRedistributedPrice() : getPriceForLead(type, false);
  const basePrice = isRedistributed ? getRedistributedPrice() : getBasePrice(type);
  
  // No Pro discount shown for redistributed leads
  const effectiveDiscountPercent = isRedistributed ? 0 : proDiscountPercent;
  const hasEnoughCredits = balance >= finalPrice;

  // If already unlocked, don't show button
  if (isLeadUnlocked(leadId)) {
    return null;
  }

  const handleUnlock = async () => {
    // Prevent double-fire from React StrictMode or rapid clicks
    if (unlockingRef.current) return;
    unlockingRef.current = true;

    try {
      if (!hasEnoughCredits) {
        navigate(`/provider/billing?purchase_credits=true&amount=${finalPrice}`);
        return;
      }

      // M1: client no longer passes discountSaved — server returns the authoritative
      // discountAmount in the mutation result and the hook reads it from there.
      await unlockLead.mutateAsync({
        leadId,
        facilityId,
        paymentMethod: 'credits',
      });
      setShowConfirmDialog(false);
      onUnlockSuccess?.();
    } finally {
      unlockingRef.current = false;
    }
  };

  // Always show confirmation dialog before charging credits
  const handleClick = () => {
    setShowConfirmDialog(true);
  };

  const priceDisplay = formatPrice(finalPrice);
  // Only show original price strikethrough for non-redistributed leads with Pro discount
  const originalPriceDisplay = (!isRedistributed && isPro) ? formatPrice(basePrice) : null;

  if (variant === "compact") {
    return (
      <Button
        size="sm"
        variant="secondary"
        className={cn("gap-1.5", className)}
        onClick={handleClick}
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
          onClick={handleClick}
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
          inquiryType={type}
          cityState={cityState}
          finalPrice={finalPrice}
          originalPrice={(!isRedistributed && isPro) ? basePrice : null}
          discountPercent={effectiveDiscountPercent}
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
        onClick={handleClick}
        disabled={isUnlocking}
      >
        {isUnlocking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        <span>Unlock Lead</span>
        {!hidePrice && (
          <>
            <span className="font-bold">{priceDisplay}</span>
            {effectiveDiscountPercent > 0 && originalPriceDisplay && (
              <span className="text-xs line-through opacity-60">{originalPriceDisplay}</span>
            )}
          </>
        )}
      </Button>

        <UnlockConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          leadName={leadName}
          inquiryType={type}
          cityState={cityState}
          finalPrice={finalPrice}
          originalPrice={(!isRedistributed && isPro) ? basePrice : null}
          discountPercent={effectiveDiscountPercent}
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
  inquiryType: InquiryType;
  cityState?: string | null;
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
  inquiryType,
  cityState,
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
            Unlock Inquiry
          </DialogTitle>
          <DialogDescription>
            View full contact details and connect with {leadName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Inquiry Summary */}
          <div className="flex items-center gap-3">
            <InquiryTypeBadge type={inquiryType} size="md" />
            {cityState && (
              <span className="text-sm text-muted-foreground">{cityState}</span>
            )}
          </div>

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

          {/* Upgrade nudge for Free providers */}
          {!discountPercent && (
            <Link
              to="/provider/pro-upgrade"
              className="block bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg p-3 transition-colors"
            >
              <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Upgrade to Pro and save 20% on this lead
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pro providers also get priority access to redistributed leads
              </p>
            </Link>
          )}

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
