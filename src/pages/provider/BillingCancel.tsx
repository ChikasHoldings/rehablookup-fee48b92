import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import {
  useFacilitySubscription,
  useInvalidateFacilitySubscription,
} from "@/hooks/useFacilitySubscription";
import {
  CancellationPreview,
  type CancellationPreviewData,
  type CancellationScope,
} from "@/components/provider/billing/CancellationPreview";
import { fmtMoney } from "@/lib/billingPricing";

/**
 * /provider/billing/cancel — three-step flow:
 *   1) Pick scope (all / addon-featured / addon-concierge)
 *   2) Show refund math (interval-aware via preview-cancellation-refund)
 *   3) Confirm — calls provider-self-cancel-subscription
 */
export default function BillingCancel() {
  const navigate = useNavigate();
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const { data: subscription, isLoading } = useFacilitySubscription(facilityId);
  const invalidateSub = useInvalidateFacilitySubscription();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scope, setScope] = useState<CancellationScope>("all");
  const [reason, setReason] = useState("");
  const [annualConfirms, setAnnualConfirms] = useState({ forfeit: false, immediate: false });
  const [monthlyConfirm, setMonthlyConfirm] = useState(false);
  const [preview, setPreview] = useState<CancellationPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Pull the preview when entering step 2 OR when scope changes during
  // step 2. Guard against a stale response landing after the user has
  // switched scopes again — without the cancellation flag we'd display
  // the refund math for the previous scope.
  useEffect(() => {
    if (step !== 2 || !subscription?.id) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreview(null);
    supabase.functions
      .invoke("preview-cancellation-refund", {
        body: { subscription_id: subscription.id, scope },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        setPreview(data as CancellationPreviewData);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[BillingCancel] preview failed", err);
        toast.error(err instanceof Error ? err.message : "Failed to compute refund");
        setStep(1);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, scope, subscription?.id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Skeleton className="h-12 w-2/3 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!subscription || subscription.tier !== "pro" || subscription.status !== "active") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
        <Helmet>
          <title>Cancel subscription | RehabLookup Provider</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="font-semibold">No active subscription to cancel.</p>
            <Button asChild variant="outline">
              <Link to="/provider/billing">Back to billing</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMonthly = subscription.billing_period === "monthly";
  const isAnnual = subscription.billing_period === "annual";

  const canConfirm = (() => {
    if (!preview) return false;
    if (isMonthly) return monthlyConfirm;
    if (isAnnual) return annualConfirms.forfeit && annualConfirms.immediate;
    return false;
  })();

  const handleConfirm = async () => {
    if (!subscription) return;
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "provider-self-cancel-subscription",
        {
          body: {
            subscription_id: subscription.id,
            scope,
            reason: reason.trim() || undefined,
          },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Interval-specific success message. Annual cancels prorate a
      // refund; monthly cancels keep access through the current period
      // and don't refund. Read totalRefundCents defensively — edge
      // function returns it on annual paths but may omit it on add-on-
      // only cancels where the math is zero.
      if (isMonthly) {
        const endDateStr = subscription.current_period_end
          ? new Date(subscription.current_period_end).toLocaleDateString()
          : "your period end";
        toast.success(`Subscription ends on ${endDateStr}. You keep access until then.`);
      } else {
        const refundCents = Number(
          (data as { totalRefundCents?: number; total_refund_cents?: number })?.totalRefundCents
            ?? (data as { total_refund_cents?: number })?.total_refund_cents
            ?? 0,
        );
        if (refundCents > 0) {
          toast.success(
            `Subscription canceled. ${fmtMoney(refundCents)} will refund to your payment method in 5-10 business days.`,
          );
        } else {
          toast.success("Subscription canceled.");
        }
      }
      invalidateSub(facilityId);
      navigate("/provider/billing");
    } catch (err) {
      console.error("[BillingCancel] cancel failed", err);
      toast.error(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <Helmet>
        <title>Cancel subscription | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div>
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link to="/provider/billing">
            <ArrowLeft className="h-4 w-4" />
            Back to billing
          </Link>
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-2">
          Cancel subscription
        </h1>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>What do you want to cancel?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3" role="radiogroup" aria-label="What to cancel">
              <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 cursor-pointer hover:border-[#1B365D]/40">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  aria-label="Cancel everything — Pro and all add-ons"
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Cancel everything</p>
                  <p className="text-xs text-slate-500">Pro + all add-ons. Full subscription ends.</p>
                </div>
              </label>

              {subscription.has_featured && (
                <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 cursor-pointer hover:border-[#1B365D]/40">
                  <input
                    type="radio"
                    name="scope"
                    value="addon-featured"
                    checked={scope === "addon-featured"}
                    onChange={() => setScope("addon-featured")}
                    aria-label="Cancel Featured add-on only, keep Pro"
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Cancel Featured only</p>
                    <p className="text-xs text-slate-500">Keep Pro and any other add-ons.</p>
                  </div>
                </label>
              )}

              {subscription.has_concierge_partner && (
                <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 cursor-pointer hover:border-[#1B365D]/40">
                  <input
                    type="radio"
                    name="scope"
                    value="addon-concierge"
                    checked={scope === "addon-concierge"}
                    onChange={() => setScope("addon-concierge")}
                    aria-label="Cancel Concierge Partner add-on only, keep Pro"
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Cancel Concierge Partner only</p>
                    <p className="text-xs text-slate-500">Keep Pro and any other add-ons.</p>
                  </div>
                </label>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" asChild>
                <Link to="/provider/billing">Take me back</Link>
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="bg-[#1B365D] hover:bg-[#142a4a]"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <>
          {previewLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : preview ? (
            <CancellationPreview data={preview} />
          ) : null}

          <Card>
            <CardContent className="p-5 space-y-4">
              {isMonthly && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="monthly-confirm"
                    checked={monthlyConfirm}
                    onCheckedChange={(v) => setMonthlyConfirm(v === true)}
                  />
                  <Label htmlFor="monthly-confirm" className="text-sm font-normal leading-relaxed">
                    I understand my subscription ends on{" "}
                    {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString()
                      : "my period end"}
                    .
                  </Label>
                </div>
              )}

              {isAnnual && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="forfeit"
                      checked={annualConfirms.forfeit}
                      onCheckedChange={(v) =>
                        setAnnualConfirms((p) => ({ ...p, forfeit: v === true }))
                      }
                    />
                    <Label htmlFor="forfeit" className="text-sm font-normal leading-relaxed">
                      I understand the 15% annual discount is forfeited on the months I used.
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="immediate"
                      checked={annualConfirms.immediate}
                      onCheckedChange={(v) =>
                        setAnnualConfirms((p) => ({ ...p, immediate: v === true }))
                      }
                    />
                    <Label htmlFor="immediate" className="text-sm font-normal leading-relaxed">
                      I confirm immediate cancellation — no extension to period end.
                    </Label>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="reason" className="text-sm font-medium">
                  Reason for canceling{" "}
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 500))}
                  placeholder="What would have changed your mind?"
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canConfirm}
                  variant="destructive"
                  className="gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Continue to confirm
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <p className="font-semibold text-lg">Confirm cancellation</p>
            <p className="text-sm text-slate-700">
              {isMonthly
                ? "Your subscription will end at the end of your current billing month. No refund is owed."
                : "Your subscription cancels immediately and any owed refund will be issued to your original payment method within 5-10 business days."}
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" asChild>
                <Link to="/provider/billing">Wait, take me back</Link>
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                variant="destructive"
                className="gap-2"
              >
                {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                Cancel my subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
