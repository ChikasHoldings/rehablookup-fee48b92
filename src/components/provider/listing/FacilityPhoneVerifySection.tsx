import { useState, useEffect } from "react";
import { Loader2, ShieldCheck, Send, CheckCircle, AlertCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Facility-phone verification widget for the listing editor + listing
 * wizard.
 *
 * Auto-presents a "Verify" button the moment the provider types a valid
 * 10-digit phone number. On click, sends an SMS via
 * `send-sms-verification-code`, surfaces an inline 6-digit OTP entry,
 * and on `verify-sms-code` success writes:
 *   - profiles.phone + profiles.phone_verified_at (server-side, by
 *     verify-sms-code itself)
 *   - facilities.verified_phone + verified_phone_set_at +
 *     has_facility_verified_contact (client-side, post-verify, when a
 *     facilityId is supplied — so existing listings can show the
 *     "Verified contact" badge on their public profile).
 *
 * Friction-light by design: the verification UI is inline (not a modal),
 * the existing phone Input stays controlled by the parent's form state,
 * and re-entering an unverified number simply re-prompts.
 *
 * Note: SMS verification gates on TWILIO_* secrets. When Twilio is not
 * configured the send-sms-verification-code function returns
 * `{ success: true, sent: false }` and we surface a non-blocking toast
 * so the provider can save their listing without the verified badge.
 */
interface FacilityPhoneVerifySectionProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  /** Pass when editing an existing facility so we can also mark
   *  facilities.verified_phone server-side on success. Omit during
   *  initial-create flows; the parent can re-fire after insert. */
  facilityId?: string;
  /** Whether facilities.verified_phone already matches the current
   *  value (i.e. previously verified). When true the widget renders
   *  the verified state without re-prompting. */
  alreadyVerified?: boolean;
  /** Optional callback fired once the user successfully verifies. */
  onVerified?: () => void;
  /** Optional field-error text from the parent's validation. */
  error?: string;
  touched?: boolean;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

function digitsOnly(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\D/g, "");
}

function toE164(phone: string): string {
  const d = digitsOnly(phone);
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return `+${d}`;
}

