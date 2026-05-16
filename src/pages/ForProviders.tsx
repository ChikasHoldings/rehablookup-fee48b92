import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONCIERGE_PHONE_DISPLAY, CONCIERGE_PHONE_TEL } from "@/lib/contactInfo";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ──────────────────────────────────────────────────────────────────────
// Pricing data — single source of truth for the page. Annual figures
// are computed: monthly × 12 × 0.85 (15% annual discount).
// ──────────────────────────────────────────────────────────────────────

interface Tier {
  id: "free" | "pro" | "pro_featured" | "pro_concierge";
  name: string;
  monthly: number;          // monthly equivalent in USD
  annual: number;           // annual billed amount (monthly × 12 × 0.85)
  blurb: string;
}

const TIERS: Tier[] = [
  { id: "free",           name: "Free",                   monthly: 0,    annual: 0,         blurb: "Basic claim" },
  { id: "pro",            name: "Pro",                    monthly: 99,   annual: 1009.80,   blurb: "Verified, direct contact" },
  { id: "pro_featured",   name: "Pro + Featured",         monthly: 698,  annual: 7118.40,   blurb: "Pro + rotation placements" },
  { id: "pro_concierge",  name: "Pro + Concierge",        monthly: 1099, annual: 11209.80,  blurb: "Pro + advisor surfacing" },
];

const ALL_BUNDLE_MONTHLY = 99 + 599 + 1000;          // $1,698
const ALL_BUNDLE_ANNUAL = ALL_BUNDLE_MONTHLY * 12 * 0.85; // $17,319.60

const fmtMoney = (n: number) =>
  n === 0 ? "$0" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMoneyWhole = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

// ──────────────────────────────────────────────────────────────────────
// Hero
// ──────────────────────────────────────────────────────────────────────

