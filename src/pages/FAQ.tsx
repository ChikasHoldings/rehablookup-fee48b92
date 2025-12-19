import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Search, 
  HelpCircle, 
  ArrowRight,
  Heart,
  Shield,
  Stethoscope,
  DollarSign,
  Building2,
  Phone
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  faqs: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: "getting-help",
    name: "Getting Help",
    icon: Heart,
    description: "Starting your recovery journey",
    faqs: [
      {
        question: "How do I know if I or my loved one needs professional help?",
        answer: "Signs that professional help may be beneficial include difficulty controlling substance use, experiencing withdrawal symptoms, neglecting responsibilities at work or home, strained relationships, and continued use despite negative consequences. If substance use is impacting daily life, health, or wellbeing, reaching out to a professional for an assessment is a positive first step."
      },
      {
        question: "What is the first step to getting help?",
        answer: "The first step is reaching out. You can use our Request Help form to connect with treatment centers that match your needs, or call facilities directly. Many centers offer free assessments to help determine the appropriate level of care. There is no commitment required to explore your options."
      },
      {
        question: "Can I get help for someone else?",
        answer: "Yes. Many families and friends reach out on behalf of a loved one. Treatment centers can provide guidance on how to approach the conversation, and some offer intervention services. Our support team can help you understand options and next steps for helping someone you care about."
      },
      {
        question: "Is there help available 24/7?",
        answer: "Many treatment centers have admissions staff available around the clock. Through RehabLookup, you can submit a help request anytime, and facilities typically respond within hours. For immediate crisis support, you can also contact the SAMHSA National Helpline at 1-800-662-4357."
      },
      {
        question: "What should I expect when I first reach out?",
        answer: "When you contact a treatment center, a trained admissions coordinator will ask about your situation, substance use history, insurance coverage, and preferences. This helps them recommend appropriate programs. The conversation is confidential, and there is no pressure to commit immediately."
      }
    ]
  },
  {
    id: "matching-privacy",
    name: "Matching & Privacy",
    icon: Shield,
    description: "How we connect you with care",
    faqs: [
      {
        question: "How does RehabLookup match me with treatment centers?",
        answer: "When you submit a help request, we share your information only with treatment centers that match your criteria—such as location, insurance type, and treatment needs. You choose which facilities to connect with, and you can contact multiple centers to find the best fit."
      },
      {
        question: "Is my information kept confidential?",
        answer: "Absolutely. Your privacy is our priority. We only share your contact information with facilities you choose to connect with. We use encryption to protect your data and follow healthcare privacy best practices. We never sell your information to third parties."
      },
      {
        question: "Will my employer or family find out I searched for treatment?",
        answer: "Your search activity on RehabLookup is private. We do not contact employers, family members, or anyone else about your inquiry. Treatment centers are also bound by strict confidentiality regulations, including HIPAA and 42 CFR Part 2, which protect addiction treatment records."
      },
      {
        question: "How do you verify the treatment centers listed?",
        answer: "We verify that listed facilities hold proper state licenses and recognized accreditations such as The Joint Commission or CARF. We confirm insurance acceptance, review treatment approaches, and monitor feedback. Our team regularly updates listings to maintain accuracy and quality."
      },
      {
        question: "Is RehabLookup free to use?",
        answer: "Yes, RehabLookup is completely free for individuals and families searching for treatment. We provide information and connection services at no cost to you. Our mission is to help you find the right care without financial barriers."
      }
    ]
  },
  {
    id: "treatment-options",
    name: "Treatment Options",
    icon: Stethoscope,
    description: "Understanding different types of care",
    faqs: [
      {
        question: "What is the difference between inpatient and outpatient treatment?",
        answer: "Inpatient (residential) treatment involves living at a facility full-time, typically for 30-90 days, with 24/7 support and structured programming. Outpatient treatment allows you to live at home while attending scheduled therapy sessions. The right choice depends on the severity of addiction, your support system, and personal circumstances."
      },
      {
        question: "What is medical detox and when is it needed?",
        answer: "Medical detoxification is supervised withdrawal from substances with medical monitoring and, when appropriate, medication to manage symptoms. It is particularly important for alcohol, benzodiazepines, and opioids, where withdrawal can be uncomfortable or potentially dangerous. Detox is typically the first phase before entering a treatment program."
      },
      {
        question: "What types of therapy are used in treatment?",
        answer: "Evidence-based therapies include Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT), Motivational Interviewing, and trauma-informed approaches. Many programs also offer group therapy, family therapy, and holistic options like mindfulness, yoga, and art therapy. Treatment plans are personalized to each individual."
      },
      {
        question: "How long does treatment typically last?",
        answer: "Treatment duration varies based on individual needs. Short-term programs are typically 28-30 days, while extended programs run 60-90 days or longer. Research shows that longer engagement often supports better outcomes. Your treatment team will recommend an appropriate length based on your progress and goals."
      },
      {
        question: "What is dual diagnosis treatment?",
        answer: "Dual diagnosis treatment addresses both substance use disorders and co-occurring mental health conditions such as depression, anxiety, or PTSD. Integrated treatment that addresses both issues simultaneously tends to be more effective than treating them separately."
      },
      {
        question: "What happens after completing a program?",
        answer: "Aftercare planning is a key part of treatment. This typically includes continued therapy, support group participation (such as AA or NA), possible sober living arrangements, and strategies for maintaining recovery. Most programs create a comprehensive aftercare plan before you complete treatment."
      }
    ]
  },
  {
    id: "cost-insurance",
    name: "Cost & Insurance",
    icon: DollarSign,
    description: "Payment options and coverage",
    faqs: [
      {
        question: "Does insurance cover addiction treatment?",
        answer: "Most health insurance plans cover addiction treatment under mental health benefits, thanks to the Mental Health Parity and Addiction Equity Act. Coverage typically includes detox, inpatient, and outpatient services. Benefits vary by plan, so we recommend verifying coverage with your insurance provider or the treatment center's admissions team."
      },
      {
        question: "What if I do not have insurance?",
        answer: "Many options exist for those without insurance. Treatment centers may offer sliding scale fees based on income, payment plans, or scholarships. State-funded programs, Medicaid, and nonprofit organizations also provide accessible treatment. Do not let lack of insurance prevent you from seeking help."
      },
      {
        question: "How much does rehab typically cost?",
        answer: "Costs vary widely based on program type, location, and amenities. Outpatient programs may range from $1,000-$10,000, while residential treatment can range from $10,000-$30,000 or more per month. Many effective programs exist at various price points, and most centers work with families on payment options."
      },
      {
        question: "Can I use my HSA or FSA for treatment?",
        answer: "Yes, Health Savings Accounts (HSA) and Flexible Spending Accounts (FSA) can typically be used for qualified addiction treatment expenses, including detox, therapy, and prescribed medications. Check with your account administrator and the treatment facility for specific eligible expenses."
      },
      {
        question: "What does in-network versus out-of-network mean?",
        answer: "In-network facilities have negotiated rates with your insurance company, usually resulting in lower out-of-pocket costs. Out-of-network facilities may cost more, as your plan may cover a smaller percentage. Some plans offer out-of-network benefits while others do not. Always verify coverage before starting treatment."
      }
    ]
  },
  {
    id: "for-providers",
    name: "For Providers",
    icon: Building2,
    description: "Information for treatment centers",
    faqs: [
      {
        question: "How can my facility be listed on RehabLookup?",
        answer: "Treatment centers can apply through our For Providers page. We review licensing, accreditation, and credentials before approval. Listed facilities must meet our quality standards and maintain accurate information. Once approved, you can manage your listing and receive connection requests from potential clients."
      },
      {
        question: "What are the requirements to be listed?",
        answer: "Facilities must hold valid state licenses and preferably recognized accreditations. We verify operational status, treatment services offered, and insurance acceptance. We prioritize facilities that demonstrate commitment to evidence-based care and ethical practices."
      },
      {
        question: "Is there a cost to list my facility?",
        answer: "We offer both free and premium listing options. Free listings include basic facility information and contact details. Premium plans provide enhanced visibility, lead management tools, analytics, and additional features to help you connect with clients seeking care."
      },
      {
        question: "How do I receive and manage leads?",
        answer: "When someone submits a help request matching your facility's criteria, you receive a notification with their contact information. Our provider dashboard allows you to manage leads, track outreach, and monitor your listing performance. You can respond to inquiries directly through our platform or your preferred contact method."
      },
      {
        question: "Can I update my facility information?",
        answer: "Yes, providers can update their listing information at any time through the provider dashboard. Changes to certain fields may require verification before going live. Keeping your information current helps ensure you connect with clients who are a good fit for your services."
      }
    ]
  }
];

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Add JSON-LD structured data for SEO
  useEffect(() => {
    const allFaqs = faqCategories.flatMap(category => category.faqs);
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": allFaqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    script.id = 'faq-jsonld';
    
    const existing = document.getElementById('faq-jsonld');
    if (existing) existing.remove();
    
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('faq-jsonld');
      if (scriptToRemove) scriptToRemove.remove();
    };
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery && !selectedCategory) return faqCategories;
    
    return faqCategories
      .filter(category => !selectedCategory || category.id === selectedCategory)
      .map(category => ({
        ...category,
        faqs: category.faqs.filter(faq => 
          !searchQuery || 
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
      .filter(category => category.faqs.length > 0);
  }, [searchQuery, selectedCategory]);

  const totalResults = filteredCategories.reduce((acc, cat) => acc + cat.faqs.length, 0);

  const allFaqsForSchema = faqCategories.flatMap(cat => 
    cat.faqs.map(faq => ({ question: faq.question, answer: faq.answer }))
  );

  return (
    <Layout>
      <SEO
        title="Frequently Asked Questions About Addiction Treatment"
        description="Get answers to common questions about addiction treatment, insurance coverage, privacy, and how RehabLookup helps you find the right rehab center."
        canonical="/faq"
        structuredData={generateFAQSchema(allFaqsForSchema)}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "FAQ", url: "/faq" },
        ]}
      />
      
      {/* Hero Section */}
      <section className="relative bg-primary py-12 px-4 md:py-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        </div>
        
        <div className="container relative max-w-4xl mx-auto">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10">
              <HelpCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Frequently Asked Questions</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              How Can We Help You?
            </h1>
            <p className="mb-6 text-base text-primary-foreground/80 leading-relaxed max-w-lg mx-auto">
              Find answers about treatment options, insurance, privacy, and how we connect you with care.
            </p>
            
            {/* Search Bar */}
            <div className="relative mx-auto max-w-md mb-8">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 rounded-xl border-0 bg-card pl-11 pr-11 text-sm shadow-lg placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Quick Jump Navigation */}
            <div className="flex flex-wrap justify-center gap-2">
              {faqCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearchQuery("");
                    setTimeout(() => {
                      document.getElementById(category.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                  className="group flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 px-3 py-2 text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground transition-all"
                >
                  <category.icon className="h-4 w-4 text-accent" />
                  <span>{category.name}</span>
                  <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Category Filter */}
      <section className="sticky top-16 z-30 border-b border-border bg-card/95 backdrop-blur-md py-3 px-4 shadow-sm">
        <div className="container max-w-4xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 md:flex-wrap md:justify-center md:overflow-visible md:pb-0 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`h-9 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === null 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                selectedCategory === null ? "bg-white/20" : "bg-background"
              }`}>
                {faqCategories.reduce((acc, cat) => acc + cat.faqs.length, 0)}
              </span>
            </button>
            {faqCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`h-9 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === category.id 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <category.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{category.name}</span>
                <span className="sm:hidden">{category.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-10 px-4 md:py-14 bg-gradient-to-b from-background to-muted/20">
        <div className="container max-w-4xl mx-auto">
          {/* Search Results Info */}
          {searchQuery && (
            <div className="mb-6 flex items-center justify-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-sm">
                <Search className="h-3.5 w-3.5 text-accent" />
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for 
                  <span className="font-medium text-foreground ml-1">"{searchQuery}"</span>
                </span>
              </div>
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-accent hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          {filteredCategories.length === 0 ? (
            <div className="mx-auto max-w-sm text-center py-12">
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-foreground">No Results Found</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Try different keywords or browse by category.
              </p>
              <Button 
                onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                variant="outline"
                className="gap-2"
              >
                View All Questions
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {filteredCategories.map((category) => (
                <div key={category.id} id={category.id} className="scroll-mt-28">
                  {/* Category Header */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                      <category.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {category.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>

                  {/* FAQ Accordion */}
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category.id}-${index}`}
                        className="rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-border/80 data-[state=open]:border-accent/30 data-[state=open]:bg-accent/5"
                      >
                        <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline py-4 px-5 gap-3 [&>svg]:shrink-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground [&[data-state=open]>svg]:text-accent">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-4 px-5 leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Help CTA */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container max-w-4xl mx-auto">
          <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-card to-accent/10 p-8 md:p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
            
            <div className="relative">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-lg">
                <Phone className="h-5 w-5 text-white" />
              </div>
              <h2 className="mb-2 font-display text-xl font-bold text-foreground md:text-2xl">
                Still Have Questions?
              </h2>
              <p className="mb-6 text-sm text-muted-foreground max-w-md mx-auto">
                Our support team is here to help you find the right treatment center for your needs.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/request-help?source=faq_cta">
                  <Button className="h-11 gap-2 px-6">
                    <Heart className="h-4 w-4" />
                    Request Help
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" className="h-11 gap-2 px-6">
                    Contact Us
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default FAQ;