export function FacilityPhoneVerifySection({
  value,
  onChange,
  onBlur,
  facilityId,
  alreadyVerified = false,
  onVerified,
  error,
  touched,
  placeholder = "(555) 123-4567",
  label = "Phone Number",
  required = false,
}: FacilityPhoneVerifySectionProps) {
  const { toast } = useToast();
  const [verified, setVerified] = useState(alreadyVerified);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Sync verified flag when the parent's `alreadyVerified` changes (e.g.
  // facility data finished loading after mount).
  useEffect(() => {
    setVerified(alreadyVerified);
  }, [alreadyVerified]);

  // Reset verification state when the number changes — a different
  // number must be re-verified.
  useEffect(() => {
    if (verified && digitsOnly(value).length >= 10) {
      // Verified state persists ONLY when the digits match what was
      // verified. Parent owns alreadyVerified; here we just clear our
      // local "just verified this session" state if the user is now
      // typing something different.
    }
    setCodeSent(false);
    setCode("");
    setVerifyError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Cooldown tick.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const isValidForVerification = digitsOnly(value).length >= 10;

  async function handleSendCode() {
    if (!isValidForVerification) {
      setVerifyError("Please enter a valid 10-digit phone number");
      return;
    }
    setIsSendingCode(true);
    setVerifyError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "send-sms-verification-code",
        { body: { phone: toE164(value), userType: "provider" } },
      );
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      if (data?.sent === false) {
        // SMS service not configured — provider can still save the
        // listing; the facility's verified_phone badge stays unset.
        toast({
          title: "SMS service unavailable",
          description: "We saved your phone but can't verify by SMS right now. Support will reach out if needed.",
        });
        setIsSendingCode(false);
        return;
      }
      setCodeSent(true);
      setResendCooldown(60);
      toast({
        title: "Code sent",
        description: "Check your phone for the 6-digit code.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send code";
      setVerifyError(msg);
      toast({ title: "Couldn't send code", description: msg, variant: "destructive" });
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) {
      setVerifyError("Enter the 6-digit code");
      return;
    }
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: fnErr } = await supabase.functions.invoke(
        "verify-sms-code",
        {
          body: {
            phone: toE164(value),
            code,
            userId: user?.id,
            userType: "provider",
          },
        },
      );
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      // Mirror onto the facility row so the public profile can show the
      // "Verified contact" badge. RLS allows owners/managers to update their
      // own facility. We must confirm the write actually landed: a 0-row
      // result (RLS denial — e.g. a viewer, or access changed mid-session)
      // returns no error, so checking only `error` would flip the badge to
      // "Verified" while the DB stayed unchanged, and the next refetch would
      // silently drop it.
      let facilityBadgeSaved = true;
      if (facilityId) {
        const { data: updatedRows, error: updErr } = await supabase
          .from("facilities")
          .update({
            verified_phone: value,
            verified_phone_set_at: new Date().toISOString(),
            has_facility_verified_contact: true,
          })
          .eq("id", facilityId)
          .select("id");
        if (updErr || !updatedRows || updatedRows.length === 0) {
          facilityBadgeSaved = false;
          console.warn("[FacilityPhoneVerify] facilities verified_phone update did not persist", updErr);
        }
      }

      setCodeSent(false);
      setCode("");

      // The SMS code was correct (verify-sms-code already verified the phone at
      // the profile level), but if the facility-badge mirror didn't persist we
      // must NOT show this listing as verified — say so plainly so the provider
      // retries instead of believing a badge is live that isn't.
      if (facilityId && !facilityBadgeSaved) {
        setVerifyError(
          "Your phone was verified, but saving the verified badge to this listing failed. Please try again.",
        );
        toast({
          title: "Couldn't save verified badge",
          description: "Your phone was verified, but saving it to this listing didn't go through. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setVerified(true);
      toast({ title: "Phone verified", description: "Your facility phone is verified." });
      onVerified?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      setVerifyError(msg);
    } finally {
      setIsVerifying(false);
    }
  }

  function handleResend() {
    if (resendCooldown > 0) return;
    setCode("");
    void handleSendCode();
  }

  // Verified state: collapsed display with badge.
  if (verified) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {label}
            {required && <span className="text-destructive">*</span>}
          </Label>
          <Badge variant="outline" className="gap-1 text-green-700 border-green-200 bg-green-500/10 text-xs">
            <ShieldCheck className="h-3 w-3" />
            Verified
          </Badge>
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setVerified(false);
            }}
            onBlur={onBlur}
            className="h-11 pl-10"
            placeholder={placeholder}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Families will see this as the verified contact line on your listing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Phone className="h-4 w-4 text-muted-foreground" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={cn(
              "h-11 pl-10",
              error && touched && "border-destructive",
            )}
            placeholder={placeholder}
          />
        </div>
        {isValidForVerification && !codeSent && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSendCode}
            disabled={isSendingCode}
            className="h-11 gap-2"
          >
            {isSendingCode ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Verify
              </>
            )}
          </Button>
        )}
      </div>

      {error && touched && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {codeSent && (
        <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <Label className="text-sm font-medium">Enter the 6-digit code</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setVerifyError(null);
              }}
              placeholder="000000"
              className="h-11 text-center font-mono text-lg tracking-widest max-w-[140px]"
            />
            <Button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || code.length !== 6}
              className="h-11 gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Verify
                </>
              )}
            </Button>
          </div>
          {verifyError && <p className="text-xs text-destructive">{verifyError}</p>}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Code sent to {value}. Check your texts.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isSendingCode}
              className="h-7 text-xs"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
            </Button>
          </div>
        </div>
      )}

      {!codeSent && !isValidForVerification && (
        <p className="text-xs text-muted-foreground">
          Enter a 10-digit phone number to verify ownership.
        </p>
      )}
    </div>
  );
}
