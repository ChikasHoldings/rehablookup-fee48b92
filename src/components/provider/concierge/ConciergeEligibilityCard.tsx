import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ShieldAlert, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConciergeEligibilityCardProps {
  facilityId: string;
}

interface EligibilityRow {
  concierge_eligibility_attested_at: string | null;
  concierge_eligibility_revoked_at: string | null;
  concierge_eligibility_revoked_reason: string | null;
  concierge_license_number: string | null;
  concierge_accepts_emergency: boolean | null;
  listing_completeness_score: number | null;
}

const MIN_COMPLETENESS = 80;

/**
 * Concierge Partner eligibility gate. A partner is only introduced to families
 * by our advisors once they've completed this attestation: profile complete
 * (>= 80%), a valid license number, and a commitment to accept families in an
 * emergency. Self-attestation unlocks introducibility immediately; admins can
 * revoke (sticky — a revoked partner must contact support to be restored).
 */
export function ConciergeEligibilityCard({ facilityId }: ConciergeEligibilityCardProps) {
  const queryClient = useQueryClient();
  const [licenseNumber, setLicenseNumber] = useState("");
  const [acceptsEmergency, setAcceptsEmergency] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["concierge-eligibility", facilityId],
    queryFn: async (): Promise<EligibilityRow> => {
      const { data, error } = await supabase
        .from("facilities")
        .select(
          "concierge_eligibility_attested_at, concierge_eligibility_revoked_at, concierge_eligibility_revoked_reason, concierge_license_number, concierge_accepts_emergency, listing_completeness_score",
        )
        .eq("id", facilityId)
        .maybeSingle();
      if (error) throw error;
      return (data as EligibilityRow) ?? {
        concierge_eligibility_attested_at: null,
        concierge_eligibility_revoked_at: null,
        concierge_eligibility_revoked_reason: null,
        concierge_license_number: null,
        concierge_accepts_emergency: null,
        listing_completeness_score: 0,
      };
    },
    staleTime: 1000 * 30,
  });

  // Pre-fill the license field from any prior attestation.
  useEffect(() => {
    if (data?.concierge_license_number) setLicenseNumber(data.concierge_license_number);
    if (data?.concierge_accepts_emergency) setAcceptsEmergency(true);
  }, [data?.concierge_license_number, data?.concierge_accepts_emergency]);

  if (isLoading) {
    return (
      <Card className="border-violet-200">
        <CardHeader><CardTitle className="text-base">Introduction eligibility</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-28 w-full" /></CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-violet-200">
        <CardHeader><CardTitle className="text-base">Introduction eligibility</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-destructive" aria-hidden /> Couldn't load eligibility.
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const completeness = data.listing_completeness_score ?? 0;
  const profileReady = completeness >= MIN_COMPLETENESS;
  const isRevoked = !!data.concierge_eligibility_revoked_at;
  const isAttested = !!data.concierge_eligibility_attested_at && !isRevoked;

  const handleAttest = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("attest_concierge_eligibility", {
        p_facility_id: facilityId,
        p_license_number: licenseNumber.trim(),
        p_accepts_emergency: acceptsEmergency,
      });
      if (error) throw error;
      toast.success("Eligibility confirmed — your facility is now introducible to families.");
      queryClient.invalidateQueries({ queryKey: ["concierge-eligibility", facilityId] });
      setConfirmed(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't confirm eligibility");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Introducible (attested, not revoked) ──────────────────────────────
  if (isAttested) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
              Introduction eligibility
            </CardTitle>
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Introducible</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
            Your facility is eligible for advisor introductions to families.
          </p>
          <p className="text-xs text-muted-foreground">
            License on file: <span className="font-medium text-slate-700">{data.concierge_license_number}</span> ·
            Emergency admissions: <span className="font-medium text-slate-700">Yes</span> ·
            Confirmed {new Date(data.concierge_eligibility_attested_at as string).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Revoked (admin) ───────────────────────────────────────────────────
  if (isRevoked) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />
              Introduction eligibility
            </CardTitle>
            <Badge variant="outline" className="border-destructive/40 text-destructive">Revoked</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-slate-700">
          <p>Your eligibility for advisor introductions was paused by our team.</p>
          {data.concierge_eligibility_revoked_reason && (
            <p className="text-xs text-muted-foreground">
              Reason: {data.concierge_eligibility_revoked_reason}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Please contact support to resolve this and restore introductions.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Action needed: attestation form ───────────────────────────────────
  const canSubmit = profileReady && licenseNumber.trim().length >= 3 && acceptsEmergency && confirmed && !submitting;

  return (
    <Card className="border-violet-200 bg-violet-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Complete your introduction eligibility</CardTitle>
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">Action needed</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-700 leading-relaxed">
          Before our advisors introduce your facility to families, confirm you're
          ready. Concierge introductions are <strong>exclusive to verified partners</strong>
          {" "}— this is what justifies the plan and keeps families safe.
        </p>

        {/* Profile completeness gate */}
        <div className="rounded-md border bg-white p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900">Profile completeness</span>
            <span className={profileReady ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"}>
              {completeness}% {profileReady ? "✓" : `(need ${MIN_COMPLETENESS}%)`}
            </span>
          </div>
          <Progress value={completeness} className="h-2" />
          {!profileReady && (
            <p className="text-xs text-muted-foreground">
              Bring your profile to at least {MIN_COMPLETENESS}% so families see a complete listing.{" "}
              <Link to="/provider/listings" className="text-violet-700 underline-offset-2 hover:underline">
                Edit your listing →
              </Link>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="concierge-license">State license number</Label>
          <Input
            id="concierge-license"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="e.g., 12345-AB"
            disabled={!profileReady}
          />
          <p className="text-xs text-muted-foreground">
            Your facility's operating/clinical license number. Subject to verification.
          </p>
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <Checkbox
            checked={acceptsEmergency}
            onCheckedChange={(c) => setAcceptsEmergency(c === true)}
            disabled={!profileReady}
            className="mt-0.5"
          />
          <span className="text-sm text-slate-700">
            We can accept families in an emergency and respond to advisor introductions
            within 24 hours.
          </span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(c) => setConfirmed(c === true)}
            disabled={!profileReady}
            className="mt-0.5"
          />
          <span className="text-sm text-slate-700">
            I confirm the above is accurate and our facility is licensed and able to
            admit the families our advisors introduce.
          </span>
        </label>

        <Button
          onClick={handleAttest}
          disabled={!canSubmit}
          className="w-full bg-[#1B365D] hover:bg-[#142a4a] gap-1.5"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Confirm eligibility &amp; go live for introductions
        </Button>
      </CardContent>
    </Card>
  );
}
