import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Zap, CreditCard, Loader2, CheckCircle2, Phone, Mail, MessageSquare, Unlock, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [revealedLead, setRevealedLead] = useState<{ name: string | null; email: string | null; phone: string | null } | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
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

  /**
   * Fetch the now-unlocked PII for `leadId` from the masked view, with
   * bounded exponential-backoff retry. RLS may briefly return masked
   * (all-null) values immediately after the unlock row is committed,
   * so an "all PII fields null" response is treated as a transient
   * failure worth retrying.
   */
  type RevealedFields = { name: string | null; email: string | null; phone: string | null };
  type RevealResult =
    | { ok: true; data: RevealedFields }
    | { ok: false; error: string };
  const fetchRevealedLead = async (targetLeadId: string): Promise<RevealResult> => {
    const delays = [300, 800, 1500];
    let lastError = "Unable to load contact details.";

    for (let attempt = 0; attempt < delays.length + 1; attempt++) {
      try {
        const { data, error } = await supabase
          .from("leads_provider_view")
          .select("name, email, phone")
          .eq("id", targetLeadId)
          .maybeSingle();

        if (error) {
          lastError = error.message || lastError;
        } else if (data) {
          const hasAnyPII =
            (data.name && data.name.trim()) ||
            (data.email && data.email.trim()) ||
            (data.phone && data.phone.trim());
          if (hasAnyPII) {
            return {
              ok: true,
              data: {
                name: data.name ?? null,
                email: data.email ?? null,
                phone: data.phone ?? null,
              },
            };
          }
          lastError =
            "Contact details aren't visible yet. This usually clears up in a moment.";
        } else {
          lastError = "Lead not found.";
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : lastError;
      }

      const delay = delays[attempt];
      if (delay !== undefined) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    return { ok: false, error: lastError };
  };

  const loadRevealed = async () => {
    setRevealLoading(true);
    setRevealError(null);
    const result = await fetchRevealedLead(leadId);
    if (result.ok === true) {
      setRevealedLead(result.data);
      setRevealError(null);
    } else {
      setRevealError((result as { ok: false; error: string }).error);
    }
    setRevealLoading(false);
  };

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

      // Open the success dialog immediately — the unlock itself is already
      // confirmed by the server. Reveal fetch runs in the background with
      // retry; failures surface as an in-dialog error + Retry button.
      setRevealedLead(null);
      setRevealError(null);
      setShowSuccessDialog(true);
      onUnlockSuccess?.();
      void loadRevealed();
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

  const sharedDialogs = (
    <>
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
      <UnlockSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        leadId={leadId}
        revealed={revealedLead}
        loading={revealLoading}
        error={revealError}
        onRetry={loadRevealed}
        cityState={cityState}
        amountCharged={finalPrice}
        balanceAfter={Math.max(0, balance - finalPrice)}
      />
    </>
  );

  if (variant === "compact") {
    return (
      <>
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
        {sharedDialogs}
      </>
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
        {sharedDialogs}
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
      {sharedDialogs}
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

interface UnlockSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  revealed: { name: string | null; email: string | null; phone: string | null } | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  cityState?: string | null;
  amountCharged: number;
  balanceAfter: number;
}

function UnlockSuccessDialog({
  open,
  onOpenChange,
  leadId,
  revealed,
  loading,
  error,
  onRetry,
  cityState,
  amountCharged,
  balanceAfter,
}: UnlockSuccessDialogProps) {
  const name = revealed?.name?.trim() || "Lead";
  const email = revealed?.email?.trim() || null;
  const phone = revealed?.phone?.trim() || null;
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
  const smsHref = phone ? `sms:${phone.replace(/[^\d+]/g, "")}` : null;
  const mailHref = email ? `mailto:${email}` : null;

  const showLoading = loading;
  const showError = !loading && !!error;
  const showLoaded = !loading && !error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </span>
            Lead unlocked
          </DialogTitle>
          <DialogDescription>
            {showError
              ? "The unlock succeeded — we just couldn't load the contact details."
              : "Contact details are now revealed. Reach out within 10 minutes for the best conversion."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Loading state */}
          {showLoading && (
            <div className="rounded-lg border bg-card p-4 space-y-2.5" aria-busy="true">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Loading contact details…
                </span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <Skeleton className="h-4 w-32" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <Skeleton className="h-4 w-40" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            </div>
          )}

          {/* Error state */}
          {showError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-destructive">
                    Couldn't load contact details
                  </p>
                  <p className="text-xs text-destructive/90">
                    The unlock succeeded and you've been charged. We just couldn't fetch the
                    revealed details. {error}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" onClick={onRetry} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Retry
                </Button>
                <Link
                  to={`/provider/inquiries?lead=${leadId}`}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
                >
                  Open in inbox
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Loaded state */}
          {showLoaded && (
            <>
              <div className="rounded-lg border bg-card p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    Now visible
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium text-foreground">{name}</p>
                  </div>
                  {cityState && (
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm text-foreground">{cityState}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">
                      {phone || <span className="text-muted-foreground italic">Not provided</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground break-all">
                      {email || <span className="text-muted-foreground italic">Not provided</span>}
                    </p>
                  </div>
                </div>
              </div>

              {(telHref || smsHref || mailHref) && (
                <div className="grid grid-cols-3 gap-2">
                  <Button asChild variant="outline" size="sm" disabled={!telHref}>
                    <a href={telHref ?? "#"} aria-disabled={!telHref}>
                      <Phone className="h-4 w-4 mr-1.5" />
                      Call
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm" disabled={!smsHref}>
                    <a href={smsHref ?? "#"} aria-disabled={!smsHref}>
                      <MessageSquare className="h-4 w-4 mr-1.5" />
                      Text
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm" disabled={!mailHref}>
                    <a href={mailHref ?? "#"} aria-disabled={!mailHref}>
                      <Mail className="h-4 w-4 mr-1.5" />
                      Email
                    </a>
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Receipt — always visible */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Charged</span>
              <span className="font-medium text-foreground">
                ${(amountCharged / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Remaining balance</span>
              <span className="font-medium text-foreground">
                ${(balanceAfter / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
