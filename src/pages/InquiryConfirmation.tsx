import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

/**
 * /inquiry/confirmation/:inquiryId
 *
 * Landing page after a Free-tier inquiry submission. Explains the
 * concierge-redirect model honestly: the seeker submitted on a Free
 * facility, that facility is one of three options the concierge will
 * present, the other two are clinical/insurance-matched.
 *
 * Pro-tier confirmations don't route here — they use the existing
 * lead-confirmation pages.
 */
export default function InquiryConfirmation() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inquiryId) {
      setLoading(false);
      return;
    }
    // Look up the originating facility's name from the inquiry's
    // intake_data. The page works even if the lookup fails — the
    // confirmation message just shows "this facility" instead of the
    // facility's name.
    supabase
      .from("concierge_inquiries")
      .select("id, routing_mode, intake_data")
      .eq("id", inquiryId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
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
  }, [inquiryId]);

  const refDisplay = inquiryId
    ? `#${inquiryId.replace(/-/g, "").slice(0, 6).toUpperCase()}-${inquiryId.replace(/-/g, "").slice(6, 11).toUpperCase()}`
    : "";

  return (
    <Layout>
      <Helmet>
        <title>You're connected | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <Card>
          <CardContent className="p-6 md:p-10 space-y-6">
            {loading ? (
              <>
                <Skeleton className="h-14 w-14 rounded-full mx-auto" />
                <Skeleton className="h-8 w-3/4 mx-auto" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-7 w-7 text-emerald-700" aria-hidden />
                  </div>
                  <h1 className="mt-4 text-2xl md:text-3xl font-bold text-slate-900">
                    You're connected.
                  </h1>
                  <p className="mt-3 text-sm md:text-base text-slate-700 leading-relaxed">
                    A RehabLookup care coordinator will reach out within{" "}
                    <strong>1 business hour</strong> to introduce you to{" "}
                    {inquiry?.originating_facility_name ? (
                      <strong>{inquiry.originating_facility_name}</strong>
                    ) : (
                      "this facility"
                    )}{" "}
                    along with <strong>1-2 additional matched facilities</strong>.
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm">
                  <p className="font-semibold text-slate-900 mb-1">Why multiple options?</p>
                  <p className="text-slate-700 leading-relaxed">
                    We always present multiple matches so you can compare. There's
                    never any pressure to choose any particular facility — you
                    pick what feels right for you.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="font-semibold text-slate-900">What's next?</p>
                  <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside marker:font-semibold marker:text-[#1B365D]">
                    <li>
                      A coordinator calls or emails you (whichever you indicated).
                    </li>
                    <li>
                      They'll share contact info for 3 facilities matching your
                      insurance, level of care, and location.
                    </li>
                    <li>
                      You decide who to reach out to first. Calls go directly to
                      the facility — we never route or intermediate.
                    </li>
                  </ol>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                  <p className="text-slate-700 mb-2">
                    In the meantime, you can also call us directly:
                  </p>
                  <a
                    href={`tel:${CONCIERGE_PHONE_TEL}`}
                    className="inline-flex items-center gap-2 font-semibold text-[#1B365D] hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {CONCIERGE_PHONE_DISPLAY}
                  </a>
                </div>

                {refDisplay && (
                  <p className="text-xs text-slate-500 text-center">
                    Inquiry reference: {refDisplay}
                  </p>
                )}

                <div className="pt-2 text-center">
                  <Button asChild variant="ghost" className="gap-1.5">
                    <Link to="/">
                      Back to home <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
