import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFacilitySubscriptionTier } from "@/hooks/useFacilitySubscriptionTier";

interface FreeTierRoutingDisclosureProps {
  facilityId?: string | null;
  facilityName?: string | null;
}

/**
 * Small disclosure shown above the submit button on Free-tier facility
 * inquiry forms. Honest framing: the seeker IS reaching the facility,
 * just via the concierge with 1-2 additional matched options.
 *
 * Renders nothing for Pro-tier facilities — those forms stay clean and
 * the inquiry goes straight to the facility's inbox.
 *
 * Server re-checks the tier on submit (submit-qualified-lead branches
 * by the live DB value, not whatever the client thinks). This banner
 * is cosmetic: it sets seeker expectations so the concierge-redirect
 * confirmation page doesn't surprise them.
 */
export function FreeTierRoutingDisclosure({
  facilityId,
  facilityName,
}: FreeTierRoutingDisclosureProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const { data: tier, isLoading } = useFacilitySubscriptionTier(facilityId);

  // While the tier query is in flight or the facility is Pro, skip the
  // disclosure entirely — Pro forms must stay clean.
  if (isLoading || tier === "pro") return null;

  return (
    <>
      <p className="text-xs text-slate-500 leading-relaxed mt-3 mb-2">
        By submitting, you'll connect with a RehabLookup care coordinator who
        will introduce you to {facilityName ? <strong>{facilityName}</strong> : "this facility"}{" "}
        along with 1–2 additional matched options at no cost.{" "}
        <button
          type="button"
          onClick={() => setWhyOpen(true)}
          className="font-medium text-[#1B365D] underline underline-offset-2 hover:text-[#142a4a]"
        >
          Why?
        </button>
      </p>

      <Dialog open={whyOpen} onOpenChange={setWhyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Why a care coordinator?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <p>
              RehabLookup uses a concierge model for inquiries submitted on
              Free-tier listings. This ensures every seeker gets quick attention
              even if the facility takes time to respond, and gives you multiple
              options to compare.
            </p>
            <p>
              Pro-tier facilities receive inquiries directly to their inbox;
              Free-tier facilities receive them via our concierge. The service
              is <strong>always free for seekers</strong>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
