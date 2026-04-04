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
    question: "How do international patients pay for US treatment?",
    answer: "Most international patients pay directly (self-pay) for treatment, as US insurance typically doesn't cover foreign residents. Many luxury and private rehab centers offer competitive pricing for international clients, often including concierge services, airport transfers, and aftercare planning. Payment plans and financing options are available at select facilities. Our placement specialists can help you find centers that match your budget."
  },
  {
    question: "Do US rehabs accept patients without US insurance?",
    answer: "Yes, the majority of US rehab centers accept international patients without US insurance. Self-pay rates are standard practice, and many facilities offer all-inclusive packages specifically designed for international clients. These packages typically include accommodation, meals, treatment programming, and support services."
  },
  {
    question: "What visa do I need for treatment in America?",
    answer: "Most international patients enter the US on a B-2 tourist visa for medical treatment. This visa allows stays of up to 6 months, which is sufficient for most treatment programs. Some facilities can provide documentation to support your visa application. We recommend consulting with a US embassy or immigration attorney for specific guidance based on your country of origin."
  },
  {
    question: "How long can I stay in the US for rehab?",
    answer: "With a B-2 visa, you can typically stay for up to 6 months, with possibility of extension. Treatment programs range from 30 days to 90+ days depending on clinical needs. Many international clients complete 60-90 day residential programs to maximize their treatment outcomes before returning home."
  },
  {
    question: "Will my treatment be confidential?",
    answer: "Absolutely. US treatment facilities are bound by strict HIPAA privacy laws and international patient confidentiality standards. Your treatment records cannot be shared without your explicit consent. Many facilities catering to international clients specialize in discrete, private treatment for executives, celebrities, and high-profile individuals."
  },
  {
    question: "How do I get from the airport to the facility?",
    answer: "Most treatment centers offer airport pickup services, especially for international patients. Our placement specialists coordinate all transportation logistics, ensuring you're met at the airport and safely transported to your treatment facility. Private car services and even helicopter transfers are available for luxury programs."
  },
  {
    question: "Can family members visit during treatment?",
    answer: "Yes, family involvement is often encouraged as part of the treatment process. Many facilities offer family therapy programs, visiting days, and even family housing options. International families can plan visits during designated family weekends or participate in virtual family sessions."
  },
  {
    question: "What languages do US rehabs support?",
    answer: "Many US treatment centers have multilingual staff and offer translation services. Spanish, French, German, Arabic, Mandarin, and other languages are commonly supported. When you work with our placement service, we match you with facilities that can accommodate your language preferences."
  },
  {
    question: "Why choose US treatment over rehab in my home country?",
    answer: "The United States offers world-renowned addiction treatment with access to cutting-edge therapies, highly trained clinical staff, and diverse treatment modalities. Many international clients choose US treatment for privacy (being away from their community), access to specialized programs not available elsewhere, and the opportunity to focus entirely on recovery in a new environment."
  },
  {
    question: "What happens after I complete treatment?",
    answer: "Comprehensive aftercare planning begins before you leave treatment. This includes connecting you with recovery resources in your home country, virtual therapy options, alumni support networks, and ongoing case management. Many international clients return for periodic check-ups or extended care programs."
  }
];

export const InternationalFAQ = ({
  title = "Frequently Asked Questions",
  subtitle = "Everything you need to know about seeking addiction treatment in the United States as an international patient.",
  faqs = defaultFAQs,
  schemaId = "international-faq"
}: InternationalFAQProps) => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `https://rehablookup.com/#${schemaId}`,
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-primary mb-3">
              <HelpCircle className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">FAQ</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              {title}
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-muted/20 rounded-xl px-6 border border-border/50"
              >
                <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:text-primary py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </section>
  );
};
