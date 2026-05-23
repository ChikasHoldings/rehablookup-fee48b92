import { Link } from "react-router-dom";
import { ShieldCheck, Clock, HandHeart, Lock, ArrowRight } from "lucide-react";

/**
 * Common-Questions section — replaced the homepage testimonials block
 * on 2026-05-23.
 *
 * The testimonials were doing conversion theater: 58 stock-style
 * portraits with marketing-voice quotes claiming clinical outcomes
 * ("14 months sober", "treatment stuck"). In a substance-use niche
 * those carry FTC + 42 CFR Part 2 risk and contradict the platform's
 * "we are the honest directory" positioning.
 *
 * This replacement does the same conversion job — reduce barriers to
 * action — but through substance:
 *
 *   1. Each card surfaces a real question the team hears before a
 *      seeker fills out the inquiry form (cost, speed, confidentiality,
 *      insurance — the four objections that actually block action).
 *   2. Each answer is plain-English, accurate, and short enough that
 *      the visitor doesn't need to leave the homepage to feel
 *      reassured.
 *   3. Each card links to one of our long-form Resources articles for
 *      visitors who want the depth — so the section also drives
 *      content engagement, not just CTAs.
 *
 * Visual contract:
 *   - Section sits in the same band rhythm as Browse-by-Category and
 *     Insurance-Coverage above it: roomy padding, muted background,
 *     subtle hairline borders.
 *   - 2×2 grid on desktop (lg+), 1 column on mobile, matching the
 *     "Find Treatment by State" cards' breakpoint behavior.
 *   - Icons + question + answer + arrow-link follow the same internal
 *     hierarchy as Browse-by-Category for cross-section consistency.
 */

interface QuestionCard {
  icon: typeof ShieldCheck;
  iconBg: string;
  iconColor: string;
  question: string;
  answer: string;
  cta: string;
  href: string;
}

const QUESTIONS: QuestionCard[] = [
  {
    icon: ShieldCheck,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    question: "Will my insurance cover this?",
    answer:
      "Most major plans cover addiction treatment by federal parity law — Aetna, BCBS, Cigna, UnitedHealthcare, Kaiser, and Medicaid in every state. Our team verifies your specific benefits at no cost, usually within one business day.",
    cta: "See insurance carriers we work with",
    href: "/insurance",
  },
  {
    icon: Clock,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    question: "How fast can someone get in?",
    answer:
      "Many of our verified facilities offer same-day or next-day admission for crisis cases. The fastest path is usually a five-minute call with our placement team — they handle insurance verification and bed availability in parallel.",
    cta: "How same-day admission works",
    href: "/resources/how-to-get-into-rehab-today",
  },
  {
    icon: HandHeart,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    question: "What if I can't afford it?",
    answer:
      "Free state-funded beds, sliding-scale facilities, Medicaid retroactive enrollment, treatment scholarships, faith-based programs, and payment plans exist in every state. Most seekers have more options than they realize on day one.",
    cta: "10 ways to pay without insurance",
    href: "/resources/how-to-pay-for-rehab-without-insurance",
  },
  {
    icon: Lock,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
    question: "Will it stay confidential?",
    answer:
      "42 CFR Part 2 — the federal rule covering substance-use treatment records — gives stronger protections than HIPAA. Your employer, family, and the public are firewalled from your treatment by law, with narrow, revocable consent the only exception.",
    cta: "Your privacy rights, in plain English",
    href: "/resources/is-rehab-confidential",
  },
];

export function CommonQuestionsSection() {
  return (
    <section
      aria-labelledby="common-questions-heading"
      className="py-10 md:py-12 lg:py-20 bg-muted/40 border-y border-border/50"
    >
      <div className="container px-4 md:px-6 lg:px-8">
        {/* Section header — eyebrow + headline + subhead pattern,
            matches Browse-by-Category above it. */}
        <header className="text-center mb-8 md:mb-10 lg:mb-12 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Before you reach out
            </span>
          </div>
          <h2
            id="common-questions-heading"
            className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight"
          >
            The four questions families ask most
          </h2>
          <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
            Straight answers — no marketing-speak — about what really happens
            when you call.
          </p>
        </header>

        {/* 2×2 grid on lg+, 1-up on mobile/sm. Cards use the same
            card-on-muted treatment as Browse-by-Category so the page
            band rhythm reads as one site. */}
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 lg:gap-6 max-w-5xl mx-auto">
          {QUESTIONS.map((q) => {
            const Icon = q.icon;
            return (
              <li key={q.question}>
                <Link
                  to={q.href}
                  className="group block h-full rounded-2xl border border-border bg-card p-6 md:p-7 shadow-sm hover:border-primary/30 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${q.iconBg} ${q.iconColor} transition-transform group-hover:scale-105`}
                      aria-hidden
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base md:text-lg font-bold text-foreground leading-snug">
                        {q.question}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {q.answer}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                        {q.cta}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Fallback link for visitors who want the full library —
            keeps the section from feeling like a closed set. */}
        <p className="mt-8 md:mt-10 text-center text-sm text-muted-foreground">
          More questions answered in our{" "}
          <Link
            to="/resources"
            className="font-semibold text-primary hover:underline underline-offset-2"
          >
            Resources library
          </Link>
          {" "}— 100+ guides written by our editorial team.
        </p>
      </div>
    </section>
  );
}
