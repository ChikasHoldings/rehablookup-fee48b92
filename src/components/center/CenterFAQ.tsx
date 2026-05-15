/**
 * CenterFAQ
 * ─────────
 * Accordion of FAQ entries auto-generated from the facility's services,
 * insurance, accreditations, and gender_served. Each Q/A uses real data
 * from the row — no stale hardcoded FAQ that doesn't reflect the
 * facility. Also powers FAQPage JSON-LD on the page.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * Exported so CenterJsonLd can reuse the same Q/A list for FAQPage
 * schema. Returns 4-6 entries depending on data availability.
 */
export function buildCenterFAQs(input: {
  name: string;
  city: string;
  state: string;
  services: string[];
  insurance: string[];
  accreditations: string[];
  ageGroups: string[];
  genderServed: string | null;
}): FaqEntry[] {
  const { name, city, state, services, insurance, accreditations, ageGroups, genderServed } = input;
  const faqs: FaqEntry[] = [];

  const primaryInsurance = insurance.find((i) => /medicare|medicaid|tricare|aetna|cigna|blue cross|bcbs|united/i.test(i));
  if (primaryInsurance) {
    faqs.push({
      question: `Does ${name} accept ${primaryInsurance}?`,
      answer: `${name} is listed as accepting ${primaryInsurance}. Coverage details, copays, and prior authorization vary by plan — verify benefits directly with the facility or use our free insurance verification tool before admission.`,
    });
  }

  if (services.length > 0) {
    const top = services.slice(0, 5).join(", ");
    faqs.push({
      question: `What treatment services does ${name} offer?`,
      answer: `${name} offers ${top}${services.length > 5 ? ", and additional programs" : ""}. The center serves people seeking substance-use treatment in ${city}, ${state}.`,
    });
  }

  if (accreditations.length > 0) {
    const names = accreditations.slice(0, 3).join(", ");
    faqs.push({
      question: `Is ${name} accredited?`,
      answer: `Yes — ${name} is accredited by ${names}. Accreditation means the facility meets independent standards for clinical quality, safety, and ethical practice.`,
    });
  }

  if (ageGroups.length > 0) {
    faqs.push({
      question: `What age groups does ${name} treat?`,
      answer: `${name} treats ${ageGroups.join(", ")}. Specific age-band programs may differ by level of care; contact the facility to confirm fit.`,
    });
  }

  if (genderServed) {
    faqs.push({
      question: `Does ${name} treat all genders?`,
      answer: `${name} serves ${genderServed}. Gender-specific programming is increasingly common for trauma-informed treatment; ask the facility about cohort composition for the program you're considering.`,
    });
  }

  faqs.push({
    question: `How do I verify insurance or start admissions at ${name}?`,
    answer: `Use the free insurance verification on this page or call our recovery advisors at (214) 639-6420 for help. We can confirm coverage with ${name} or match you with an alternative if the fit isn't right.`,
  });

  return faqs.slice(0, 6);
}

interface CenterFAQProps {
  faqs: FaqEntry[];
}

export function CenterFAQ({ faqs }: CenterFAQProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Frequently Asked Questions</h2>
      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={faq.question}>
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-medium text-slate-900">{faq.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-slate-700 leading-relaxed">{faq.answer}</div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Need more info?{" "}
        <Link to="/concierge" className="text-emerald-700 hover:underline font-medium">
          Talk to a free recovery advisor →
        </Link>
      </p>
    </section>
  );
}
