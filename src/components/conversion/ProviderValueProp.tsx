import { CheckCircle, TrendingUp, Users, Star, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Benefit {
  icon: typeof CheckCircle;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: Users,
    title: "Reach Clients Actively Seeking Help",
    description:
      "15,000+ monthly visitors search RehabLookup for treatment options. Your listing puts you in front of high-intent clients at the exact moment they need you.",
  },
  {
    icon: TrendingUp,
    title: "Verified Leads, Not Just Traffic",
    description:
      "Our concierge team pre-qualifies every inquiry before sending it to you — so you spend time on real admissions, not tire-kickers.",
  },
  {
    icon: Shield,
    title: "Build Trust with Verification Badges",
    description:
      "Display your JCAHO, CARF, LegitScript, and state license badges prominently. Verified facilities receive 3× more inquiries than unverified ones.",
  },
  {
    icon: Star,
    title: "Collect & Showcase Reviews",
    description:
      "Respond to client reviews, flag inappropriate content, and build a public reputation that drives organic referrals.",
  },
  {
    icon: Zap,
    title: "Go Live in Under 10 Minutes",
    description:
      "Our guided setup wizard walks you through every step. Most providers complete their listing in one sitting — no technical skills required.",
  },
  {
    icon: CheckCircle,
    title: "No Hidden Fees for Clients",
    description:
      "RehabLookup is 100% free for clients, which means they trust our recommendations. You only pay for the leads you choose to unlock.",
  },
];

interface ProviderValuePropProps {
  className?: string;
}

export function ProviderValueProp({ className }: ProviderValuePropProps) {
  return (
    <section
      className={cn("rounded-2xl border bg-card p-6 sm:p-8", className)}
      aria-labelledby="provider-value-prop-heading"
    >
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          Why List on RehabLookup?
        </p>
        <h2
          id="provider-value-prop-heading"
          className="text-2xl font-bold text-foreground"
        >
          Grow Your Admissions with Qualified Referrals
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
          Join thousands of verified treatment providers who use RehabLookup to
          connect with clients who are ready to start their recovery journey.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex gap-3 rounded-xl border bg-background p-4"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Social proof strip */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-t pt-5">
        {[
          "3,800+ Verified Facilities",
          "All 50 States",
          "Free for Clients",
          "HIPAA Compliant",
        ].map((item) => (
          <span
            key={item}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <CheckCircle className="h-3.5 w-3.5 text-primary" aria-hidden />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
