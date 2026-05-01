import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SmsCallbackFallbackProps {
  draftId: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes?: string;
  /** Called after the SMS-callback request succeeds */
  onRequested: (inquiryId: string) => void;
}

/**
 * Optional SMS-callback path on the Concierge email-verification step.
 *
 * Renders an "Or skip email and get help by SMS" alternative so a client
 * who's blocked on email verification (typo, can't access inbox, in crisis)
 * can still hand off to the placement team. We send a flag to the backend —
 * the actual SMS is dispatched by the admin advisor who picks up the case.
 */
export function SmsCallbackFallback({
  draftId,
  firstName,
  lastName,
  phone,
  email,
  notes,
  onRequested,
}: SmsCallbackFallbackProps) {
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const phoneDigits = (phone || "").replace(/\D/g, "");
  const phoneOk = phoneDigits.length >= 10;
  const canSubmit = !!draftId && phoneOk && consent && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "request-concierge-sms-callback",
        {
          body: {
            draftId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            smsConsent: true,
            notes,
          },
        },
      );
      if (error) throw error;
      const inquiryId = (data as { inquiryId?: string })?.inquiryId;
      if (!inquiryId) throw new Error("Missing inquiry id");
      setDone(true);
      onRequested(inquiryId);
    } catch (err) {
      console.error("SMS callback request failed", err);
      toast.error("We couldn't queue your callback. Please try again or verify your email above.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
        <div className="h-10 w-10 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>
        <h4 className="text-base font-semibold text-foreground mb-1">
          We&apos;ll text you shortly
        </h4>
        <p className="text-sm text-muted-foreground">
          A placement specialist will reach out to{" "}
          <span className="font-medium text-foreground">{phone}</span> to help with
          next steps. No further action needed.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Or skip email — get help by SMS instead
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Can&apos;t access your inbox right now? A placement specialist will
            text you at{" "}
            <span className="font-medium text-foreground">{phone || "your phone"}</span>{" "}
            within an hour during business hours.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-2 mb-3 text-xs text-muted-foreground cursor-pointer select-none">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5"
          aria-label="I consent to receive SMS messages"
        />
        <span>
          I agree to receive SMS messages from Rehab Lookup at the number above.
          Message and data rates may apply. Reply STOP to unsubscribe.
        </span>
      </label>

      {!phoneOk && (
        <p className="text-xs text-destructive mb-2">
          Add a 10-digit phone number on the previous step to enable SMS callback.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Requesting callback…
          </>
        ) : (
          <>
            <MessageSquare className="h-4 w-4" />
            Request SMS callback instead
          </>
        )}
      </Button>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-primary" />
        Confidential. We never share your number without your permission.
      </p>
    </div>
  );
}
