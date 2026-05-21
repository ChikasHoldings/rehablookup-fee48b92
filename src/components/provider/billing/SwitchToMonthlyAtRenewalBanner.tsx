import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FacilitySubscriptionRow } from "@/hooks/useFacilitySubscription";

interface SwitchToMonthlyAtRenewalBannerProps {
  subscription: FacilitySubscriptionRow;
  onSwitched: () => void;
}

/**
 * Banner shown to ANNUAL subscribers during the renewal-reminder
 * window. Annual subscribers can't downgrade mid-year, but they can
 * opt to renew as monthly. This banner toggles
 * switch_to_monthly_at_renewal on the subscription row; the renewal
 * Stripe-invoice handler reads it and creates a monthly sub at
 * renewal time instead of renewing annual.
 *
 * Only renders inside the 60-day pre-renewal window — the parent
 * /provider/billing page decides when to show this.
 */
export function SwitchToMonthlyAtRenewalBanner({
  subscription,
  onSwitched,
}: SwitchToMonthlyAtRenewalBannerProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const alreadyFlagged = subscription.switch_to_monthly_at_renewal === true;
  const periodEndStr = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  const toggleFlag = async (next: boolean) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("set-renewal-switch-flag", {
        body: { subscription_id: subscription.id, switch_at_renewal: next },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        next
          ? "We'll switch you to monthly at renewal."
          : "Your annual renewal will continue as annual.",
      );
      setConfirmOpen(false);
      onSwitched();
    } catch (err) {
      console.error("[SwitchToMonthlyAtRenewalBanner] flag failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to update preference");
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyFlagged) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-2.5 flex-1">
            <Calendar className="h-5 w-5 mt-0.5 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="font-semibold text-slate-900">
                You'll switch to monthly at renewal
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Your annual subscription will not auto-renew. On{" "}
                {periodEndStr ?? "your renewal date"}, you'll start a fresh monthly
                plan at the standard monthly rate. Change your mind anytime before
                then.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => toggleFlag(false)}
            className="shrink-0"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Keep annual instead"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p className="font-semibold text-slate-900">
              Your annual subscription renews on {periodEndStr ?? "your renewal date"}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Want to switch to monthly billing at renewal? We can hold the
              switch — your annual access continues through renewal day
              regardless.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            className="shrink-0"
          >
            Switch at renewal
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to monthly at renewal?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-sm">
              <span className="block">
                Your annual subscription stays active through{" "}
                <strong>{periodEndStr ?? "renewal day"}</strong>. On that day,
                instead of renewing annual, we'll create a new monthly
                subscription. You'll pay $99/mo (plus any active add-ons at
                their monthly rate).
              </span>
              <span className="block text-xs text-slate-500">
                You can revert this preference any time before the renewal date.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                toggleFlag(true);
              }}
              disabled={submitting}
              className="bg-[#1B365D] hover:bg-[#142a4a] gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm switch at renewal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
