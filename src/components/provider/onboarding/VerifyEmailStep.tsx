import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useProviderOnboardingState } from "@/hooks/useProviderOnboardingState";

/**
 * Step 2 — 6-digit email-OTP verification, wired to the existing
 * send-verification-code / verify-code edge functions.
 *
 * Flow:
 *   1. On mount, look up the user's email from auth session + profiles.
 *      If we don't have one (shouldn't happen — Step 1 just signed
 *      them in), surface a recoverable error.
 *   2. Auto-send the first code on mount.
 *   3. Render 6 input boxes with auto-advance focus + paste support.
 *   4. On successful verify-code response:
 *        - Write profiles.email_verified_at = now() (wizard's
 *          canonical email-verified gate; verify-code itself stays
 *          generic because it's also used by concierge / international /
 *          lead-intake / reviews).
 *        - advance onboarding_state.current_step = 'find_or_list'.
 *        - Hand off to the next step (find_or_list — phone verification
 *          happens inline there).
 *   5. "Resend code" link after 30s with countdown.
 *   6. "Change email" link signs the user out + restarts at Step 1.
 *
 * Edge cases handled:
 *   - Refresh mid-verify: parent's onboarding-state read still shows
 *     current_step='verify_email' → wizard re-renders this step.
 *   - Abandoned signup re-attempts: send-verification-code already
 *     invalidates prior unverified codes before inserting the new one.
 *   - Rate-limited: the edge fn returns errorCode=RATE_LIMITED;
 *     we surface a friendly toast.
 */
export function VerifyEmailStep({ onAdvance }: { onAdvance: () => void }) {
  const { advance } = useProviderOnboardingState();
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const autoSentRef = useRef(false);

  // Resolve the user's email + auto-send the first code on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData.session?.user.email ?? null;
      if (cancelled) return;
      if (!userEmail) {
        setError("We couldn't find your email. Please go back and sign in again.");
        return;
      }
      setEmail(userEmail);
      if (!autoSentRef.current) {
        autoSentRef.current = true;
        await sendCode(userEmail);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only auto-send
  }, []);

  // Resend cooldown tick.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function sendCode(targetEmail: string) {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "send-verification-code",
        { body: { email: targetEmail } },
      );
      if (fnErr) {
        setError("Couldn't send a verification code. Please try again.");
        return;
      }
      if (data?.error) {
        if (data.errorCode === "RATE_LIMITED") {
          setError("Too many codes requested. Please wait a few minutes before trying again.");
        } else if (data.errorCode === "EMAIL_BLOCKED") {
          setError("This email address can't receive messages. Try a different one.");
        } else if (data.errorCode === "INVALID_EMAIL") {
          setError("That email address doesn't look right.");
        } else {
          setError(data.error);
        }
        return;
      }
      toast.success(`Code sent to ${targetEmail}.`);
      setCooldown(30);
      // Focus the first input so the user can start typing immediately.
      window.setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (e) {
      console.warn("[VerifyEmailStep] send failed", e);
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(fullCode: string) {
    if (!email || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("verify-code", {
        body: { email, code: fullCode },
      });
      if (fnErr) {
        setError("Couldn't verify. Please try again.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      if (data?.error) {
        setError(data.error);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      if (!data?.verified) {
        setError("That code didn't match. Try again or request a new one.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }

      // OTP succeeded. Persist the canonical wizard-side gate AND advance
      // onboarding state to find_or_list. verify-code itself stays
      // generic (used by concierge / international / lead-intake) so we
      // do these wizard-specific writes here instead.
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ email_verified_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
      await advance({ current_step: "find_or_list" });

      toast.success("Email verified.");
      onAdvance();
    } catch (e) {
      console.warn("[VerifyEmailStep] verify failed", e);
      setError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  function handleDigit(idx: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setError(null);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
    // Auto-verify when all 6 are filled.
    if (next.every((d) => d !== "")) {
      void verifyCode(next.join(""));
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 0) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setCode(next);
    setError(null);
    const lastIdx = Math.min(text.length, 5);
    inputRefs.current[lastIdx]?.focus();
    if (text.length === 6) void verifyCode(text);
  }

  async function handleChangeEmail() {
    // Sign the user out + clear local state so the wizard re-renders
    // Step 1 (Account). The unverified profiles row + the
    // verify_email onboarding-state row stay behind — when the user
    // signs up again with a different email, the row's user_id
    // doesn't match the new auth.uid() so a fresh row is created on
    // the next AccountStep submit.
    await supabase.auth.signOut();
    window.location.assign("/provider/onboarding");
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-[#1B365D] font-semibold mb-1">
          <MailCheck className="h-3.5 w-3.5" aria-hidden />
          Step 2 of 5
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Verify your email
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {email ? (
            <>We sent a 6-digit code to <span className="font-medium text-slate-900">{email}</span>. Enter it below.</>
          ) : (
            "Loading…"
          )}
        </p>
      </header>

      <div>
        <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
          {code.map((d, i) => (
            <Input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              aria-label={`Digit ${i + 1} of 6`}
              className={cn(
                "h-12 w-10 sm:w-12 text-center text-lg font-semibold tabular-nums",
                error && "border-red-400 focus-visible:ring-red-300",
              )}
              disabled={verifying || !email}
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-center text-xs text-red-700">
            {error}
          </p>
        )}
        {verifying && (
          <p className="mt-3 text-center text-xs text-slate-500 inline-flex items-center gap-1.5 justify-center w-full">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Verifying…
          </p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => email && sendCode(email)}
          disabled={!email || sending || cooldown > 0}
          className={cn(
            "font-medium",
            cooldown > 0 || sending || !email
              ? "text-slate-400 cursor-not-allowed"
              : "text-[#1B365D] hover:underline",
          )}
        >
          {cooldown > 0
            ? `Resend code in ${cooldown}s`
            : sending
              ? "Sending…"
              : "Resend code"}
        </button>
        <button
          type="button"
          onClick={handleChangeEmail}
          className="text-slate-600 hover:text-[#1B365D] hover:underline font-medium"
        >
          Change email
        </button>
      </div>

      <div className="border-t border-slate-200 pt-3">
        <p className="text-[11px] text-slate-500">
          Didn't get the email? Check your spam folder or click "Resend code".
          Codes expire after 10 minutes.
        </p>
      </div>

      <div className="flex items-center justify-start pt-1">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleChangeEmail}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      </div>
    </div>
  );
}
