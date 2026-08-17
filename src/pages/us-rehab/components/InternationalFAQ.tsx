import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface InternationalFAQProps {
  title?: string;
  subtitle?: string;
  faqs?: FAQItem[];
  schemaId?: string;
}

const defaultFAQs: FAQItem[] = [
  {
    question: "Can people outside the US contact treatment facilities listed on RehabLookup?",
    answer: "Yes. RehabLookup is a public directory, so you can research listed US treatment facilities and contact providers directly. Each facility decides whether it accepts international admissions and what documentation, payment, or travel arrangements it requires."
  },
  {
    question: "Do US treatment facilities accept people without US insurance?",
    answer: "Policies vary by facility. Some providers accept self-pay patients or other payment arrangements, while others may have different requirements. Confirm payment options, total costs, deposits, refund policies, and any insurance questions directly with the facility before making travel plans."
  },
  {
    question: "What visa or travel permission is needed for treatment in the United States?",
    answer: "Immigration and travel requirements depend on your circumstances and can change. RehabLookup does not provide immigration or legal advice. Check current requirements with the appropriate US government source, embassy or consulate, and obtain professional legal advice when needed before arranging treatment travel."
  },
  {
    question: "How long are US treatment programs?",
    answer: "Program length varies by facility, level of care, clinical need, and individual treatment plan. Contact a facility directly to understand its typical program lengths, admission criteria, and whether the program can accommodate your travel circumstances."
  },
  {
    question: "How is treatment privacy handled?",
    answer: "Privacy obligations depend on the provider, applicable law, and the information involved. Ask the facility how it handles health information, communications, billing, visitors, and international contact before admission. RehabLookup does not guarantee a provider's privacy practices."
  },
  {
    question: "Do facilities provide airport transportation?",
    answer: "Some facilities may offer or help coordinate transportation, while others do not. RehabLookup does not arrange travel or transportation. Confirm any pickup service, cost, timing, and responsible provider directly with the facility."
  },
  {
    question: "Can family members participate in treatment?",
    answer: "Many programs offer some form of family involvement, but policies differ by facility and level of care. Ask about visiting rules, family therapy, virtual participation, and accommodation options before admission."
  },
  {
    question: "What languages do US treatment facilities support?",
    answer: "Language support varies. Some facilities have multilingual clinical or admissions staff or can arrange interpretation. Confirm the languages available for clinical care—not only admissions—directly with the provider."
  },
  {
    question: "How should I compare US treatment facilities?",
    answer: "Compare the level of care, services, licensing and accreditation information where applicable, insurance or payment options, staff and program details, location, policies, and direct contact information. Verify important details with the facility before making a treatment decision."
  },
  {
    question: "What happens after treatment ends?",
    answer: "Aftercare planning differs by provider and individual need. Ask a facility how it coordinates follow-up care, medications, therapy, recovery support, and continuity with providers in your home country before you enroll."
  }
];

export const InternationalFAQ = ({
  title = "Frequently Asked Questions",
  subtitle = "Practical questions to ask when researching addiction treatment in the United States from abroad.",
  faqs = defaultFAQs,
  schemaId = "international-faq"
}: InternationalFAQProps) => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `https://rehablookup.com/#${schemaId}`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="bg-background py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 text-primary">
              <HelpCircle className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">FAQ</span>
            </div>
            <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
            <p className="text-base leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`} className="rounded-xl border border-border/50 bg-muted/20 px-6">
                <AccordionTrigger className="py-4 text-left text-sm font-semibold text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </section>
  );
};
