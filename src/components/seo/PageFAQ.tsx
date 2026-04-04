import { memo } from "react";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface FAQItem {
  question: string;
  answer: string;
}

interface PageFAQProps {
  faqs: FAQItem[];
  title?: string;
  description?: string;
  className?: string;
  /** Inject FAQPage JSON-LD schema into <head> (default: true) */
  withSchema?: boolean;
}

/**
 * Reusable page-level FAQ section with:
 * - Accessible accordion UI
 * - Automatic FAQPage JSON-LD structured data for Google rich results
 *
 * Usage:
 *   <PageFAQ faqs={[{ question: "...", answer: "..." }]} />
 */
export const PageFAQ = memo(function PageFAQ({
  faqs,
  title = "Frequently Asked Questions",
  description,
  className,
  withSchema = true,
}: PageFAQProps) {
  if (!faqs || faqs.length === 0) return null;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
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
    <section className={cn("py-10 md:py-12 lg:py-16", className)}>
      {withSchema && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        </Helmet>
      )}
      <div className="container max-w-3xl px-4 md:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              {description}
            </p>
          )}
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-border">
              <AccordionTrigger className="text-left text-[15px] font-medium text-foreground hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
});