function HeroSection({ scrollToForm }: { scrollToForm: () => void }) {
  return (
    <section
      className="relative overflow-hidden py-14 md:py-20 lg:py-24 text-white"
      style={{ background: "linear-gradient(135deg, #1B365D 0%, #0E1F3A 100%)" }}
    >
      <div className="container relative px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#CDA223]">
            For treatment providers
          </span>

          <h1 className="mt-5 font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            List your facility on the independent rehab directory.
          </h1>

          <p className="mx-auto mt-4 md:mt-5 max-w-2xl text-base md:text-lg text-white/85 leading-relaxed">
            No referral fees. No per-call charges. No lead routing through our number.
            Just transparent ad inventory facilities have wanted for 20 years.
          </p>

          <div className="mt-7">
            <Button
              size="lg"
              onClick={scrollToForm}
              className="bg-[#CDA223] text-[#1B365D] hover:bg-[#B38C1C] font-semibold shadow-lg hover:shadow-xl transition-all gap-2"
            >
              Request access — limited launch spots
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/80">
            <li className="font-medium">3,800+ facilities listed</li>
            <li aria-hidden className="text-white/30">•</li>
            <li className="font-medium">50 states</li>
            <li aria-hidden className="text-white/30">•</li>
            <li className="font-medium">Independent ownership</li>
            <li aria-hidden className="text-white/30">•</li>
            <li className="font-medium">EKRA-compliant by design</li>
          </ul>
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
      Icon: ShieldCheck,
      title: "We don't own treatment centers",
      body:
        "RehabLookup is independent. We don't run rehabs and never will. Your competitors don't own this directory. Your seekers know who's behind the listings.",
    },
    {
      Icon: PhoneOff,
      title: "We never touch your call",
      body:
        "When a seeker dials your number on RehabLookup, they reach you. No call routing, no qualifying call center, no intermediation. You pay for placement, not for connections.",
    },
    {
      Icon: BadgeDollarSign,
      title: "Flat fees, no surprises",
      body:
        "Annual subscriptions. Transparent prices on this page. No pay-per-click, no pay-per-lead, no pay-per-admission. EKRA-compliant by design — built for the post-2018 industry.",
    },
  ];

  return (
    <section className="py-14 md:py-20 bg-background">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#1B365D]">
            Why we're different
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {cards.map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#1B365D]/10">
                <Icon className="h-5 w-5 text-[#1B365D]" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold text-lg text-slate-900">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Plan comparison — desktop table, mobile accordion of tier cards
// ──────────────────────────────────────────────────────────────────────

type CellValue = boolean | string | number;

interface Row {
  label: string;
  values: [CellValue, CellValue, CellValue, CellValue]; // [free, pro, pro+featured, pro+concierge]
}

const COMPARISON_ROWS: Row[] = [
  { label: "Listing visible in directory",                   values: [true, true, true, true] },
  { label: "Verified badge",                                 values: [false, true, true, true] },
  { label: "Edit description, treatments, hours",            values: [true, true, true, true] },
  { label: "Upload logo",                                    values: [true, true, true, true] },
  { label: "Photo gallery",                                  values: ["5 photos", "10 photos", "10 photos", "10 photos"] },
  { label: "Video upload",                                   values: [false, true, true, true] },
  { label: "Contact info visible publicly",                  values: ["From SAMHSA", "Direct line", "Direct line", "Direct line"] },
  { label: "Inquiries from your listing",                    values: ["Routed to concierge", "Direct to your inbox", "Direct to your inbox", "Direct to your inbox"] },
  { label: "Respond to reviews",                             values: [false, true, true, true] },
  { label: "Featured rotation placements",                   values: [false, false, true, false] },
  { label: "Concierge Partner surfacing",                    values: [false, false, false, true] },
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

function PlanComparisonSection() {
  return (
    <section className="py-14 md:py-20 bg-slate-50/60 border-y border-slate-200/70">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#1B365D]">
            Pricing — annual only, save 15%
          </h2>
          <p className="mt-3 text-base md:text-lg text-slate-600">
            Every price visible. No "contact sales." Add Featured and Concierge to Pro
            independently or together.
          </p>
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
                        t.id === "pro_featured" && "bg-[#1B365D]/[0.04]",
                      )}
                    >
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                          TIERS[i].id === "pro_featured" && "bg-[#1B365D]/[0.04]",
                        )}
                      >
                        <CellMark value={v} />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Pricing rows */}
                <tr className="bg-slate-50/60">
                  <th scope="row" className="px-5 py-4 text-sm font-semibold text-slate-800">
                    Monthly equivalent
                  </th>
                  {TIERS.map((t) => (
                    <td key={t.id} className={cn("px-4 py-4 text-center text-sm font-semibold text-slate-900", t.id === "pro_featured" && "bg-[#1B365D]/[0.06]")}>
                      {fmtMoneyWhole(t.monthly)}
                      {t.monthly > 0 && <span className="text-xs font-normal text-slate-500">/mo</span>}
                    </td>
                  ))}
                </tr>
                <tr className="bg-slate-50/60">
                  <th scope="row" className="px-5 py-4 text-sm font-semibold text-slate-800">
                    Billed annually <span className="text-xs font-normal text-slate-500">(save 15%)</span>
                  </th>
                  {TIERS.map((t) => (
                    <td key={t.id} className={cn("px-4 py-4 text-center align-top", t.id === "pro_featured" && "bg-[#1B365D]/[0.06]")}>
                      {t.annual === 0 ? (
                        <span className="text-sm text-slate-500">—</span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-[#1B365D]">{fmtMoney(t.annual)}</span>
                          <span className="text-[11px] text-emerald-700 mt-0.5">save 15%</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-sm text-slate-600 italic">
            Both Featured and Concierge can be added to Pro together — $99 + $599 + $1,000 ={" "}
            {fmtMoneyWhole(ALL_BUNDLE_MONTHLY)}/mo equivalent, {fmtMoney(ALL_BUNDLE_ANNUAL)}/yr annual.
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
                  t.id === "pro_featured" && "ring-1 ring-[#1B365D]/20",
                )}
              >
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-3 pr-2">
                    <div className="text-left">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.blurb}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[#1B365D]">
                        {fmtMoneyWhole(t.monthly)}
                        {t.monthly > 0 && <span className="text-xs font-normal text-slate-500">/mo</span>}
                      </p>
                      {t.annual > 0 && (
                        <p className="text-[11px] text-slate-500">
                          {fmtMoney(t.annual)}/yr
                        </p>
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
            Add Featured and Concierge to Pro together for {fmtMoneyWhole(ALL_BUNDLE_MONTHLY)}/mo equivalent
            ({fmtMoney(ALL_BUNDLE_ANNUAL)}/yr).
          </p>
        </div>
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
// Concierge Partner — EKRA-defensive
// ──────────────────────────────────────────────────────────────────────

function ConciergePartnerSection() {
  return (
    <section className="py-14 md:py-20 bg-slate-50/60 border-y border-slate-200/70">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#1B365D] text-center">
            Prominent surfacing. Seekers still choose.
          </h2>

          <div className="mt-6 space-y-4 text-[15px] md:text-base leading-relaxed text-slate-700">
            <p>
              When a seeker calls our concierge, our advisors match them based on their
              insurance, level of care, geography, and clinical needs — never based on
              who's paid us.
            </p>
            <p>
              Among facilities that match a seeker's criteria, Concierge Partners get a visual
              badge in our advisors' tools so the advisor naturally mentions you:{" "}
              <em className="text-slate-900">"X is one of our Placement Partners, meaning
              they've been verified and have committed to 24-hour response times."</em> The
              advisor always presents <strong>at least two non-partner options alongside any
              partner facilities</strong>. The seeker always picks. The call goes directly to
              your admissions line — never through ours.
            </p>
            <p>
              This is the model we believe is the right answer post-EKRA: flat monthly
              subscription for prominent surfacing, never per-call or per-admission. We pay
              our advisors a salary, not a commission. We record every placement to
              demonstrate that non-partner alternatives were always presented.
            </p>
            <p>
              Concierge Partner is capped at <strong>3-5 facilities per major city</strong> to
              maintain placement quality. When a city fills, we open a waitlist.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Cancellation policy
// ──────────────────────────────────────────────────────────────────────

function CancellationSection() {
  return (
    <section className="py-12 md:py-16 bg-background">
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight text-[#1B365D]">
            Cancel anytime. Here's the math.
          </h2>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-slate-700">
            <p>
              All subscriptions are annual. If you cancel mid-year, we refund the months you
              didn't use — calculated at the <strong>full monthly rate</strong>{" "}
              ($99 / $599 / $1,000 respectively), not the discounted annual rate.
            </p>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm">
              <p className="font-semibold text-slate-900 mb-1">Example</p>
              <p>
                Pro at $1,009.80/yr. Cancel after 4 months. We charge you $99 × 4 = $396 for
                the time used. Refund = $1,009.80 − $396 = <strong>$613.80</strong>.
              </p>
            </div>
            <p>
              The 15% annual discount only applies to facilities that complete the full year.
              We think that's fair: locking in for a year is what lets us guarantee you'll
              never see surprise pricing changes.
            </p>
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
    q: "Why annual only? Why not monthly?",
    a: "Annual locks in revenue + reduces churn, lets us guarantee no surprise pricing changes for the year, and the 15% discount is real savings for facilities that plan their year. The cancellation math (above) means you're not penalized if your situation changes — you only pay full monthly for the months you actually use.",
  },
  {
    q: "Is RehabLookup EKRA-compliant?",
    a: "Yes by design. All fees are flat subscriptions for ad inventory — never per-call, per-lead, or per-admission. Concierge always presents non-partner alternatives alongside any partner facilities. Our advisors are paid a salary, not a commission. None of this is legal advice; facilities should confirm with their own counsel before subscribing.",
  },
  {
    q: "Do we need LegitScript certification?",
    a: "Recommended for paid SUD listings, not required to register at the Pro tier. Facilities holding current LegitScript certification get a verified-LegitScript badge on their listing. Featured and Concierge tiers will require LegitScript certification once we publicly launch those tiers.",
  },
  {
    q: "How do you decide who gets a Featured slot when a state is at cap?",
    a: "First to purchase. When at cap, you're added to a public waitlist. We open additional slots in 5-slot increments only when sustained demand and quality justify it. There is no bidding — every Featured subscriber pays the same flat fee.",
  },
  {
    q: "Why is Concierge Partner so much more than Featured?",
    a: "Concierge involves a human advisor's time, qualification work, and 24-hour response coordination. We cap at 3-5 per major city, so it's premium scarce inventory. Featured is impression-based and scales to higher slot counts per geo (up to 30 per state).",
  },
  {
    q: "Do you compete with us by listing competitors?",
    a: "Yes — every licensed facility is in the directory whether they pay or not. We don't pick winners. We sell ad placement (Featured) and prominent surfacing (Concierge Partner) to amplify visibility for facilities who choose to invest in it.",
  },
  {
    q: "What happens to inquiries on a Free listing?",
    a: "They route to our concierge, who presents your facility plus 2 matching alternatives to the seeker. You get a notification: \"A seeker submitted on your listing — upgrade to Pro to receive these directly.\" If you're already busy without paid placements, Free is genuinely viable.",
  },
  {
    q: "Can I upgrade or downgrade mid-year?",
    a: "Upgrade anytime — prorated charge for the remaining days of your annual term. Downgrade takes effect at the next renewal; no refund for the downgrade itself, since you've already paid for the full year.",
  },
  {
    q: "How do I see ROI?",
    a: "Provider dashboard shows: profile views, phone-button clicks per placement, inquiry submissions, response times, and live rotation share. You'll know which placements earn their cost — and you can drop the ones that don't at next renewal.",
  },
  {
    q: "Who owns RehabLookup?",
    a: "Independent ownership. We don't run treatment centers and don't intend to. No private-equity roll-up, no parent that operates rehabs. The team is small, US-based, and accountable to the directory's accuracy — not to a treatment-provider parent's quarterly numbers.",
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
// Interest form — captures provider interest into `provider_interest`
// via the `provider-interest-submit` edge function. No real upgrade /
// Stripe flow yet — that's a future PR.
// ──────────────────────────────────────────────────────────────────────

interface FormState {
  facilityName: string;
  contactName: string;
  contactTitle: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  admissionVolume: "" | "<10/mo" | "10-25/mo" | "25-50/mo" | "50-100/mo" | "100+/mo";
  tierInterest: "" | "pro" | "pro_featured" | "pro_concierge" | "all";
  pricingFrustration: string;
}

const INITIAL_FORM: FormState = {
  facilityName: "",
  contactName: "",
  contactTitle: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  admissionVolume: "",
  tierInterest: "",
  pricingFrustration: "",
};

const VOLUME_CHIPS: Array<{ value: FormState["admissionVolume"]; label: string }> = [
  { value: "<10/mo",     label: "<10/mo" },
  { value: "10-25/mo",   label: "10-25/mo" },
  { value: "25-50/mo",   label: "25-50/mo" },
  { value: "50-100/mo",  label: "50-100/mo" },
  { value: "100+/mo",    label: "100+/mo" },
];

const TIER_OPTIONS: Array<{ value: FormState["tierInterest"]; label: string }> = [
  { value: "pro",            label: "Pro ($99/mo, $1,009.80/yr)" },
  { value: "pro_featured",   label: "Pro + Featured ($698/mo, $7,118.40/yr)" },
  { value: "pro_concierge",  label: "Pro + Concierge ($1,099/mo, $11,209.80/yr)" },
  { value: "all",            label: "All three (Pro + Featured + Concierge)" },
];

interface InterestFormProps {
  formRef: React.RefObject<HTMLDivElement>;
}

function InterestForm({ formRef }: InterestFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.facilityName.trim()) next.facilityName = "Facility name is required";
    if (!form.contactName.trim()) next.contactName = "Your name is required";
    if (!form.contactTitle.trim()) next.contactTitle = "Your title is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email";
    if (!form.city.trim()) next.city = "City is required";
    if (!form.state.trim()) next.state = "State is required";
    if (!form.admissionVolume) next.admissionVolume = "Pick a volume range";
    if (!form.tierInterest) next.tierInterest = "Pick a tier";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("provider-interest-submit", {
        body: {
          facilityName: form.facilityName.trim(),
          contactName: form.contactName.trim(),
          contactTitle: form.contactTitle.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim(),
          admissionVolume: form.admissionVolume,
          tierInterest: form.tierInterest,
          pricingFrustration: form.pricingFrustration.trim() || undefined,
          landingPage: typeof window !== "undefined" ? window.location.pathname : undefined,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error("Submission failed");
      setSuccess(true);
    } catch (err) {
      console.error("[for-providers] interest submit failed", err);
      toast({
        title: "Couldn't submit",
        description:
          "Something went wrong on our end. Email us at sales@rehablookup.com or call " +
          CONCIERGE_PHONE_DISPLAY +
          " and we'll get you on the list manually.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputErrCls = "border-destructive ring-1 ring-destructive";

  return (
    <section
      ref={formRef}
      id="interest"
      className="py-14 md:py-20 bg-background scroll-mt-20"
    >
      <div className="container px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-10 shadow-sm">
            {success ? (
              <div className="text-center" role="status" aria-live="polite">
                <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-6 w-6 text-emerald-700" aria-hidden />
                </div>
                <h2 className="mt-4 font-display text-xl md:text-2xl font-bold tracking-tight text-[#1B365D]">
                  Thanks — you're on the list.
                </h2>
                <p className="mt-3 text-[15px] text-slate-600 leading-relaxed">
                  We'll be in touch within 48 hours. In the meantime, you can reach our
                  sales team at{" "}
                  <a
                    href={`tel:${CONCIERGE_PHONE_TEL}`}
                    className="font-medium text-[#1B365D] underline underline-offset-4"
                  >
                    {CONCIERGE_PHONE_DISPLAY}
                  </a>
                  .
                </p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1B365D]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1B365D]">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    25 design-partner spots
                  </span>
                  <h2 className="mt-4 font-display text-2xl md:text-3xl font-bold tracking-tight text-[#1B365D]">
                    Limited launch access. Tell us about your facility.
                  </h2>
                  <p className="mt-3 text-[15px] md:text-base text-slate-600 leading-relaxed">
                    We're onboarding 25 design-partner facilities for the launch. Tell us
                    about your current setup and we'll be in touch within 48 hours.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
                  <div>
                    <Label htmlFor="facilityName" className="text-sm font-medium">
                      Facility name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="facilityName"
                      value={form.facilityName}
                      onChange={(e) => update("facilityName", e.target.value)}
                      placeholder="e.g., Sunrise Recovery Center"
                      className={cn("h-11 mt-1.5", errors.facilityName && inputErrCls)}
                      maxLength={255}
                    />
                    {errors.facilityName && (
                      <p className="mt-1 text-xs text-destructive">{errors.facilityName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="contactName" className="text-sm font-medium">
                        Your name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="contactName"
                        value={form.contactName}
                        onChange={(e) => update("contactName", e.target.value)}
                        placeholder="First and last"
                        className={cn("h-11 mt-1.5", errors.contactName && inputErrCls)}
                        maxLength={255}
                      />
                      {errors.contactName && (
                        <p className="mt-1 text-xs text-destructive">{errors.contactName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="contactTitle" className="text-sm font-medium">
                        Your title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="contactTitle"
                        value={form.contactTitle}
                        onChange={(e) => update("contactTitle", e.target.value)}
                        placeholder="e.g., Director of Admissions"
                        className={cn("h-11 mt-1.5", errors.contactTitle && inputErrCls)}
                        maxLength={255}
                      />
                      {errors.contactTitle && (
                        <p className="mt-1 text-xs text-destructive">{errors.contactTitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="you@facility.org"
                        className={cn("h-11 mt-1.5", errors.email && inputErrCls)}
                        maxLength={255}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-destructive">{errors.email}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium">
                        Phone <span className="text-xs text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="(555) 555-5555"
                        className="h-11 mt-1.5"
                        maxLength={64}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Label htmlFor="city" className="text-sm font-medium">
                        City <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        placeholder="City"
                        className={cn("h-11 mt-1.5", errors.city && inputErrCls)}
                        maxLength={120}
                      />
                      {errors.city && (
                        <p className="mt-1 text-xs text-destructive">{errors.city}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-sm font-medium">
                        State <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="state"
                        value={form.state}
                        onChange={(e) => update("state", e.target.value)}
                        placeholder="CA"
                        className={cn("h-11 mt-1.5", errors.state && inputErrCls)}
                        maxLength={120}
                      />
                      {errors.state && (
                        <p className="mt-1 text-xs text-destructive">{errors.state}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium">
                      Approximate admission volume <span className="text-destructive">*</span>
                    </span>
                    <div role="radiogroup" aria-label="Admission volume" className="mt-2 flex flex-wrap gap-2">
                      {VOLUME_CHIPS.map((chip) => {
                        const active = form.admissionVolume === chip.value;
                        return (
                          <button
                            key={chip.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => update("admissionVolume", chip.value)}
                            className={cn(
                              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                              active
                                ? "border-[#1B365D] bg-[#1B365D] text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-[#1B365D]/40",
                            )}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                    {errors.admissionVolume && (
                      <p className="mt-1 text-xs text-destructive">{errors.admissionVolume}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="tierInterest" className="text-sm font-medium">
                      Which tier interests you most? <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.tierInterest}
                      onValueChange={(v) => update("tierInterest", v as FormState["tierInterest"])}
                    >
                      <SelectTrigger
                        id="tierInterest"
                        className={cn("h-11 mt-1.5", errors.tierInterest && inputErrCls)}
                      >
                        <SelectValue placeholder="Pick a tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value!}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.tierInterest && (
                      <p className="mt-1 text-xs text-destructive">{errors.tierInterest}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pricingFrustration" className="text-sm font-medium">
                      What's your biggest frustration with current rehab directory pricing?{" "}
                      <span className="text-xs text-muted-foreground">(optional, but the answer helps)</span>
                    </Label>
                    <Textarea
                      id="pricingFrustration"
                      value={form.pricingFrustration}
                      onChange={(e) => update("pricingFrustration", e.target.value.slice(0, 2000))}
                      placeholder="Pay-per-call rates? Surprise renewals? Lead routing? Tell us what would actually move the needle."
                      rows={4}
                      maxLength={2000}
                      className="mt-1.5 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="w-full bg-[#1B365D] hover:bg-[#142a4a] text-white font-semibold gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        Request access
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-slate-500">
                    Or call{" "}
                    <a href={`tel:${CONCIERGE_PHONE_TEL}`} className="font-medium text-[#1B365D] underline underline-offset-4">
                      {CONCIERGE_PHONE_DISPLAY}
                    </a>{" "}
                    and ask for sales.
                  </p>
                </form>
              </>
            )}
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have a claimed listing?{" "}
            <Link to="/provider/claims" className="font-medium text-[#1B365D] underline underline-offset-4">
              Sign in to your provider dashboard
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────

export default function ForProviders() {
  const formRef = useRef<HTMLDivElement>(null);
  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Layout>
      <SEO
        title="For Treatment Providers | RehabLookup"
        description="List your facility on the independent rehab directory. Annual subscriptions, transparent prices, EKRA-compliant by design. Pro $99/mo, Featured $599/mo, Concierge Partner $1,000/mo — all billed annually with 15% off."
        canonical="/for-providers"
      />
      <HeroSection scrollToForm={scrollToForm} />
      <WhyDifferentSection />
      <PlanComparisonSection />
      <FeaturedRotationSection />
      <ConciergePartnerSection />
      <CancellationSection />
      <FaqSection />
      <InterestForm formRef={formRef} />
    </Layout>
  );
}
