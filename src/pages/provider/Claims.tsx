/**
 * Provider Claims — claimant's status list
 * ────────────────────────────────────────
 * Shows the signed-in claimant every claim they've submitted: status,
 * verification state, facility, and a deep link to the appropriate
 * follow-up surface.
 *
 * RLS already scopes facility_claim_requests SELECT to the caller's own
 * rows, so we don't need an explicit user_id filter.
 *
 * Routes (2026-05-20 unification):
 *   - Approved claim → /provider/dashboard (the user now owns the facility)
 *   - Pending claim w/ unverified verification → /provider/onboarding?intent=claim&facility_slug=…
 *     (re-enter the unified wizard to finish the verification substep)
 *   - All other states: rendered inline here (no separate status page)
 *
 * The retired /provider/claim/:slug/submitted page used to show a
 * verification-method label + timeline; that information now lives in
 * the inline row metadata + the VerificationStatusChip on this page.
 */

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { ProviderPageHeader } from "@/components/provider/ProviderPageHeader";
import { ClaimEngineStatePanel } from "@/components/provider/ClaimEngineStatePanel";
import { useUserRole } from "@/hooks/useUserRole";
import { resolveClaimsGuard } from "@/lib/claimsRouteGuard";

type ClaimStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "withdrawn";
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

interface FacilityRef {
  id: string;
  name: string | null;
  city: string | null;
  state: string | null;
  slug: string | null;
}

interface ClaimRow {
  id: string;
  status: ClaimStatus;
  verification_method: VerificationMethod;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  facilities: FacilityRef | null;
}

const STATUS_LABEL: Record<ClaimStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const METHOD_LABEL: Record<NonNullable<VerificationMethod>, string> = {
  email_domain: "Work email",
  sms_phone: "SMS",
  document_upload: "Document",
};

