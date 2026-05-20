/**
 * Claim Submitted — post-wizard status page
 * ─────────────────────────────────────────
 * Reached from /provider/claim/:slug after the wizard's step-5 submit
 * succeeds. Shows the claim's current verification status and a
 * timeline that adapts to the method chosen (email/SMS already
 * verified vs document upload pending admin review).
 *
 * The claim is resolved by querying facility_claim_requests where
 * the row belongs to the current user and the facility id matches —
 * RLS scopes the result to claims the user owns.
 */

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFacilityBySlug } from "@/hooks/useFacilityBySlug";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type VerificationMethod =
  | "email_domain"
  | "sms_phone"
  | "document_upload"
  | null;
type VerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "failed"
  | "expired";

interface ClaimRow {
  id: string;
  status: string;
  verification_method: VerificationMethod;
  verification_status: VerificationStatus;
  verified_at: string | null;
  created_at: string;
}

export default function ClaimSubmitted() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [claimLoading, setClaimLoading] = useState(true);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Auth gate. Anon visitors don't belong here.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session?.user) {
        navigate("/provider/onboarding", { replace: true });
        return;
      }
      setCurrentUserId(session.user.id);
      setAuthChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const { facility, loading: facilityLoading, notFound } = useFacilityBySlug(slug);

  // Look up the latest claim for this user + facility. RLS enforces that
  // the row belongs to the caller.
  useEffect(() => {
    if (!facility?.id || !currentUserId) return;
    let cancelled = false;
    setClaimLoading(true);
    setClaimError(null);
    supabase
      .from("facility_claim_requests")
      .select(
        "id, status, verification_method, verification_status, verified_at, created_at",
      )
      .eq("facility_id", facility.id)
      .eq("claimant_user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setClaimError(error.message);
        } else {
          setClaim(data as ClaimRow | null);
        }
        setClaimLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facility?.id, currentUserId]);

  // 2026-05-20 plan-gate fix: this page used to call
  // `complete_provider_onboarding()` on mount as "idempotent recovery",
  // but ClaimWizard step 5 (intentionally) does NOT call that RPC — it
  // advances the state cursor to 'plan' and routes here. The premature
  // RPC flipped `profiles.onboarding_completed_at` AND
  // `provider_onboarding_state.current_step='completed'`, after which
  // the Onboarding host bounced the user straight to the dashboard
  // when they clicked "Pick your plan" — never rendering PlanStep, and
  // leaving `profiles.plan` at its schema default with no explicit
  // choice. PlanStep is now the single owner of the completion flip
  // (handleFree → complete_provider_onboarding_with_plan; handlePro →
  // Stripe webhook). See docs/monetization-plan-gate-audit-2026-05-20.md.

  const headline = useMemo(() => {
    if (!claim) return "Thanks — your claim is in.";
    if (claim.verification_status === "verified") {
      return "You're verified. Last step: admin review.";
    }
    return "Thanks — your claim is in.";
  }, [claim]);

  return (
    <>
      <Helmet>
        <title>Claim submitted — RehabLookup</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 max-w-2xl">
        {(authChecking || facilityLoading) && (
          <Card className="p-8 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading your claim…</p>
          </Card>
        )}

        {!authChecking && !facilityLoading && (notFound || !facility) && (
          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"
                aria-hidden
              />
              <div>
                <h1 className="font-semibold">We couldn't find that facility</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  The listing may have been removed since you submitted your
                  claim. We're keeping the claim on file — our team will reach
                  out shortly.
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/provider/onboarding">
                <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
                Back to onboarding
              </Link>
            </Button>
          </Card>
        )}

        {!authChecking && !facilityLoading && facility && (
          <Card className="p-6 md:p-7 space-y-5">
            <header className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />
                <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
                  {headline}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Your claim for{" "}
                <span className="font-medium text-foreground">
                  {facility.name}
                </span>{" "}
                is on file. Here's what happens next.
              </p>
            </header>

            {claimLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading status…
              </div>
            ) : claimError ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                We couldn't load your claim status: {claimError}
              </div>
            ) : !claim ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                We don't see a claim on file yet for this facility. If you just
                submitted, refresh in a moment.
              </div>
            ) : (
              <>
                <StatusRow claim={claim} />
                <Timeline claim={claim} />
              </>
            )}

            {/* While the operator is in claim-submitted mode, surface the Pro
                pitch. They're already converted on the "this directory is real
                and I want my listing" idea — this is the moment of highest
                intent to also evaluate Pro. (Phase 5C) */}
            {claim && (
              <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.05] to-amber-500/[0.05] p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4 flex-wrap">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-foreground">
                      While you wait — preview Pro
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      The moment your claim is approved you can activate Pro ($99/mo): a verified
                      badge, priority placement in search, 10 photos plus video on your profile,
                      unlimited facility listings, analytics, and access to the Marketing Hub
                      (Featured + Concierge add-ons). All leads are delivered to you with full
                      contact details — no per-lead fees, ever.
                    </p>
                  </div>
                  <Button asChild className="gap-1.5 shrink-0">
                    <Link to="/provider/billing">
                      See Pro pricing
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:items-center sm:justify-between pt-3 border-t">
              <Button asChild variant="outline" size="sm">
                <Link to="/provider/claims">View my claims</Link>
              </Button>
              <Button asChild>
                <Link to="/provider/onboarding?step=plan">
                  Pick your plan
                  <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden />
                </Link>
              </Button>
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </>
  );
}

