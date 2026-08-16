import { Link } from "react-router-dom";
import { ShieldCheck, Clock, HandHeart, Lock, ChevronRight } from "lucide-react";

/**
 * Common-Questions section — replaced the homepage testimonials block
 * on 2026-05-23, redesigned 2026-05-23 with a directory-style aesthetic
 * (Healthgrades / Yelp / Zocdoc reference): tighter density, lighter
 * chrome, four-up on desktop, no card shadows on rest.
 *
 * Conversion intent unchanged — surface the four real
 * inquiry-blocking objections (insurance, speed, cost, confidentiality)
 * with plain-English answers, each deep-linked to a long-form
 * Resources article.
 *
 * Visual contract:
 *   - White background, single hairline top/bottom border.
 *   - 4-up grid on lg+, 2-up on md, 1-up on mobile. Each card is a
 *     compact row of icon + question + answer + chevron link.
 *   - No icon background pills, no lift-on-hover shadow; hover just
 *     warms the border + nudges the chevron — directory-grade calm.
 *   - Typography uses the same display-stack scale as the rest of the
 *     homepage but at -1 size step so the section reads as supporting
 *     content, not a hero band.
 */

interface QuestionCard {
  icon: typeof ShieldCheck;
  iconColor: string;
  question: string;
  answer: string;
  cta: string;
  href: string;
}

const QUESTIONS: QuestionCard[] = [
  {
    icon: ShieldCheck,
    iconColor: "text-primary",
    question: "Will my insurance cover this?",
    answer:
      "Most major plans cover treatment by federal parity law — Aetna, BCBS, Cigna, UnitedHealthcare, Kaiser, and Medicaid in every state. Our team verifies your benefits at no cost.",
    cta: "Insurance carriers",
    href: "/insurance",
  },
  {
    icon: Clock,
    iconColor: "text-emerald-700",
    question: "How fast can someone get in?",
    answer:
      "Many listed facilities offer same-day or next-day admission for crisis cases. Listings publish admissions phone numbers — a short call to the facility confirms insurance and bed availability.",
    cta: "Same-day admission",
    href: "/resources/how-to-get-into-rehab-today",
  },
  {
    icon: HandHeart,
    iconColor: "text-amber-700",
    question: "What if I can't afford it?",
    answer:
      "Free state-funded beds, sliding-scale facilities, Medicaid retroactive enrollment, scholarships, faith-based programs, and payment plans exist in every state.",
    cta: "10 ways to pay",
    href: "/resources/how-to-pay-for-rehab-without-insurance",
  },
  {
    icon: Lock,
    iconColor: "text-slate-700",
    question: "Will it stay confidential?",
    answer:
      "42 CFR Part 2 — the federal rule covering substance-use treatment records — gives stronger protections than HIPAA. Employer, family, and the public are firewalled by law.",
    cta: "Your privacy rights",
    href: "/resources/is-rehab-confidential",
  },
];

export function CommonQuestionsSection() {
  return (
    <section
      aria-labelledby="common-questions-heading"
      className="border-y border-border/60 bg-background"
    >
      <div className="container px-4 md:px-6 lg:px-8 py-10 md:py-12">
        <header className="mb-6 md:mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
              Before you reach out
            </p>
            <h2
              id="common-questions-heading"
              className="font-display text-xl md:text-2xl font-bold text-foreground tracking-tight"
            >
              Four questions families ask most
            </h2>
          </div>
          <Link
            to="/resources"
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Browse all guides
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-border bg-border overflow-hidden">
          {QUESTIONS.map((q) => {
            const Icon = q.icon;
            return (
              <li key={q.question} className="bg-card">
                <Link
                  to={q.href}
                  className="group flex h-full flex-col p-5 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <Icon className={`h-5 w-5 ${q.iconColor} mb-3`} aria-hidden />
                  <h3 className="text-[15px] font-semibold text-foreground leading-snug mb-1.5">
                    {q.question}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-3 flex-1">
                    {q.answer}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary mt-auto">
                    {q.cta}
                    <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