const METHOD_ICON: Record<NonNullable<VerificationMethod>, typeof Mail> = {
  email_domain: Mail,
  sms_phone: MessageSquare,
  document_upload: FileText,
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ProviderClaims() {
  const navigate = useNavigate();
  const { role, isLoading: isRoleLoading, isAuthenticated } = useUserRole();
  const [claims, setClaims] = useState<ClaimRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Panel-consistent route guard. This page is intentionally NOT mounted inside
  // ProviderShell: the shell bounces providers with incomplete onboarding into
  // the wizard, but /provider/claims must stay reachable mid-claim — a pending,
  // still-unverified claim renders a "Resume" link back into onboarding. So we
  // enforce auth + role here using the same useUserRole source of truth as the
  // shell, minus that onboarding bounce:
  //   • anonymous → onboarding (carrying returnTo so the claim intent survives)
  //   • admin     → the admin claim-review surface (/admin/claims)
  //   • seeker    → their account home
  //   • provider / brief null-role signup window → render the claims list
  //     (RLS scopes rows to the caller, so the null-role window is safe)
  const guard = resolveClaimsGuard(role, isAuthenticated, isRoleLoading);
  const redirectTo = guard.kind === "redirect" ? guard.to : null;
  useEffect(() => {
    if (redirectTo) navigate(redirectTo, { replace: true });
  }, [redirectTo, navigate]);

  const authChecking = guard.kind !== "render";

  useEffect(() => {
    if (authChecking) return;
    let cancelled = false;
    supabase
      .from("facility_claim_requests")
      .select(
        `id, status, verification_method, verification_status,
         rejection_reason, created_at, updated_at, reviewed_at,
         facilities ( id, name, city, state, slug )`,
      )
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message);
        } else {
          setClaims((data ?? []) as unknown as ClaimRow[]);
        }
      }, (err) => {
        if (cancelled) return;
        console.error("[Claims] facility_claim_requests fetch failed", err);
        setError(err instanceof Error ? err.message : "Couldn't load your claims");
      });
    return () => {
      cancelled = true;
    };
  }, [authChecking]);

  const sorted = useMemo(() => {
    if (!claims) return null;
    // Active claims first (pending / under_review), then approved, then resolved.
    const rank = (s: ClaimStatus) =>
      s === "pending" || s === "under_review" ? 0 : s === "approved" ? 1 : 2;
    return [...claims].sort((a, b) => rank(a.status) - rank(b.status));
  }, [claims]);

  return (
    <>
      <Helmet>
        <title>My claims — RehabLookup</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-slate-50">
        <ProviderPageHeader
          title="My claims"
          description="Every listing you've claimed, along with where it stands in review."
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <div className="container mx-auto max-w-3xl px-4 py-5 md:px-6 lg:px-8">

        {authChecking || (claims === null && !error) ? (
          <Card className="p-8 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading your claims…</p>
          </Card>
        ) : error ? (
          <Card className="p-6 space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"
                aria-hidden
              />
              <div>
                <h2 className="font-semibold">We couldn't load your claims</h2>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </Card>
        ) : sorted!.length === 0 ? (
          <Card className="p-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              You haven't started any claims yet. Find your facility on
              RehabLookup and use the "Claim This Listing" button on its
              detail page to get started.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/rehab-centers">Browse facilities</Link>
            </Button>
          </Card>
        ) : (
          <ul className="space-y-3">
            {sorted!.map((claim) => (
              <ClaimListItem key={claim.id} claim={claim} />
            ))}
          </ul>
        )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function ClaimListItem({ claim }: { claim: ClaimRow }) {
  const facilityName = claim.facilities?.name ?? "Unknown facility";
  const slug = claim.facilities?.slug;
  const Method = claim.verification_method
    ? METHOD_ICON[claim.verification_method]
    : null;

  // 2026-05-20 unification: the only follow-up surface beyond this row
  // is the dashboard (for approved claims). Pending/unverified claims
  // get a "Resume" button that re-enters the unified onboarding wizard
  // with the slug carried via query param so the user lands back at the
  // verification substep with their sessionStorage hydrated. The retired
  // /provider/claim/:slug/submitted page used to host a separate status
  // view — all that info is now rendered inline below.
  const primaryHref =
    claim.status === "approved" ? "/provider/dashboard" : null;
  const primaryLabel = "Open dashboard";

  const resumeHref =
    claim.status === "pending" &&
    claim.verification_status !== "verified" &&
    slug
      ? `/provider/onboarding?intent=claim&facility_slug=${encodeURIComponent(slug)}`
      : null;

  return (
    <Card className="p-4 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-base text-foreground">
              {facilityName}
            </h2>
            <ClaimStatusBadge status={claim.status} />
          </div>
          {claim.facilities?.city && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {claim.facilities.city}, {claim.facilities.state}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {Method && claim.verification_method && (
              <span className="inline-flex items-center gap-1">
                <Method className="h-3 w-3" aria-hidden />
                {METHOD_LABEL[claim.verification_method]}
              </span>
            )}
            <VerificationStatusChip status={claim.verification_status} />
            <span>Submitted {formatDate(claim.created_at)}</span>
            {claim.reviewed_at && claim.status !== "pending" && (
              <span>Reviewed {formatDate(claim.reviewed_at)}</span>
            )}
          </div>
          {claim.status === "rejected" && claim.rejection_reason && (
            <p className="text-xs text-destructive mt-2">
              {claim.rejection_reason}
            </p>
          )}
          <ClaimEngineStatePanel
            claimId={claim.id}
            facilityId={claim.facilities?.id ?? null}
          />
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {primaryHref && (
            <Button asChild size="sm">
              <Link to={primaryHref}>{primaryLabel}</Link>
            </Button>
          )}
          {resumeHref && (
            <Button asChild variant="outline" size="sm">
              <Link to={resumeHref}>Resume</Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  if (status === "approved") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Approved
      </Badge>
    );
  }
  if (status === "rejected" || status === "withdrawn") {
    return (
      <Badge variant={status === "rejected" ? "destructive" : "outline"}>
        {STATUS_LABEL[status]}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" aria-hidden />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function VerificationStatusChip({ status }: { status: VerificationStatus }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
        <ShieldCheck className="h-3 w-3" aria-hidden />
        Verified
      </span>
    );
  }
  if (status === "failed" || status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <AlertTriangle className="h-3 w-3" aria-hidden />
        {status === "failed" ? "Verification failed" : "Verification expired"}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" aria-hidden />
        Verification pending
      </span>
    );
  }
  return null;
}
