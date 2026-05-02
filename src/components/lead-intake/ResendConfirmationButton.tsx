import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ResendConfirmationButtonProps {
  /** Recipient email — used to look up the lead. */
  email?: string;
  /** Facility the inquiry was sent to — used as a lookup hint when leadId is unknown. */
  facilityId?: string;
  /** Optional: the lead row's primary key, when the caller has it. */
  leadId?: string;
  className?: string;
}

const INITIAL_COOLDOWN_S = 60;

/**
 * "Resend confirmation email" action for the Request Info success screen.
 *
 * Rate-limit posture: the authoritative limit lives server-side
 * (`resend-lead-confirmation` enforces a 60s cooldown + 3/day ceiling).
 * The client-side countdown shown on this button is a UX courtesy — it
 * disables the button for the same window the server would reject anyway,
 * and re-arms itself from the `retryAfterSeconds` payload on a 429 so the
 * UI stays in sync if the user, e.g., reloads mid-cooldown.
 */
export function ResendConfirmationButton({
  email,
  facilityId,
  leadId,
  className,
}: ResendConfirmationButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [justSent, setJustSent] = useState(false);
  // Strict-Mode guard: prevents double-fire when React mounts the component
  // twice in dev without us ever seeing the first request resolve.
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = window.setInterval(() => setCooldownLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [cooldownLeft]);

  // Fade the "Sent!" affordance after a moment so the button returns to a
  // neutral state and the cooldown timer becomes the dominant signal.
  useEffect(() => {
    if (!justSent) return;
    const t = window.setTimeout(() => setJustSent(false), 4000);
    return () => window.clearTimeout(t);
  }, [justSent]);

  const canSubmit = !!email && (!!leadId || !!facilityId);

  const handleClick = async () => {
    if (!canSubmit || isSending || cooldownLeft > 0) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-lead-confirmation", {
        body: { email, facilityId, leadId },
      });

      // supabase-js surfaces non-2xx as `error`, but the JSON body is still
      // delivered in `data`. We look at both so 429 retry hints aren't lost.
      const payload = (data ?? (error as any)?.context?.body) as
        | { code?: string; retryAfterSeconds?: number; cooldownSeconds?: number; error?: { message?: string } }
        | undefined;

      if (error) {
        if (payload?.code === "cooldown_active" || payload?.code === "daily_limit_reached") {
          const wait = Math.max(1, payload.retryAfterSeconds ?? INITIAL_COOLDOWN_S);
          setCooldownLeft(wait);
          toast.error(
            payload.code === "daily_limit_reached"
              ? "You've reached the daily resend limit. Please try again tomorrow."
              : `Please wait ${wait}s before requesting another email.`,
          );
          return;
        }
        if (payload?.code === "lead_not_found") {
          toast.error("We couldn't find a recent request to resend. Please submit the form again.");
          return;
        }
        toast.error(payload?.error?.message ?? "We couldn't send the email right now. Please try again.");
        return;
      }

      const cooldown = payload?.cooldownSeconds ?? INITIAL_COOLDOWN_S;
      setCooldownLeft(cooldown);
      setJustSent(true);
      toast.success("Confirmation email sent. Check your inbox in a moment.");
    } catch (err) {
      console.error("resend-lead-confirmation failed", err);
      toast.error("Network error — please try again.");
    } finally {
      setIsSending(false);
      inFlightRef.current = false;
    }
  };

  if (!canSubmit) return null;

  const label = isSending
    ? "Sending…"
    : justSent
      ? "Sent!"
      : cooldownLeft > 0
        ? `Resend available in ${cooldownLeft}s`
        : "Resend confirmation email";

  const Icon = isSending ? Loader2 : justSent ? CheckCircle2 : Mail;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isSending || cooldownLeft > 0}
      aria-disabled={isSending || cooldownLeft > 0}
      className={className}
    >
      <Icon className={`h-4 w-4 ${isSending ? "animate-spin" : ""}`} aria-hidden="true" />
      <span className="ml-2">{label}</span>
    </Button>
  );
}