function StatusRow({ claim }: { claim: ClaimRow }) {
  const methodLabel: Record<NonNullable<VerificationMethod>, string> = {
    email_domain: "Work email",
    sms_phone: "SMS to facility phone",
    document_upload: "Document upload",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Verification method
        </div>
        <div className="mt-0.5 font-medium text-sm">
          {claim.verification_method
            ? methodLabel[claim.verification_method]
            : "Not selected"}
        </div>
      </div>
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Status
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <StatusBadge status={claim.verification_status} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  switch (status) {
    case "verified":
      return (
        <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
          <ShieldCheck className="h-3 w-3" aria-hidden />
          Verified
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" aria-hidden />
          Pending review
        </Badge>
      );
    case "failed":
    case "expired":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          {status === "failed" ? "Failed" : "Expired"}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" aria-hidden />
          Not yet started
        </Badge>
      );
  }
}

function Timeline({ claim }: { claim: ClaimRow }) {
  const steps =
    claim.verification_method === "document_upload"
      ? [
          {
            title: "Documents submitted",
            body: "Your verification documents are in our queue.",
            done: true,
          },
          {
            title: "Admin verification (1–2 business days)",
            body: "Our team reviews your accreditation/license documents and confirms your role.",
            done: false,
          },
          {
            title: "Claim approved",
            body: "Ownership transfers to your account and your enriched listing goes live.",
            done: false,
          },
        ]
      : [
          {
            title: "Identity verified",
            body:
              claim.verification_method === "email_domain"
                ? "We confirmed your work email at the facility's domain."
                : "We confirmed the code we sent to the facility's phone.",
            done: claim.verification_status === "verified",
          },
          {
            title: "Admin review (usually within 1 business day)",
            body: "Our team reviews your submitted details, then approves.",
            done: false,
          },
          {
            title: "Claim approved",
            body: "Ownership transfers to your account and your enriched listing goes live.",
            done: false,
          },
        ];

  return (
    <div>
      <h2 className="font-semibold text-sm mb-2">What happens next</h2>
      <ol className="space-y-3">
        {steps.map((step, idx) => (
          <li key={idx} className="flex gap-3">
            <div className="shrink-0 mt-0.5">
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                  {idx + 1}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div
                className={
                  "text-sm font-medium " +
                  (step.done ? "text-foreground" : "text-foreground")
                }
              >
                {step.title}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
