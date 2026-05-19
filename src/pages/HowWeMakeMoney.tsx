import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Phone,
  Building2,
  CheckCircle2,
  X as XIcon,
  Mail,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { TOPIC_HERO_IMAGES } from "@/data/locationImages";

// Build-time stamp so the "Last updated" footer line reflects the deploy.
// Vite inlines string literals at build time; `new Date()` here resolves
// when the bundler runs, not on every render.
const LAST_UPDATED_ISO = new Date().toISOString().slice(0, 10);

function SectionHeader({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="mt-12 md:mt-14 mb-5">
      <div className="h-[2px] w-10 bg-[#1B365D] mb-3" aria-hidden />
      <h2
        id={id}
        className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight scroll-mt-24"
      >
        {children}
      </h2>
    </div>
  );
}

function NoIcon() {
  return (
    <span className="mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-50">
      <XIcon className="h-3 w-3 text-red-700" aria-hidden />
    </span>
  );
}

function YesIcon() {
  return <CheckCircle2 className="mt-[2px] h-4 w-4 shrink-0 text-emerald-700" aria-hidden />;
}

export default function HowWeMakeMoney() {
  return (
    <Layout>
      <SEO
        title="How RehabLookup Makes Money — Trust & EKRA Transparency"
        description="Plain-English explanation of RehabLookup's monetization model. Flat-fee subscriptions only, no per-call or per-admission revenue. EKRA-compliant by design."
        canonical="/how-we-make-money"
        keywords={[
          "rehab directory transparency",
          "EKRA compliance",
          "18 USC 220",
          "rehab lead generation",
          "treatment directory business model",
          "RehabLookup transparency",
        ]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "How we make money", url: "/how-we-make-money" },
        ]}
      />

      {/* Hero — HOW WE MAKE MONEY. Trust/about palette (slate→amber),
          matches editorial / policy pages. */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/55">
        <img
          src={TOPIC_HERO_IMAGES.mission}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.10),_transparent_55%)]" />
        <div className="container relative z-10 py-6 md:py-8">
          <BreadcrumbNav
            className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white"
            items={[{ label: "How we make money" }]}
          />
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-100 ring-1 ring-amber-400/25">
              Trust & Transparency
            </div>
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              How RehabLookup makes money
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/80 max-w-xl">
              We're an independent rehab directory. We don't run treatment centers, take referral fees, or route your call. Here's exactly how we pay our bills.
            </p>
          </div>
        </div>
      </section>

      <main className="bg-white">
        <article className="mx-auto max-w-[720px] px-4 py-8 md:px-6 md:py-12 text-[16px] md:text-[17px] leading-[1.6] text-slate-800">

          {/* 4-tile compact trust strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-8" aria-label="Trust signals">
            {[
              { icon: Building2, label: "Independent ownership" },
              { icon: XIcon, label: "No referral fees" },
              { icon: Phone, label: "Calls go direct to the facility" },
              { icon: ShieldCheck, label: "EKRA-compliant by design" },
            ].map((t) => (
              <div
                key={t.label}
                className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5"
              >
                <t.icon className="h-4 w-4 text-[#1B365D] shrink-0 mt-[2px]" aria-hidden />
                <span className="text-[13px] md:text-sm font-medium text-slate-800 leading-snug">
                  {t.label}
                </span>
              </div>
            ))}
          </div>

          {/* Section 1 */}
          <SectionHeader id="who-we-are">Who we are, who we're not</SectionHeader>
          <p>
            RehabLookup is an independent directory of substance use treatment
            facilities in the United States. We're independently owned. We
            don't own any of the treatment centers listed on our site, and we
            don't intend to. We're not part of a treatment center group, a
            private equity roll-up, or a healthcare conglomerate.
          </p>
          <p className="mt-4">
            This matters because the rehab directory space has a history of
            conflict-of-interest problems. Several major directories —
            including Rehabs.com, Recovery.org, Alcohol.org, DrugAbuse.com,
            ProjectKnow, FentanylSupport, and Detox.net — were until August
            2025 owned by American Addiction Centers, a treatment provider
            that also operated facilities those directories funneled callers
            to. They've since been consolidated under Recovery.com, but the
            structural concern remains: a directory owned by anyone with a
            stake in a specific facility outcome has an incentive to route
            calls in their favor.
          </p>
          <p className="mt-4">
            We're a directory only. That's the whole business.
          </p>

          {/* Section 2 */}
          <SectionHeader id="how-facilities-pay">How facilities pay us</SectionHeader>
          <p>
            Facilities pay flat monthly or annual subscriptions for visibility.
            No fee is ever tied to a phone call, lead, or admission. Here's
            the complete list of products we sell to facilities:
          </p>

          <h3 className="mt-7 mb-2 text-base md:text-lg font-semibold text-slate-900">
            Pro Subscription — $99/mo or $1,009.80/yr
          </h3>
          <p>
            A facility's verified listing on our directory. Includes the
            verified badge, direct contact display, photo gallery, lead
            inbox, and review responses. This is the foundation that lets
            facilities present professionally to clients who land on our
            site.
          </p>

          <h3 className="mt-7 mb-2 text-base md:text-lg font-semibold text-slate-900">
            Featured Placements — $599/mo or $6,108.60/yr
          </h3>
          <p>
            An optional add-on. Facilities can buy phone-rotation slots on
            specific high-traffic pages: state directories, city pages,
            treatment-type pages, insurance pages, and qualifying articles.
            When a Featured facility's card displays, the Call button dials
            their direct phone number. We never intermediate the call. We
            don't charge per click, per impression, or per call.
          </p>

          <h3 className="mt-7 mb-2 text-base md:text-lg font-semibold text-slate-900">
            Concierge Partner — $1,000/mo or $10,200/yr
          </h3>
          <p>
            An optional add-on for facilities that want prominent surfacing
            when our concierge team matches families to options. Concierge
            Partners get a "Placement Partner" label in our advisors' match
            tool. Our advisors are required to present at least two
            non-partner alternatives alongside any Placement Partner. The
            family always picks. Calls go directly to whichever facility
            the family chooses. We never charge per match, per call, or per
            admission.
          </p>

          {/* Section 3 */}
          <SectionHeader id="ekra">EKRA — the law that shapes our model</SectionHeader>
          <p>
            EKRA — the Eliminate Kickbacks in Recovery Act of 2018, codified
            at{" "}
            <span className="font-medium text-slate-900">18 U.S.C. § 220</span>
            {" "}— prohibits paying or receiving any remuneration in return
            for referring a patient to a substance use disorder treatment
            facility where treatment is reimbursable by any healthcare benefit
            program. Violations are a federal felony. The Department of
            Justice has actively prosecuted EKRA cases since 2019.
          </p>
          <p className="mt-4">
            The rehab lead-generation industry was rebuilt around EKRA between
            2019 and 2022. Pay-per-call and pay-per-lead models — once the
            standard — became legal risk. Most directories now operate on a
            flat-fee subscription model for that reason.
          </p>

          <blockquote className="mt-6 mb-6 border-l-2 border-[#1B365D] pl-4 italic text-slate-700">
            We built RehabLookup's monetization specifically to be defensible
            under EKRA from day one.
          </blockquote>

          <ul className="mt-4 space-y-2.5">
            {[
              "Every fee we charge is a flat subscription. We charge for visibility and ad inventory, never for outcomes.",
              "Our concierge advisors are paid salary. No bonuses, no per-match commissions, no admission-tied compensation.",
              "Our advisors are required to present non-Placement-Partner alternatives alongside any partner facility. We log every match decision to make this auditable.",
              "Phone numbers shown on the site dial the facility's own admissions line. We don't route, qualify, or intermediate calls.",
              "Featured rotation is random (cookie-seeded per visitor), never weighted by referral value, call quality, or admission rate.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <YesIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-slate-600">
            We are not lawyers, and this page is not legal advice. Facilities
            considering listing on RehabLookup are encouraged to review their
            own compliance program with their attorneys.
          </p>

          {/* Section 4 */}
          <SectionHeader id="what-we-dont-do">What we don't do (and won't)</SectionHeader>
          <ul className="space-y-2.5">
            {[
              "We don't charge per call, per click, or per lead.",
              "We don't charge per admission or per placement.",
              "We don't take commissions on treatment fees.",
              "We don't route calls through our own number.",
              "We don't sell or share your contact information.",
              "We don't pay our advisors based on which facility a family chooses.",
              "We don't weight our directory rankings by who pays us. Rankings on directory pages reflect data completeness, response rate, and client reviews — not subscription tier (Pro facilities sort above Free, but Pro tier is a flat-fee subscription, not pay-for-ranking).",
              "We don't display ads from outside our directory. Every sponsored placement on our site is a Featured-subscriber facility.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <NoIcon />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* Section 5 */}
          <SectionHeader id="verify">How families can verify</SectionHeader>
          <p>
            If you're a client or family reading this and you want to verify any of
            the above:
          </p>
          <ol className="mt-4 space-y-2.5 list-decimal list-inside">
            <li>Pick any facility on our site. Note their phone number.</li>
            <li>Call that number. It rings at the facility, not at RehabLookup.</li>
            <li>
              If you're routed somewhere else, please email us at{" "}
              <a
                href="mailto:trust@rehablookup.com"
                className="text-[#1B365D] underline underline-offset-2 font-medium"
              >
                trust@rehablookup.com
              </a>
              {" "}— we'll investigate immediately.
            </li>
          </ol>
          <p className="mt-4">
            You can also reach our concierge team directly at{" "}
            <a
              href="tel:+12146396420"
              className="text-[#1B365D] underline underline-offset-2 font-medium whitespace-nowrap"
            >
              214-639-6420
            </a>
            . Our team is paid salary. They are not paid based on which
            facility you choose, whether you enter treatment, or how long you
            stay.
          </p>

          {/* Section 6 */}
          <SectionHeader id="sustain">How we sustain the business</SectionHeader>
          <p>
            Our revenue comes entirely from facility subscriptions and
            add-ons. No advertising networks. No data sales. No third-party
            tracking that monetizes visitor behavior. No affiliate revenue
            tied to treatment placement.
          </p>
          <p className="mt-4">
            We do plan to add affiliate revenue from non-treatment products
            in the future — books, recovery monitoring tools (like
            Soberlink), family support resources. These are outside the
            EKRA-regulated space and unrelated to facility placement. When
            we add them, they'll be clearly disclosed as affiliate links on
            the relevant resource pages.
          </p>

          {/* Section 7 */}
          <SectionHeader id="contact">Questions, concerns, or red flags</SectionHeader>
          <p>
            Trust isn't a marketing position. If anything on our site looks
            wrong — a facility that shouldn't be listed, a phone number that
            doesn't ring at the facility, a placement that feels off — we
            want to hear about it.
          </p>
          <ul className="mt-4 space-y-2">
            <li className="flex items-start gap-2.5">
              <Mail className="h-4 w-4 text-[#1B365D] shrink-0 mt-[3px]" aria-hidden />
              <span>
                Email:{" "}
                <a
                  href="mailto:trust@rehablookup.com"
                  className="text-[#1B365D] underline underline-offset-2 font-medium"
                >
                  trust@rehablookup.com
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="h-4 w-4 text-[#1B365D] shrink-0 mt-[3px]" aria-hidden />
              <span>
                Phone:{" "}
                <a
                  href="tel:+12146396420"
                  className="text-[#1B365D] underline underline-offset-2 font-medium whitespace-nowrap"
                >
                  214-639-6420
                </a>
                {" "}(ask for compliance)
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="h-4 w-4 text-[#1B365D] shrink-0 mt-[3px]" aria-hidden />
              <span>
                Media or regulatory inquiries:{" "}
                <a
                  href="mailto:press@rehablookup.com"
                  className="text-[#1B365D] underline underline-offset-2 font-medium"
                >
                  press@rehablookup.com
                </a>
              </span>
            </li>
          </ul>

          {/* Footer / metadata */}
          <hr className="my-12 border-slate-200" />
          <footer className="text-sm text-slate-600 space-y-3">
            <p>
              Last updated:{" "}
              <time dateTime={LAST_UPDATED_ISO} className="text-slate-700">
                {new Date(LAST_UPDATED_ISO).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </p>
            <p className="text-[13px] leading-[1.55] text-slate-500">
              RehabLookup is a substance use disorder treatment directory
              operated by Chikas Holdings, Inc. This page is informational
              and not legal advice. Treatment facilities and families with
              specific compliance questions should consult qualified counsel.
            </p>
            <p className="text-[13px] text-slate-500">
              See also:{" "}
              <Link to="/about" className="underline underline-offset-2 hover:text-[#1B365D]">
                About RehabLookup
              </Link>
              {" · "}
              <Link to="/rehab-score" className="underline underline-offset-2 hover:text-[#1B365D]">
                Rehab Score methodology
              </Link>
              {" · "}
              <Link to="/editorial-policy" className="underline underline-offset-2 hover:text-[#1B365D]">
                Editorial policy
              </Link>
            </p>
          </footer>
        </article>
      </main>
    </Layout>
  );
}
