import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, ArrowRight, MessageCircle } from "lucide-react";

/**
 * /international/apply, /international/intake, and /international/thank-you
 * all render this component after the 2026-05-20 retirement of the
 * paid international placement product. The previous flow charged
 * partner facilities $3,000 per admission and is no longer offered.
 *
 * The /international landing remains live as a thin informational page
 * (treatment options for international visitors) but no longer hosts
 * the application form. Seekers who came in via the retired path get
 * a clear "we no longer offer this directly" message + a pointer to
 * the domestic concierge for US-based options.
 */
export default function InternationalRetired() {
  return (
    <>
      <Helmet>
        <title>International Placement — Service Update | RehabLookup</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        <main className="flex-1 py-12 sm:py-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card>
              <CardContent className="p-8 sm:p-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Globe className="h-6 w-6 text-slate-700" aria-hidden />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                    Our dedicated international placement service has been retired.
                  </h1>
                </div>

                <p className="text-slate-700 leading-relaxed">
                  RehabLookup no longer offers a paid international placement
                  service. We made this change so every seeker receives the same
                  flat-fee, EKRA-aligned experience regardless of where they
                  live.
                </p>

                <div className="rounded-lg bg-slate-50 border border-slate-200 p-5 space-y-2">
                  <p className="font-semibold text-slate-900">
                    If you're looking for US treatment from outside the US:
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside marker:text-slate-400">
                    <li>
                      Use our <Link to="/concierge" className="text-[#1B365D] underline-offset-2 hover:underline font-medium">free concierge intake</Link>.
                      We'll match you with verified US programs that work with
                      international clients (most partner programs handle visa
                      and travel coordination directly).
                    </li>
                    <li>
                      Browse our directory of{" "}
                      <Link to="/us-rehab/international-patients" className="text-[#1B365D] underline-offset-2 hover:underline font-medium">
                        US programs that accept international patients
                      </Link>{" "}
                      for context on the typical process.
                    </li>
                    <li>
                      For non-US placement, contact local treatment
                      regulators or your country's embassy for in-country
                      options &mdash; we no longer broker outside the US.
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                  <Button asChild size="lg" className="bg-[#1B365D] hover:bg-[#142a4a] gap-2">
                    <Link to="/concierge">
                      <MessageCircle className="h-4 w-4" />
                      Start a concierge intake
                      <ArrowRight className="h-4 w-4 ml-auto" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/">Return home</Link>
                  </Button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
                  Questions about a case submitted before 2026-05-20?
                  Email{" "}
                  <a
                    href="mailto:placement@rehablookup.com"
                    className="text-[#1B365D] underline-offset-2 hover:underline font-medium"
                  >
                    placement@rehablookup.com
                  </a>{" "}
                  and we'll respond with next steps for your specific case.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <PublicFooter />
      </div>
    </>
  );
}
