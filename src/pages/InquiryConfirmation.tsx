import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Phone, ArrowRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { CONCIERGE_PHONE_DISPLAY, CONCIERGE_PHONE_TEL } from "@/lib/contactInfo";

interface InquiryDetail {
  id: string;
  originating_facility_name: string | null;
  routing_mode: string | null;
}

/** The one historical routing mode this page is allowed to render. */
const LEGACY_ROUTING_MODE = "free_tier_redirect";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * /inquiry/confirmation/:inquiryId — LEGACY COMPATIBILITY ROUTE.
 *
 * ⚠ This page is retained ONLY so that confirmation links already sent to
 * seekers before the directory cutover (bookmarks, emails, browser history)
 * keep resolving to a truthful status page for the historical case that is
 * still being serviced. It is NOT part of any current flow:
 *
 *   • No Stage-2 code path navigates here.
 *   • `submit-qualified-lead` no longer returns a `confirmation_path`; a
 *     non-Pro facility now returns DIRECT_CONTACT_REQUIRED and RehabLookup
 *     collects nothing.
 *   • No new `concierge_inquiries` row with
 *     routing_mode='free_tier_redirect' can be created by the seeker-facing
 *     site, so no new inquiry can ever land on this URL.
 *
 * It renders the coordinator/matching copy only when a genuine historical
 * `free_tier_redirect` record is found. A malformed id, a missing row, or a
 * row with any other routing mode is redirected to the directory rather
 * than being shown a placement promise the platform no longer makes. Under
 * no circumstances may this page be turned back into an intake funnel.
 *
 * Removal is scheduled for the Stage-4 historical concierge data/workflow
 * retirement, once the remaining historical cases are closed. See
 * docs/directory-cutover-stage-02-inquiry-routing.md.
 */
export default function InquiryConfirmation() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const idIsWellFormed = !!inquiryId && UUID_RE.test(inquiryId);

  useEffect(() => {
    if (!idIsWellFormed) {
      setLoading(false);
      return;
    }
    supabase
      .from("concierge_inquiries")
      .select("id, routing_mode, intake_data")
      .eq("id", inquiryId)
      .maybeSingle()
      .then(({ data }) => {
        // Only a genuine historical free-tier-redirect record may render the
        // legacy coordinator status. Anything else falls through to the
        // directory redirect below.
        if (data && data.routing_mode === LEGACY_ROUTING_MODE) {
          const intake = (data.intake_data as Record<string, unknown> | null) ?? {};
          const originating =
            typeof intake.originating_facility_name === "string"
              ? intake.originating_facility_name
              : null;
          setInquiry({
            id: data.id,
            originating_facility_name: originating,
            routing_mode: data.routing_mode,
          });
        }
        setLoading(false);
      });
  }, [inquiryId, idIsWellFormed]);

  if (!idIsWellFormed) {
    return <Navigate to="/search-results" replace />;
  }

  if (loading) {
    return (
      <Layout>
        <Helmet>
          <title>Your inquiry | RehabLookup</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="container mx-auto px-4 py-10 max-w-2xl">
          <Card>
            <CardContent className="p-6 md:p-10 space-y-6">
              <Skeleton className="h-14 w-14 rounded-full mx-auto" />
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // No historical record (or not a free_tier_redirect one) — send the visitor
  // back to the directory instead of showing coordinator/matching promises.
  if (!inquiry) {
    return <Navigate to="/search-results" replace />;
  }

  const refDisplay = inquiryId
    ? `#${inquiryId.replace(/-/g, "").slice(0, 6).toUpperCase()}-${inquiryId.replace(/-/g, "").slice(6, 11).toUpperCase()}`
    : "";

  return (
    <Layout>
      <Helmet>
        <title>Your inquiry | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <Card>
          <CardContent className="p-6 md:p-10 space-y-6">
            <div className="text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-700" aria-hidden />
              </div>
              <h1 className="mt-4 text-2xl md:text-3xl font-bold text-slate-900">
                We received your inquiry.
              </h1>
              {/* Truthful for this EXISTING historical case only — it was
                  submitted under the retired concierge-redirect model and is
                  still being serviced under those terms. New inquiries are
                  never handled this way. */}
              <p className="mt-3 text-sm md:text-base text-slate-700 leading-relaxed">
                A RehabLookup coordinator is following up on this earlier
                request to introduce you to{" "}
                {inquiry.originating_facility_name ? (
                  <strong>{inquiry.originating_facility_name}</strong>
                ) : (
                  "the facility you contacted"
                )}
                .
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm">
              <p className="font-semibold text-slate-900 mb-1">
                How RehabLookup works now
              </p>
              <p className="text-slate-700 leading-relaxed">
                RehabLookup is a treatment directory. You search and compare
                centers, then contact the ones you choose directly — we don't
                match, place, or route anyone. This page relates to an earlier
                request submitted before that change.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <p className="text-slate-700 mb-2">
                Questions about <em>this existing inquiry</em>? You can reach
                RehabLookup support at:
              </p>
              <a
                href={`tel:${CONCIERGE_PHONE_TEL}`}
                className="inline-flex items-center gap-2 font-semibold text-[#1B365D] hover:underline"
              >
                <Phone className="h-4 w-4" />
                {CONCIERGE_PHONE_DISPLAY}
              </a>
              <p className="mt-2 text-xs text-slate-500">
                Support for this inquiry only — this is not a treatment
                placement or referral helpline.
              </p>
            </div>

            {/* Crisis line — anyone waiting on a follow-up must always have an
                immediate-help path. */}
            <div
              role="complementary"
              aria-label="Immediate crisis support"
              className="rounded-lg border border-red-200 bg-red-50/70 p-4 text-sm text-red-900"
            >
              <p className="font-semibold">In crisis right now?</p>
              <p className="mt-1 leading-relaxed">
                Call or text{" "}
                <a href="tel:988" className="font-bold underline">988</a>{" "}
                for the Suicide &amp; Crisis Lifeline, or visit{" "}
                <a
                  href="https://988lifeline.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  988lifeline.org
                </a>
                . If someone is in immediate danger, call 911. Trained
                counselors are available 24/7.
              </p>
            </div>

            {refDisplay && (
              <p className="text-xs text-slate-500 text-center">
                Inquiry reference: {refDisplay}
              </p>
            )}

            <div className="pt-2 text-center">
              <Button asChild variant="ghost" className="gap-1.5">
                <Link to="/search-results">
                  Browse the directory <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
