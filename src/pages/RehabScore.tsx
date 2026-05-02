import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import {
  ShieldCheck,
  Award,
  MapPin,
  Star,
  CheckCircle2,
  Activity,
  Lock,
  AlertTriangle,
  Scale,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";

const SCORE_FACTORS = [
  {
    icon: ShieldCheck,
    label: "Verification & Licensing",
    weight: "30%",
    description:
      "State licensure, accreditation (Joint Commission, CARF, LegitScript), and Medicaid/Medicare certification status.",
  },
  {
    icon: Award,
    label: "Clinical Quality Signals",
    weight: "25%",
    description:
      "Levels of care offered, evidence-based modalities (MAT, CBT, DBT), medical staffing, and dual-diagnosis capability.",
  },
  {
    icon: Star,
    label: "Verified Outcomes & Reviews",
    weight: "20%",
    description:
      "Owner-replied Google reviews, completion rates where reported, and third-party survey data. We never count anonymous or unverifiable reviews.",
  },
  {
    icon: MapPin,
    label: "Proximity & Access",
    weight: "15%",
    description:
      "Exact match → city → state → nearby state → nationwide. Closer, in-network options always rank above paid placement.",
  },
  {
    icon: Activity,
    label: "Profile Completeness",
    weight: "10%",
    description:
      "Hours of detail provided by the facility — insurance accepted, photos, staff bios, amenities, FAQs — so families can decide faster.",
  },
];

const NEVER_FACTORS = [
  "Whether a facility pays for advertising",
  "Whether a facility is a Pro member",
  "Click-through rates on outbound calls",
  "How quickly a facility responds to leads",
  "Anonymous third-party review aggregators",
];

const RehabScore = () => {
  return (
    <Layout>
      <SEO
        title="The Rehab Score — How RehabLookup Ranks Treatment Centers"
        description="A transparent, weighted methodology for ranking addiction treatment centers based on licensing, clinical quality, verified outcomes, proximity, and profile depth."
        canonical="/rehab-score"
        keywords={[
          "rehab score",
          "rehab ranking methodology",
          "how rehab centers are ranked",
          "rehab transparency",
          "trusted rehab directory",
        ]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Rehab Score", url: "/rehab-score" },
        ]}
      />

      <section className="border-b border-border bg-secondary/30 py-12">
        <div className="container">
          <BreadcrumbNav className="mb-4" variant="light" items={[{ label: "Rehab Score" }]} />
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                The Rehab Score
              </h1>
              <p className="text-muted-foreground">
                A transparent, weighted score families can actually trust.
              </p>
            </div>
          </div>
          <p className="max-w-3xl text-foreground/80">
            Most rehab directories rank facilities by who pays them. RehabLookup ranks by what
            matters to people in crisis — licensing, clinical depth, real outcomes, and proximity.
            This page documents exactly how the Rehab Score is built so you can audit it.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container max-w-4xl space-y-10">
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
            <div className="flex items-start gap-3">
              <Scale className="h-6 w-6 text-accent mt-0.5 shrink-0" />
              <div>
                <h2 className="mt-0 mb-2 text-lg font-bold text-foreground">
                  Independent of Advertising
                </h2>
                <p className="mb-0 text-sm text-muted-foreground">
                  Pro membership and Featured placement increase visibility in dedicated
                  carousels, but they do{" "}
                  <strong className="text-foreground">not</strong> alter a facility's Rehab Score.
                  Our matching algorithm always returns the closest verified clinical fit first.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              How the score is built
            </h2>
            <p className="text-muted-foreground mb-6">
              Each verified facility receives a weighted score from 0–100. Weights are reviewed
              quarterly by our editorial and clinical advisors.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {SCORE_FACTORS.map(({ icon: Icon, label, weight, description }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{label}</h3>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {weight}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-0">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive mt-0.5 shrink-0" />
              <div>
                <h2 className="mt-0 mb-3 text-lg font-bold text-foreground">
                  What never affects the Rehab Score
                </h2>
                <ul className="space-y-2 text-sm text-muted-foreground mb-0">
                  {NEVER_FACTORS.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-destructive mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">
              Verification before listing
            </h2>
            <p className="text-muted-foreground mb-4">
              We do not display unclaimed or third-party scraped listings. Every facility on
              RehabLookup is claimed by an authorized representative, verified against state
              licensure databases, and reviewed before publication.
            </p>
            <ul className="space-y-2">
              {[
                "State license number cross-checked against the licensing board of record",
                "Tax ID and ownership verified during onboarding",
                "Photos, staff bios, and clinical claims reviewed by our editorial team",
                "Re-verification at least every 12 months",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-foreground/80">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> See it in action
            </h2>
            <p className="text-muted-foreground mb-4">
              Open any facility profile to see its verification badges, levels of care, and
              accreditations alongside the score that drives ranking.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/locations"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Browse verified centers
              </Link>
              <Link
                to="/editorial-policy"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Read our Editorial Policy
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default RehabScore;
