import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShieldCheck,
  PhoneOff,
  BadgeDollarSign,
  Check,
  Minus,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Building2,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────
// Pricing — monthly is the default headline. Annual is offered as a
// 15%-discount upsell. Both intervals share the same feature set; only
// the billed cadence differs.
// ──────────────────────────────────────────────────────────────────────

type BillingInterval = "monthly" | "annual";

interface Tier {
  id: "free" | "pro";
  name: string;
  monthly: number;          // monthly billed amount in USD
  annual: number;           // annual billed amount in USD (monthly × 12 × 0.85)
  monthlyEquivOfAnnual: number; // annual ÷ 12 — used as "($X/mo equivalent)" subline
  blurb: string;
}

// Two LISTING PLANS: Free and Pro. Featured is a separate ADVERTISING product
// — not a plan tier, and NOT an add-on to Pro: it is purchasable on Free
// (backend gate removed in migration 20260902000000; see
// supabase/functions/create-checkout-session). The retired Concierge product was
// removed from this page in the directory cutover — it is not sold.
// Annual: Pro = 99 × 12 × 0.85 = 1,009.80 (15% off).
const TIERS: Tier[] = [
  { id: "free", name: "Free", monthly: 0,  annual: 0,       monthlyEquivOfAnnual: 0,     blurb: "Basic claim" },
  { id: "pro",  name: "Pro",  monthly: 99, annual: 1009.80, monthlyEquivOfAnnual: 84.15, blurb: "Enhanced profile, direct contact, performance reporting" },
];

interface AddOn {
  id: "featured";
  name: string;
  monthly: number;
  annual: number;
  blurb: string;
  /** No plan prerequisite — Featured is purchasable on Free or Pro. */
  requires: null;
}

const ADD_ONS: AddOn[] = [
  {
    id: "featured",
    name: "Featured",
    monthly: 599,
    annual: 6108.60,
    // No ranking claim and no traffic multiplier: Featured buys a clearly
    // labeled sponsored slot, and it does not change organic position.
    blurb:
      "A clearly labeled sponsored slot on the state, city, near-me, treatment-type and insurance pages for your area. Billed per location.",
    requires: null,
  },
];

const fmtMoney = (n: number) =>
  n === 0 ? "$0" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMoneyWhole = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

