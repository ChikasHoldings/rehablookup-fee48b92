import { useState } from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { parseFunctionError } from "@/lib/contracts/friendly-error-messages";
import { PLANS } from "@/lib/planConstants";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional context — what they were trying to do when the gate
   *  fired. Surfaces in the modal copy so the upgrade pitch is
   *  contextual ("Add a 6th photo" → mention extra-photo limit). */
  feature?: "photos" | "video" | null;
  /** Where to return after a successful Pro upgrade. Defaults to the
   *  wizard's PLAN step, which is the only onboarding step that handles
   *  `?checkout=success` (confirms the subscription + completes onboarding).
   *  Returning to a step without that handler strands the paid user. */
  returnTo?: string;
}

const FEATURE_HEADLINES: Record<NonNullable<UpgradeDialogProps["feature"]>, string> = {
  photos: "Upload up to 10 photos",
  video: "Add a facility video",
};

/**
 * Plan-upgrade modal triggered when a Free user hits a Pro-only
 * feature. Reuses the same create-checkout edge fn the Plan picker
 * (Section 7) calls. Stripe Checkout's success_url + cancel_url point
 * back to the onboarding PLAN step, which is the step that handles
 * `?checkout=success` — it confirms the subscription and completes
 * onboarding. (Returning to the build step left the paid user stranded.)
 */
export function UpgradeDialog({ open, onOpenChange, feature, returnTo }: UpgradeDialogProps) {
  const [busy, setBusy] = useState(false);
  const headline = feature ? FEATURE_HEADLINES[feature] : "Stand out with Pro";

  async function handleStartUpgrade() {
    if (busy) return;
    setBusy(true);
    try {
      const origin = window.location.origin;
      const target = returnTo ?? "/provider/onboarding?step=plan";
      const successUrl = `${origin}${target}${target.includes("?") ? "&" : "?"}checkout=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}${target}${target.includes("?") ? "&" : "?"}checkout=cancel`;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { successUrl, cancelUrl },
      });
      if (error) {
        // The real reason is in the non-2xx body on error.context; error.message
        // is only Supabase's generic "non-2xx status code" string.
        const { code, message } = await parseFunctionError(error);
        if (code === "NO_FACILITY_FOR_PRO") {
          toast.message(
            message ?? "Pro activates once your listing is live.",
            { duration: 8000 },
          );
        } else {
          toast.error(message ?? "Couldn't start Checkout. Please try again.");
        }
        setBusy(false);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        setBusy(false);
        return;
      }
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      toast.error("Couldn't get a Checkout URL. Please try again.");
      setBusy(false);
    } catch (e) {
      console.error("[UpgradeDialog] start upgrade failed", e);
      toast.error("Couldn't start Checkout. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#1B365D] font-semibold mb-1">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Pro feature
          </div>
          <DialogTitle>{headline}</DialogTitle>
          <DialogDescription>
            Upgrade to Pro — ${PLANS.pro.priceMonthly}/month. Publishes your phone
            number and Call button, your enhanced profile, and richer media on your
            public listing.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-1.5 text-sm text-slate-700">
          {PLANS.pro.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#1B365D] flex-shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {PLANS.pro.note && (
          <p className="text-xs leading-relaxed text-slate-500">{PLANS.pro.note}</p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Not now
          </Button>
          <Button
            onClick={handleStartUpgrade}
            disabled={busy}
            className="bg-[#1B365D] hover:bg-[#142a4a] gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Starting…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" aria-hidden />
                Start upgrade
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
