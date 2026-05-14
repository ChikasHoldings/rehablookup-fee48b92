import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  carrier: string;
  description?: string;
}

export function InsuranceVerifyCarrierCTA({ carrier, description }: Props) {
  const href = `/insurance-verification?carrier=${encodeURIComponent(carrier)}`;

  return (
    <section className="border-y border-primary/20 bg-primary/5 py-10 md:py-14" aria-labelledby="verify-carrier-cta-heading">
      <div className="container">
        <div className="mx-auto max-w-3xl rounded-2xl border border-primary/30 bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 id="verify-carrier-cta-heading" className="font-display text-lg font-bold text-foreground md:text-xl">
                  Verify your {carrier} coverage — free &amp; confidential
                </h2>
                <p className="mt-1 text-sm text-muted-foreground md:text-base">
                  {description ||
                    `Submit your ${carrier} member ID and our care team will confirm what your plan covers for rehab, medications, and out-of-pocket cost — usually within one business day.`}
                </p>
                <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2 sm:text-sm">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    No cost, no obligation
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    HIPAA-aware handling
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Plain-English coverage summary
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Same or next business day
                  </li>
                </ul>
              </div>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link to={href} aria-label={`Verify my ${carrier} insurance coverage`}>
                Verify my {carrier} coverage
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
