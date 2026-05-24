/**
 * ClaimEngineStatePanel
 * ─────────────────────
 * Surfaces the verification engine's state for a single claim to the
 * claimant who submitted it. Rendered inside each claim card on
 * /provider/claims.
 *
 * What it shows:
 *   • Combined / legitimacy / ownership score chips against config thresholds
 *   • Ownership signals the claimant has cleared (SMS, domain email, doc)
 *   • DBA alias confirmation banner (if start_claim_verification detected
 *     a name variant and emitted an alias for the facility); one-tap
 *     confirm calls public.confirm_facility_alias RPC.
 *   • Persistent "Get help" link (the spec's "help me" escape hatch).
 *
 * RLS gates the queries — the claimant can only read their own attempt
 * + signal rows by policy. Aliases are public-readable on approved
 * facilities. If the attempt doesn't exist yet (legacy claim submitted
 * before the engine landed), the panel renders a compact "engine not
 * started" notice instead of an empty card.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Check,
  Loader2,
  PhoneCall,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Attempt {
  id: string;
  status: string;
  legitimacy_score: number | null;
  ownership_score: number | null;
  confidence_score: number | null;
  final_decision: string | null;
  trigger_reason: string;
}

interface Signal {
  axis: "legitimacy" | "ownership";
  signal_type: string;
  score: number | null;
  passed: boolean | null;
}

interface Alias {
  id: string;
  alias_name: string;
  source: string;
  confirmed_by: string | null;
}

interface Config {
  auto_approve_threshold: number;
  legitimacy_min_threshold: number;
  ownership_min_threshold: number;
}

const RUNG_LABEL: Record<string, string> = {
  voice_otp: "Voice OTP",
  sms_otp: "SMS OTP",
  domain_email: "Work email",
  document: "Credential document",
  help_request: "Help requested",
};

export function ClaimEngineStatePanel({
  claimId,
  facilityId,
}: {
  claimId: string;
  facilityId: string | null;
}) {
  const { toast } = useToast();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [alias, setAlias] = useState<Alias | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [voiceCalling, setVoiceCalling] = useState(false);
  const [voicePrompt, setVoicePrompt] = useState<{ maskedPhone: string } | null>(null);
  const [voiceCode, setVoiceCode] = useState("");
  const [voiceVerifying, setVoiceVerifying] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [attemptRes, configRes] = await Promise.all([
        supabase
          .from("verification_attempts")
          .select(
            "id,status,legitimacy_score,ownership_score,confidence_score,final_decision,trigger_reason",
          )
          .eq("claim_id", claimId)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("verification_config")
          .select(
            "auto_approve_threshold,legitimacy_min_threshold,ownership_min_threshold",
          )
          .eq("id", 1)
          .maybeSingle(),
      ]);
      if (!mounted) return;
      const a = (attemptRes.data ?? null) as Attempt | null;
      setAttempt(a);
      setConfig((configRes.data as Config | null) ?? null);

      if (a?.id) {
        const { data: sRows } = await supabase
          .from("verification_signals")
          .select("axis,signal_type,score,passed")
          .eq("attempt_id", a.id)
          .order("created_at", { ascending: true });
        if (mounted) setSignals((sRows ?? []) as Signal[]);
      }

      if (facilityId) {
        // Look for an unconfirmed alias on the claim's facility. RLS
        // serves the SELECT to anyone (public-safe on approved facilities).
        const { data: aliasRows } = await supabase
          .from("facility_name_aliases")
          .select("id,alias_name,source,confirmed_by")
          .eq("facility_id", facilityId)
          .is("confirmed_by", null)
          .order("created_at", { ascending: false })
          .limit(1);
        if (mounted) setAlias((aliasRows?.[0] as Alias | null) ?? null);
      }

      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [claimId, facilityId]);

  async function startVoiceOtp() {
    setVoiceCalling(true);
    const { data, error } = await supabase.functions.invoke<{
      maskedPhone?: string;
      error?: string;
    }>("initiate-claim-voice-otp", { body: { claimRequestId: claimId } });
    setVoiceCalling(false);
    if (error || data?.error || !data?.maskedPhone) {
      toast({
        title: "Voice call couldn't be placed",
        description: data?.error || error?.message || "Try SMS or email verification.",
        variant: "destructive",
      });
      return;
    }
    setVoicePrompt({ maskedPhone: data.maskedPhone });
    toast({
      title: "Voice call placed",
      description: `Calling ${data.maskedPhone}. Listen for a 6-digit code.`,
    });
  }

  async function verifyVoiceOtp() {
    if (!/^\d{6}$/.test(voiceCode)) {
      toast({ title: "Enter 6 digits", variant: "destructive" });
      return;
    }
    setVoiceVerifying(true);
    const { data, error } = await supabase.functions.invoke<{
      verified?: boolean;
      error?: string;
      attemptsRemaining?: number;
    }>("verify-claim-voice-otp", {
      body: { claimRequestId: claimId, code: voiceCode },
    });
    setVoiceVerifying(false);
    if (error || data?.error) {
      const remaining = data?.attemptsRemaining;
      toast({
        title: "Couldn't verify code",
        description:
          (data?.error || error?.message) +
          (typeof remaining === "number" ? ` (${remaining} attempts left)` : ""),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Voice OTP verified" });
    setVoicePrompt(null);
    setVoiceCode("");
    // Re-fetch attempt state so the panel reflects the new score.
    const { data: aRows } = await supabase
      .from("verification_attempts")
      .select(
        "id,status,legitimacy_score,ownership_score,confidence_score,final_decision,trigger_reason",
      )
      .eq("claim_id", claimId)
      .order("started_at", { ascending: false })
      .limit(1);
    if (aRows?.[0]) setAttempt(aRows[0] as Attempt);
  }

  async function confirmAlias() {
    if (!alias) return;
    setConfirming(true);
    const { error } = await supabase.rpc("confirm_facility_alias", {
      p_alias_id: alias.id,
    });
    setConfirming(false);
    if (error) {
      toast({
        title: "Couldn't confirm name variant",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Name variant confirmed", description: "Thanks — that helps us match your listing." });
    setAlias(null);
  }

  if (loading) return null;
  if (!attempt) {
    // Legacy claim or engine couldn't start. Surface a help link so the
    // claimant is never dead-ended.
    return (
      <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          Verification engine hasn't recorded this claim yet.
        </span>
        <Button asChild variant="ghost" size="sm" className="h-6 text-xs">
          <Link to="/provider/help">
            <HelpCircle className="h-3 w-3 mr-1" aria-hidden />
            Get help
          </Link>
        </Button>
      </div>
    );
  }

  const legitOK =
    config != null &&
    attempt.legitimacy_score != null &&
    Number(attempt.legitimacy_score) >= Number(config.legitimacy_min_threshold);
  const ownerOK =
    config != null &&
    attempt.ownership_score != null &&
    Number(attempt.ownership_score) >= Number(config.ownership_min_threshold);

  // Ownership rungs cleared so far. Filter unique signal_types and show
  // passed-only chips so the claimant sees progress, not failed attempts.
  const passedRungs = Array.from(
    new Set(
      signals
        .filter((s) => s.axis === "ownership" && s.passed === true)
        .map((s) => s.signal_type),
    ),
  );

  return (
    <div className="mt-3 space-y-2.5">
      {alias && (
        <Card className="border-amber-300/70 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="p-3 flex flex-wrap items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" aria-hidden />
            <div className="flex-1 min-w-0 text-xs sm:text-sm">
              We found a different name on file for this address:{" "}
              <strong className="text-foreground">{alias.alias_name}</strong>.
              Is this the same facility?
            </div>
            <Button size="sm" onClick={confirmAlias} disabled={confirming} className="h-7 text-xs">
              {confirming ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3 w-3 mr-1" aria-hidden />
              )}
              Yes, same facility
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border border-slate-200 bg-slate-50/40 p-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden />
          <span className="text-muted-foreground">Verification engine:</span>
          <Badge
            variant={legitOK ? "outline" : "secondary"}
            className="text-[10px] h-5 gap-1"
          >
            Legitimacy{" "}
            <span className="font-semibold">
              {attempt.legitimacy_score != null
                ? Number(attempt.legitimacy_score).toFixed(0)
                : "—"}
            </span>
            <span className="text-muted-foreground">
              / {config?.legitimacy_min_threshold ?? "—"}
            </span>
          </Badge>
          <Badge
            variant={ownerOK ? "outline" : "secondary"}
            className="text-[10px] h-5 gap-1"
          >
            Ownership{" "}
            <span className="font-semibold">
              {attempt.ownership_score != null
                ? Number(attempt.ownership_score).toFixed(0)
                : "—"}
            </span>
            <span className="text-muted-foreground">
              / {config?.ownership_min_threshold ?? "—"}
            </span>
          </Badge>
          {attempt.final_decision && (
            <Badge
              variant={
                attempt.final_decision === "auto_approved"
                  ? "outline"
                  : attempt.final_decision === "rejected"
                    ? "destructive"
                    : "secondary"
              }
              className="text-[10px] h-5"
            >
              {attempt.final_decision === "auto_approved"
                ? "Auto-approved"
                : attempt.final_decision === "manual_review"
                  ? "Routed to human review"
                  : "Rejected"}
            </Badge>
          )}
        </div>

        {passedRungs.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-muted-foreground">Rungs cleared:</span>
            {passedRungs.map((rung) => (
              <span
                key={rung}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700"
              >
                <Check className="h-2.5 w-2.5" aria-hidden />
                {RUNG_LABEL[rung] ?? rung}
              </span>
            ))}
          </div>
        )}

        {/* Voice OTP rung — the highest-confidence ownership signal.
            Only show when ownership hasn't already passed; the engine
            already enforces the AND-gate so triggering this once
            you've cleared SMS+email is wasted UX. */}
        {!ownerOK && attempt.final_decision == null && (
          <div className="mt-2 rounded border border-slate-200 bg-white p-2">
            {voicePrompt ? (
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  We placed a voice call to{" "}
                  <strong className="text-foreground">
                    {voicePrompt.maskedPhone}
                  </strong>
                  . Listen for a 6-digit code, then enter it below.
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={voiceCode}
                    onChange={(e) =>
                      setVoiceCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                    className="flex-1 h-7 px-2 text-xs rounded border border-slate-300 bg-white"
                    autoComplete="one-time-code"
                  />
                  <Button
                    size="sm"
                    onClick={verifyVoiceOtp}
                    disabled={voiceVerifying || voiceCode.length !== 6}
                    className="h-7 text-xs"
                  >
                    {voiceVerifying ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    ) : (
                      "Verify"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-muted-foreground flex-1 min-w-0">
                  Strongest ownership signal — we place a voice call to
                  your facility's on-file phone and read a code aloud.
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startVoiceOtp}
                  disabled={voiceCalling}
                  className="h-7 text-xs gap-1 shrink-0"
                >
                  {voiceCalling ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : (
                    <PhoneCall className="h-3 w-3" aria-hidden />
                  )}
                  Call me
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-end">
          <Button asChild variant="ghost" size="sm" className="h-6 text-xs gap-1">
            <Link to="/provider/help">
              <HelpCircle className="h-3 w-3" aria-hidden />
              Get help
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
