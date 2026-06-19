import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { fmtMoney, TIER_PRICING } from "@/lib/billingPricing";
import { supabase } from "@/integrations/supabase/client";
import { readFunctionError } from "@/lib/functionError";
import { toast } from "sonner";
import type { FacilitySubscriptionRow } from "@/hooks/useFacilitySubscription";

interface SwitchToAnnualBannerProps {
  subscription: FacilitySubscriptionRow;
  onSwitched: () => void;
}

/**
 * Banner shown on /provider/billing for MONTHLY Pro subscribers.
 * Pitches the annual savings; on click, opens a confirm dialog that
 * calls the existing switch-to-annual edge function. The edge function
 * schedules the monthly sub to cancel at period_end and creates the
 * new annual subscription anchored at that boundary — no service gap.
 */
export function SwitchToAnnualBanner({ subscription, onSwitched }: SwitchToAnnualBannerProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Build the savings number — accumulates per active tier.
  const proSavings = TIER_PRICING.pro.fullAnnualCents - TIER_PRICING.pro.annualCents;
  const featuredSavings = subscription.has_featured
    ? TIER_PRICING.featured.fullAnnualCents - TIER_PRICING.featured.annualCents
    : 0;
  const conciergeSavings = subscription.has_concierge_partner
    ? TIER_PRICING.concierge.fullAnnualCents - TIER_PRICING.concierge.annualCents
    : 0;
  const totalAnnualSavings = proSavings + featuredSavings + conciergeSavings;

  const periodEndStr = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("switch-to-annual", {
        body: { subscription_id: subscription.id },
      });
      if (error) throw new Error((await readFunctionError(error)) ?? "Couldn't switch to annual. Please check your connection and try again.");
      if (data?.error) throw new Error(data.error);
      toast.success("Switch to annual scheduled. Your annual billing starts after your monthly period ends.");
      setOpen(false);
      onSwitched();
    } catch (err) {
      console.error("[SwitchToAnnualBanner] switch failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to switch to annual");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p className="font-semibold text-slate-900">
              Save {fmtMoney(totalAnnualSavings)}/year by switching to annual
            </p>
            <p className="mt-1 text-sm text-slate-700 leading-relaxed">
              Annual locks in your current rate and saves 15%.
              {periodEndStr ? ` Your current monthly period continues through ${periodEndStr}.` : null}
            </p>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="gap-2 bg-[#1B365D] hover:bg-[#142a4a] shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Switch to annual
          </Button>
        </div>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to annual billing?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm">
              <span className="block">
                Your monthly subscription continues through{" "}
                <strong>{periodEndStr ?? "the end of the current period"}</strong> at the
                rate you already paid — no extra charge today.
              </span>
              <span className="block">
                Starting the day after that, you'll be billed annually:
              </span>
              <span className="block rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-6">
                Pro Annual                      {fmtMoney(TIER_PRICING.pro.annualCents)}/yr
                {subscription.has_featured && (
                  <>
                    {"\n"}+ Featured Annual                {fmtMoney(TIER_PRICING.featured.annualCents)}/yr
                  </>
                )}
                {subscription.has_concierge_partner && (
                  <>
                    {"\n"}+ Concierge Annual              {fmtMoney(TIER_PRICING.concierge.annualCents)}/yr
                  </>
                )}
                {"\n"}─────────────────────────────────────────
                {"\n"}Annual savings vs monthly         {fmtMoney(totalAnnualSavings)}
              </span>
              <span className="block text-xs text-slate-500">
                Annual cancellation refunds unused months at the full monthly rate
                ($99 / $599 / $1,000); the 15% discount applies only to facilities
                that complete the year.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={submitting}
              className="bg-[#1B365D] hover:bg-[#142a4a] gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