// ──────────────────────────────────────────────────────────────────────
// Hero
// ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      className="relative overflow-hidden border-b border-white/5 text-white"
      style={{ background: "linear-gradient(135deg, #1B365D 0%, #0E1F3A 100%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(205,162,35,0.12),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(205,162,35,0.06),_transparent_50%)]" />

      <div className="container relative z-10 px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="mx-auto max-w-3xl text-center">
          {/* Eyebrow — same tracking + gold accent as the rest of the
              provider surface. */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#CDA223]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#CDA223] ring-1 ring-[#CDA223]/30">
            <Building2 className="h-3 w-3" />
            For Treatment Providers
          </span>

          {/* H1 — measured outcome-led directory language. Healthgrades/
              Yelp Biz register: "Acquire more patients" / "Reach more
              customers" — restrained, not ad-LP. */}
          <h1 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.05]">
            Reach more families.{" "}
            <span className="text-[#CDA223]">Grow admissions.</span>
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-base md:text-lg text-white/85 leading-relaxed">
            List your accredited treatment center on the largest verified rehab directory in the U.S. Get in front of families who are actively searching for care.
          </p>

          {/* Trust-strip — outcome metrics under the subhead */}
          <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs md:text-sm text-white/75">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#CDA223]" />
              3,800+ verified facilities
            </span>
            <span className="text-white/25" aria-hidden>·</span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#CDA223]" />
              All 50 states
            </span>
            <span className="text-white/25" aria-hidden>·</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#CDA223]" />
              EKRA-compliant
            </span>
          </div>

          {/* Primary + secondary CTA */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              asChild
              className="bg-[#CDA223] text-[#1B365D] hover:bg-[#B38C1C] font-bold shadow-xl shadow-black/30 transition-all hover:scale-[1.02] gap-2 w-full sm:w-auto"
            >
              <Link to="/provider/onboarding">
                Claim or list my facility — free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <a
              href="#pricing"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/85 hover:text-white transition-colors px-3 py-2"
            >
              See pricing
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Risk reversal — single line under the CTA. */}
          <p className="mt-3 text-xs text-white/65">
            Free claim · Pro from <span className="font-semibold text-white">$99/mo</span> · Cancel anytime · No referral fees · No call routing
          </p>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Why we're different
// ──────────────────────────────────────────────────────────────────────

function WhyDifferentSection() {
  const cards = [
    {
      Icon: PhoneOff,
      title: "Calls go straight to you",
      body:
        "Families dial your number on the listing — no call routing, no qualifying call center, no intermediation. You pay for visibility, not for connections.",
      pill: "Zero call interception",
    },
    {
      Icon: BadgeDollarSign,
      title: "Flat fees. No surprises.",
      body:
        "Transparent monthly or annual pricing — no pay-per-click, no pay-per-lead, no pay-per-admission. Cancel anytime. EKRA-compliant by design.",
      pill: "From $99/month",
    },
    {
      Icon: ShieldCheck,
      title: "Operator-neutral directory",
      body:
        "We don't own or operate treatment centers — so your facility competes on its own merits, not against a parent-company portfolio that ranks itself first.",
      pill: "No conflicts of interest",
    },
    {
      Icon: TrendingUp,
      title: "Built for admissions teams",
      body:
        "Real-time inquiry routing, lead-source attribution, response-time metrics, and a roster of high-intent families — not curiosity clicks from generic ad networks.",
      pill: "Pro dashboard included",
    },
  ];

  return (
    <section className="py-14 md:py-20 bg-background">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1B365D]/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1B365D] ring-1 ring-[#1B365D]/15">
            Why RehabLookup
          </span>
          <h2 className="mt-3 font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#1B365D]">
            Built for treatment centers, not lead brokers
          </h2>
          <p className="mt-3 text-base text-slate-600 max-w-2xl mx-auto">
            A clean directory model — transparent pricing, direct contact, operator-neutral rankings. Here's what makes RehabLookup different.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ Icon, title, body, pill }) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-[#CDA223]/40 hover:-translate-y-0.5"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#1B365D]/8 ring-1 ring-[#1B365D]/10 transition-colors group-hover:bg-[#CDA223]/15 group-hover:ring-[#CDA223]/30">
                <Icon className="h-5 w-5 text-[#1B365D] transition-colors group-hover:text-[#B38C1C]" aria-hidden />
              </div>
              <h3 className="mt-4 font-bold text-base text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#1B365D]/5 px-2 py-0.5 text-[11px] font-semibold text-[#1B365D]">
                <CheckCircle className="h-3 w-3 text-[#CDA223]" />
                {pill}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Billing toggle — monthly is the default. Annual is the upsell.
// Purely visual: no checkout happens from this table.
// ──────────────────────────────────────────────────────────────────────

function BillingToggle({
  value,
  onChange,
}: {
  value: BillingInterval;
  onChange: (v: BillingInterval) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing interval"
      className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "monthly"}
        onClick={() => onChange("monthly")}
        className={cn(
          "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          value === "monthly"
            ? "bg-[#1B365D] text-white"
            : "text-slate-700 hover:text-[#1B365D]",
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "annual"}
        onClick={() => onChange("annual")}
        className={cn(
          "rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5",
          value === "annual"
            ? "bg-[#1B365D] text-white"
            : "text-slate-700 hover:text-[#1B365D]",
        )}
      >
        Annual
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            value === "annual"
              ? "bg-[#CDA223] text-[#1B365D]"
              : "bg-emerald-100 text-emerald-700",
          )}
        >
          Save 15%
        </span>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Plan comparison — desktop table, mobile accordion of tier cards
// ──────────────────────────────────────────────────────────────────────

type CellValue = boolean | string | number;

interface Row {
  label: string;
  values: [CellValue, CellValue]; // [free, pro]
}

const COMPARISON_ROWS: Row[] = [
  { label: "Listing visible in directory",        values: [true, true] },
  { label: "Facility listings",                   values: ["1 listing", "Up to 5"] },
  // "Verified badge" was here as a Pro feature. Verification is earned through
  // our review of licensing, accreditation and SAMHSA records — it is never sold,
  // so it cannot appear in a plan comparison at all.
  { label: "Edit description, treatments, hours", values: [true, true] },
  { label: "Upload logo",                         values: [true, true] },
  { label: "Photo gallery",                       values: ["5 photos", "10 photos"] },
  { label: "Video upload",                        values: [false, "1 video"] },
  { label: "Programs, amenities, staff on profile", values: [false, true] },
  { label: "Contact info visible publicly",       values: ["From SAMHSA", "Direct line"] },
  // Inquiries are NOT gated: every eligible facility receives them on any plan,
  // pinned to the facility the family selected. The old Free value ("Routed to
  // concierge") described a retired workflow that never applied.
  { label: "Inquiries from your listing",         values: [true, true] },
  { label: "Respond to reviews",                  values: [false, true] },
  { label: "Performance reporting",               values: ["Headline figures", "Full reporting"] },
  // "Priority placement on city + state" was here as a Pro feature. Organic
  // position is computed from listing signals only and is never for sale.
  { label: "Dedicated support",                   values: [false, true] },
];

function CellMark({ value }: { value: CellValue }) {
  if (value === true) {
    return <Check className="h-5 w-5 text-emerald-600 mx-auto" aria-label="Yes" />;
  }
  if (value === false) {
    return <Minus className="h-5 w-5 text-slate-300 mx-auto" aria-label="Not included" />;
  }
  return <span className="text-sm text-slate-700">{value}</span>;
}

function PriceCell({ tier, interval }: { tier: Tier; interval: BillingInterval }) {
  if (tier.monthly === 0) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-base font-bold text-[#1B365D]">$0</span>
        <span className="text-[11px] text-slate-500 mt-0.5">forever</span>
      </div>
    );
  }
  if (interval === "monthly") {
    return (
      <div className="flex flex-col items-center">
        <span className="text-base font-bold text-[#1B365D]">
          {fmtMoneyWhole(tier.monthly)}<span className="text-xs font-normal text-slate-500">/mo</span>
        </span>
        <span className="text-[11px] text-slate-500 mt-0.5">billed monthly</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-bold text-[#1B365D]">
        {fmtMoney(tier.annual)}<span className="text-xs font-normal text-slate-500">/yr</span>
      </span>
      <span className="text-[11px] text-emerald-700 mt-0.5">
        {fmtMoney(tier.monthlyEquivOfAnnual)}/mo equivalent
      </span>
    </div>
  );
}

function PlanComparisonSection() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  return (
    <section id="pricing" className="py-14 md:py-20 bg-slate-50/60 border-y border-slate-200/70 scroll-mt-20">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#CDA223]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#CDA223] ring-1 ring-[#CDA223]/30 mb-3">
            Transparent Pricing
          </span>
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#1B365D]">
            Simple pricing. Monthly or annual.
          </h2>
          <p className="mt-3 text-base md:text-lg text-slate-600">
            Every price visible. No "contact sales." Pick monthly for flexibility
            or annual to save 15%.
          </p>
          <div className="mt-6 flex justify-center">
            <BillingToggle value={interval} onChange={setInterval} />
          </div>
        </div>

        {/* Desktop / tablet table */}
        <div className="mt-10 hidden md:block">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th scope="col" className="px-5 py-4 text-sm font-semibold text-slate-700 w-[34%]">
                    Plan
                  </th>
                  {TIERS.map((t) => (
                    <th
                      key={t.id}
                      scope="col"
                      className={cn(
                        "px-4 py-4 text-center text-sm font-semibold text-slate-700",
                        t.id === "pro" && "bg-[#1B365D]/[0.04]",
                      )}
                    >
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Price row sits at the top so the toggle's effect is immediately visible. */}
                <tr className="bg-slate-50/60">
                  <th scope="row" className="px-5 py-5 text-sm font-semibold text-slate-800 align-top">
                    Price
                  </th>
                  {TIERS.map((t) => (
                    <td
                      key={t.id}
                      className={cn(
                        "px-4 py-5 text-center align-top",
                        t.id === "pro" && "bg-[#1B365D]/[0.06]",
                      )}
                    >
                      <PriceCell tier={t} interval={interval} />
                    </td>
                  ))}
                </tr>

                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="text-sm">
                    <th scope="row" className="px-5 py-3 font-medium text-slate-800 align-top">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td
                        key={i}
                        className={cn(
                          "px-4 py-3 text-center align-top",
                          TIERS[i].id === "pro" && "bg-[#1B365D]/[0.04]",
                        )}
                      >
                        <CellMark value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-600 italic">
            Featured advertising is a separate product, available on either plan — see below.
          </p>
        </div>

        {/* Mobile — accordion of per-tier cards */}
        <div className="mt-10 md:hidden">
          <Accordion type="single" collapsible defaultValue="pro" className="space-y-3">
            {TIERS.map((t) => (
              <AccordionItem
                key={t.id}
                value={t.id}
                className={cn(
                  "rounded-2xl border border-slate-200 bg-white px-4 shadow-sm",
                  t.id === "pro" && "ring-1 ring-[#1B365D]/20",
                )}
              >
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-3 pr-2">
                    <div className="text-left">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.blurb}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {t.monthly === 0 ? (
                        <p className="font-bold text-[#1B365D]">$0</p>
                      ) : interval === "monthly" ? (
                        <>
                          <p className="font-bold text-[#1B365D]">
                            {fmtMoneyWhole(t.monthly)}
                            <span className="text-xs font-normal text-slate-500">/mo</span>
                          </p>
                          <p className="text-[11px] text-slate-500">billed monthly</p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-[#1B365D]">
                            {fmtMoney(t.annual)}
                            <span className="text-xs font-normal text-slate-500">/yr</span>
                          </p>
                          <p className="text-[11px] text-emerald-700">save 15%</p>
                        </>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pb-3">
                    {COMPARISON_ROWS.map((row) => {
                      const tierIdx = TIERS.findIndex((tt) => tt.id === t.id);
                      const v = row.values[tierIdx];
                      if (v === false) return null;
                      return (
                        <li key={row.label} className="flex items-start gap-2 text-sm text-slate-700">
                          <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                          <span>
                            <span className="font-medium">{row.label}</span>
                            {typeof v === "string" && <span className="text-slate-500"> — {v}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-4 text-xs text-slate-600 italic">
            Featured advertising is a separate product, available on either plan — see below.
          </p>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Featured advertising — a separate PRODUCT, not a plan and not a Pro add-on
// ──────────────────────────────────────────────────────────────────────

function AddOnsSection() {
  return (
    <section id="addons" className="py-14 md:py-20 bg-background">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full bg-[#1B365D]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1B365D]">
            Advertising
          </span>
          <h2 className="mt-4 font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#1B365D]">
            Featured: clearly labeled sponsored placement
          </h2>
          <p className="mt-3 text-base md:text-lg text-slate-600">
            Featured isn't a plan and it isn't part of Pro — it's advertising you can
            buy on either plan, billed per location. It does not change your organic
            directory position. Slot availability varies by state.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {ADD_ONS.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-[#1B365D]" aria-hidden />
                <h3 className="font-semibold text-lg text-slate-900">{a.name}</h3>
                <span className="ml-auto text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                  Requires Pro
                </span>
              </div>
              <p className="text-[15px] leading-relaxed text-slate-600 mb-4">{a.blurb}</p>
              <div className="mt-auto pt-3 border-t border-slate-100 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#1B365D]">{fmtMoneyWhole(a.monthly)}</span>
                <span className="text-sm text-slate-500">/month</span>
                <span className="ml-auto text-xs text-slate-500">
                  or {fmtMoney(a.annual)}/yr
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Featured is managed from your provider dashboard and can be cancelled
          independently of your listing plan. Slots are EKRA-clean flat-fee
          rotational placements — never per-call, per-lead, or per-admission.
        </p>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// How Featured rotation works
// ──────────────────────────────────────────────────────────────────────

const SCARCITY_SAMPLES: Array<{ state: string; available: number; total: number }> = [
  { state: "California", available: 12, total: 30 },
  { state: "Florida",    available: 7,  total: 30 },
  { state: "Texas",      available: 21, total: 30 },
  { state: "New York",   available: 9,  total: 30 },
  { state: "Pennsylvania", available: 18, total: 30 },
  { state: "Ohio",       available: 24, total: 30 },
];

function FeaturedRotationSection() {
  return (
    <section className="py-14 md:py-20 bg-background">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#1B365D] text-center">
            Fair rotation. Real scarcity. No bidding wars.
          </h2>

          <div className="mt-6 space-y-4 text-[15px] md:text-base leading-relaxed text-slate-700">
            <p>
              Featured slots are capped per geography — <strong>30 slots per state, 15 per major
              metro, 8 per smaller city, 25 per treatment-type page, 5 per insurance carrier
              page</strong>. When you buy Featured, you rotate through visible positions on
              every page load, with every subscriber getting equal share of impressions over
              time.
            </p>
            <p>
              We never charge by impression, never weight rotation by referral value or
              conversion, never allow bidding for top placement. It's a fair queue — first to
              buy gets a slot, until that geo fills, then we open a waitlist. When demand
              exceeds capacity in any geo, we'll publicly announce it and stop selling there.
            </p>
            <p>
              Your dashboard shows your live impression share, click-through rate, and call
              volume per slot — so you can decide which placements are worth keeping.
            </p>
          </div>

          {/* Scarcity widget */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-slate-900">State-page slot availability</h3>
              <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                Sample
              </span>
            </div>
            <ul className="space-y-3">
              {SCARCITY_SAMPLES.map(({ state, available, total }) => {
                const pctTaken = ((total - available) / total) * 100;
                const low = available <= 8;
                return (
                  <li key={state}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-800">{state}</span>
                      <span className={cn("text-xs font-medium", low ? "text-amber-700" : "text-slate-600")}>
                        {available} of {total} available
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", low ? "bg-amber-500" : "bg-[#1B365D]")}
                        style={{ width: `${pctTaken}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs italic text-slate-500">
              Live availability launches with the upgrade flow.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Cancellation policy — covers both monthly and annual cadence
// ──────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────
// Mid-page CTA strip — reinforces conversion after the value/pricing/
// addons sections. Navy block with gold accent.
// ──────────────────────────────────────────────────────────────────────

function MidPageCtaStrip() {
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{ background: "linear-gradient(135deg, #1B365D 0%, #0E1F3A 100%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(205,162,35,0.15),_transparent_55%)]" />
      <div className="container relative z-10 px-4 md:px-6 lg:px-8 py-10 md:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <h3 className="font-display text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
            Ready to grow your admissions?{" "}
            <span className="text-[#CDA223]">List your facility today.</span>
          </h3>
          <p className="mt-2 text-sm md:text-base text-white/80 max-w-2xl mx-auto">
            Flat monthly fee. Direct calls. No referral cuts. Cancel any time.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              asChild
              className="bg-[#CDA223] text-[#1B365D] hover:bg-[#B38C1C] font-bold shadow-xl shadow-black/30 gap-2 w-full sm:w-auto"
            >
              <Link to="/provider/onboarding">
                Claim or list — free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <a
              href="#pricing"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/85 hover:text-white transition-colors px-3 py-2"
            >
              View plans
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function CancellationSection() {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-[#1B365D]">
            Cancel anytime. Flexible by design.
          </h2>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-slate-700">
            <p>
              Pick monthly or annual at checkout. Switch later if you change your mind.
            </p>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="font-semibold text-slate-900 mb-1">Monthly</p>
              <p className="text-sm">
                Cancel any time. You keep access through the end of the month you've
                paid for. No refund needed; you got the month you paid for.
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="font-semibold text-slate-900 mb-1">Annual</p>
              <p className="text-sm">
                Cancel any time. We refund the months you didn't use, calculated at the{" "}
                <strong>full monthly rate</strong> (not the discounted annual rate). This
                means the 15% discount applies to facilities that complete the full year.
              </p>
              <div className="mt-3 rounded border border-slate-200 bg-white p-3 text-sm">
                <p className="font-semibold text-slate-900 mb-1">Example</p>
                <p>
                  Pro annual at $1,009.80. Cancel after 4 months. We charge $99 × 4 =
                  $396 for time used. Refund = <strong>$613.80</strong>.
                </p>
              </div>
            </div>

            <p>
              The 15% discount is a "commit to the year, save money" deal. If you're not
              ready to commit, monthly is the better fit — same features, just slightly
              higher per-month cost.
            </p>
          </div>
          <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
            EKRA-compliant by design. No per-call, per-lead, or per-admission fees on any
            product on this page.{" "}
            <Link
              to="/how-we-make-money"
              className="font-medium text-[#1B365D] underline underline-offset-2"
            >
              How we make money →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// FAQ
// ──────────────────────────────────────────────────────────────────────

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Monthly or annual?",
    a: "Monthly if you want flexibility — same features, cancel anytime, pay for what you use. Annual if you're committing to RehabLookup for the year and want 15% off. You can always upgrade from monthly to annual later (we'll apply the discount on your next renewal).",
  },
  {
    q: "Can I switch from monthly to annual mid-cycle?",
    a: "Yes. Go to /provider/billing and click 'Switch to annual.' We prorate the remaining days of your current monthly period against the annual amount. You start the year fresh from the switch date.",
  },
  {
    q: "Can I switch from annual to monthly?",
    a: "Not mid-year. You stay on annual through the period you paid for. At renewal, you can choose monthly — the renewal reminder gives you the option to switch.",
  },
  {
    q: "What if I just want to try Pro for a month?",
    a: "Pick monthly. Same features. Cancel anytime. The annual discount is for facilities that already know they want Pro for the year.",
  },
  {
    q: "Why annual at all then?",
    a: "Two reasons. (1) 15% cheaper if you stay the full year. (2) Locks in your current rate even if we raise prices later.",
  },
  {
    q: "Is RehabLookup EKRA-compliant?",
    a: "Yes by design. All fees are flat subscriptions — Pro for listing features, Featured for clearly labeled ad inventory — never per-call, per-lead, or per-admission. Inquiries go directly to the facility the family selected and are never sold or brokered. None of this is legal advice; facilities should confirm with their own counsel before subscribing.",
  },
  {
    q: "Do we need LegitScript certification?",
    a: "Recommended for paid SUD listings, not required to register. Facilities holding current LegitScript certification get a verified-LegitScript badge on their listing. Featured advertising will require LegitScript certification once we publicly launch it.",
  },
  {
    q: "How do you decide who gets a Featured slot when a state is at cap?",
    a: "First to purchase. When at cap, you're added to a public waitlist. We open additional slots in 5-slot increments only when sustained demand and quality justify it. There is no bidding — every Featured subscriber pays the same flat fee.",
  },
  {
    q: "Do you compete with us by listing competitors?",
    a: "Yes — every licensed facility is in the directory whether they pay or not. We don't pick winners, and organic position is never for sale. We sell clearly labeled ad placement (Featured) and listing features (Pro); neither changes where a facility ranks organically.",
  },
  {
    q: "What happens to inquiries on a Free listing?",
    a: "They come straight to you. An inquiry stays pinned to the one facility the family selected — it is never reassigned, resold, or shared with competitors — and it arrives with full contact details at no cost. Inquiries are not a paid feature on any plan. Free is genuinely viable.",
  },
  {
    q: "How do I see ROI?",
    a: "Your provider dashboard shows search appearances, profile views, click-to-call, website clicks, and inquiries. While Featured is active you also get per-placement reporting and live rotation share, so you can drop the placements that don't earn their cost at next renewal.",
  },
  {
    q: "Who owns RehabLookup?",
    a: "Operator-neutral. We don't run treatment centers and don't intend to — no private-equity roll-up, no parent that operates rehabs. The team is small, US-based, and accountable to the directory's accuracy. Your facility competes on its own merits, never against a parent-company portfolio that ranks itself first.",
  },
];

function FaqSection() {
  return (
    <section className="py-14 md:py-20 bg-slate-50/60 border-y border-slate-200/70">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#1B365D] text-center">
            Questions
          </h2>
          <Accordion type="single" collapsible className="mt-8 space-y-2">
            {FAQ.map((item) => (
              <AccordionItem
                key={item.q}
                value={item.q}
                className="rounded-xl border border-slate-200 bg-white px-4 shadow-sm"
              >
                <AccordionTrigger className="text-left text-base md:text-lg font-semibold text-slate-900 hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-slate-700 pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────

export default function ForProviders() {
  return (
    <Layout>
      <SEO
        title="List Your Facility | For Treatment Providers — RehabLookup"
        description="Reach more families. Grow admissions. List your accredited treatment center on the largest verified rehab directory in the U.S. Pro from $99/mo. Cancel anytime. EKRA-compliant by design."
        canonical="/for-providers"
      />
      <HeroSection />
      <WhyDifferentSection />
      <PlanComparisonSection />
      <AddOnsSection />
      <FeaturedRotationSection />
      <MidPageCtaStrip />
      <CancellationSection />
      <FaqSection />
    </Layout>
  );
}
