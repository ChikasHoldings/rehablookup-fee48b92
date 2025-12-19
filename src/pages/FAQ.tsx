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
  Pill,
  DollarSign,
  Heart,
  Users,
  Clock,
  Shield
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
    id: "treatment-basics",
    name: "Treatment Basics",
    icon: Pill,
    description: "Understanding addiction treatment and what to expect",
    faqs: [
      {
        question: "How do I know if I or my loved one needs rehab?",
        answer: "Signs that treatment may be needed include inability to control substance use, withdrawal symptoms when not using, neglecting responsibilities, and continued use despite negative consequences. If substance use is affecting health, relationships, or daily life, it may be time to seek professional help. A professional assessment can help determine the appropriate level of care."
      },
      {
        question: "What is the difference between inpatient and outpatient treatment?",
        answer: "Inpatient (residential) treatment requires living at the facility 24/7 and provides intensive, structured care with round-the-clock medical supervision. Outpatient treatment allows you to live at home while attending scheduled therapy sessions, typically ranging from a few hours per week to several hours per day. The best option depends on the severity of addiction, your support system, work obligations, and personal circumstances."
      },
      {
        question: "What types of therapies are used in addiction treatment?",
        answer: "Common evidence-based therapies include Cognitive Behavioral Therapy (CBT), Dialectical Behavior Therapy (DBT), Motivational Interviewing, Group Therapy, Family Therapy, and 12-Step Facilitation. Many programs also incorporate holistic approaches like yoga, meditation, art therapy, and equine therapy. Treatment plans are typically customized to each individual's needs."
      },
      {
        question: "How long does rehab typically last?",
        answer: "Treatment duration varies based on individual needs. Short-term programs typically last 28-30 days, while long-term programs can be 60-90 days or longer. Some individuals benefit from extended care lasting 6 months to a year. Research shows that longer treatment periods often lead to better outcomes. Your treatment team will help determine the appropriate length of stay based on your progress."
      },
      {
        question: "What is medical detox and when is it necessary?",
        answer: "Medical detoxification is a supervised process of safely withdrawing from substances while managing withdrawal symptoms. It's typically necessary for alcohol, benzodiazepines, and opioid dependence, where withdrawal can be uncomfortable or even dangerous. Medical detox provides 24/7 monitoring and medication-assisted treatment to ensure safety and comfort during this initial phase of recovery."
      }
    ]
  },
  {
    id: "insurance-costs",
    name: "Insurance & Costs",
    icon: DollarSign,
    description: "Payment options and insurance coverage information",
    faqs: [
      {
        question: "Does insurance cover addiction treatment?",
        answer: "Most health insurance plans cover some form of addiction treatment under mental health benefits, thanks to the Mental Health Parity and Addiction Equity Act. Coverage varies by provider and plan, but typically includes detox, inpatient, outpatient, and medication-assisted treatment. Contact your insurance provider or the treatment center's admissions team to verify your specific benefits."
      },
      {
        question: "What if I don't have insurance?",
        answer: "Many treatment centers offer alternative payment options including sliding scale fees based on income, payment plans, scholarships, and state-funded programs. Some facilities accept Medicaid or Medicare. Non-profit organizations and community health centers may also provide free or low-cost treatment options. Don't let lack of insurance prevent you from seeking help."
      },
      {
        question: "How much does rehab typically cost?",
        answer: "Treatment costs vary widely depending on the type of program, location, amenities, and length of stay. Outpatient programs may cost $1,000-$10,000, while residential treatment can range from $10,000-$30,000+ per month. Luxury facilities may charge $50,000 or more. However, many effective treatment options exist at various price points, and most centers work with patients on payment options."
      },
      {
        question: "Can I use my HSA or FSA for treatment?",
        answer: "Yes, Health Savings Accounts (HSA) and Flexible Spending Accounts (FSA) can typically be used to pay for qualified addiction treatment expenses. This includes detox, inpatient and outpatient treatment, therapy, and prescribed medications. Check with your account administrator and the treatment facility for specific eligible expenses."
      },
      {
        question: "What does 'in-network' vs 'out-of-network' mean for treatment?",
        answer: "In-network facilities have negotiated rates with your insurance company, typically resulting in lower out-of-pocket costs. Out-of-network facilities don't have these agreements, so you may pay higher co-pays or a larger portion of the cost. Some plans offer out-of-network benefits, while others don't. Always verify coverage before starting treatment."
      }
    ]
  },
  {
    id: "family-support",
    name: "Family & Support",
    icon: Users,
    description: "How families can help and participate in recovery",
    faqs: [
      {
        question: "How can I support a loved one in treatment?",
        answer: "Supporting a loved one includes educating yourself about addiction, attending family therapy sessions, participating in family programs offered by the treatment center, maintaining healthy boundaries, taking care of your own mental health, and being patient with the recovery process. Joining support groups like Al-Anon or Nar-Anon can also provide valuable guidance and community."
      },
      {
        question: "Can family members visit during residential treatment?",
        answer: "Most residential programs have designated visiting hours and family weekends. Some facilities restrict visits during the initial detox and stabilization period to allow the patient to focus on their recovery. Family involvement is generally encouraged as it's a key factor in long-term success. Policies vary by facility, so check with the specific program."
      },
      {
        question: "What is family therapy and why is it important?",
        answer: "Family therapy addresses how addiction has affected family dynamics, improves communication, establishes healthy boundaries, and helps family members understand their role in supporting recovery. It can heal relationships damaged by addiction and create a stronger support system. Many programs offer family education sessions, therapy, and multi-day family programs."
      },
      {
        question: "How do I stage an intervention?",
        answer: "A professional intervention involves gathering family and friends to encourage a loved one to seek treatment. It's recommended to work with a certified intervention specialist who can guide the process, prepare participants, and handle difficult situations. The goal is to express concern lovingly while presenting treatment options and consequences if help is refused."
      },
      {
        question: "Should children be told about a parent's addiction treatment?",
        answer: "Age-appropriate honesty is generally recommended. Children often sense when something is wrong, and secrets can create anxiety. Explain that their parent is getting help for an illness, that addiction is not the child's fault, and that the family will receive support too. Many treatment programs offer resources specifically for explaining addiction to children."
      }
    ]
  },
  {
    id: "recovery-aftercare",
    name: "Recovery & Aftercare",
    icon: Heart,
    description: "Life after treatment and maintaining sobriety",
    faqs: [
      {
        question: "What happens after completing a treatment program?",
        answer: "Aftercare is crucial for long-term recovery. This typically includes continued therapy (individual and group), participation in support groups like AA or NA, possible sober living arrangements, medication management if applicable, and building a recovery-oriented lifestyle. Most treatment centers create a comprehensive aftercare plan before discharge."
      },
      {
        question: "What is a sober living home?",
        answer: "Sober living homes are structured, substance-free residences for people in recovery. They provide a transitional environment between treatment and independent living, with house rules, peer support, and often required participation in recovery activities. Residents typically pay rent and may continue working or attending school while maintaining their sobriety."
      },
      {
        question: "How do I prevent relapse?",
        answer: "Relapse prevention involves identifying triggers, developing coping strategies, maintaining a support network, attending therapy and support groups, practicing self-care, and following your aftercare plan. Warning signs to watch for include isolating, skipping meetings, romanticizing past use, and major life stress. Having a plan for high-risk situations is essential."
      },
      {
        question: "Is relapse a sign of failure?",
        answer: "No. Relapse is often part of the recovery process, not a sign of failure. Addiction is a chronic condition, and like other chronic diseases, setbacks can occur. What matters is responding to relapse quickly by reaching out for help, returning to treatment if needed, and learning from the experience to strengthen your recovery going forward."
      },
      {
        question: "How long does recovery take?",
        answer: "Recovery is a lifelong journey, not a destination. While acute treatment may last weeks or months, maintaining sobriety requires ongoing effort and support. Many people find that recovery becomes easier over time as new habits form and life improves. The brain also continues to heal for years after achieving sobriety, with continued improvements in cognitive function and emotional regulation."
      }
    ]
  },
  {
    id: "treatment-process",
    name: "Treatment Process",
    icon: Clock,
    description: "What to expect during the treatment journey",
    faqs: [
      {
        question: "What should I bring to residential treatment?",
        answer: "Most programs provide a packing list, but typically you should bring comfortable clothing, toiletries (no alcohol-based products), prescription medications in original bottles, insurance and ID cards, a list of emergency contacts, and personal items like photos or journals. Leave valuables, electronics (policies vary), and any prohibited items at home."
      },
      {
        question: "Can I work or go to school during treatment?",
        answer: "Outpatient programs are designed to accommodate work and school schedules, with sessions in the evenings or mornings. Intensive Outpatient Programs (IOP) require more time but can still allow for reduced work schedules. Residential treatment typically requires taking leave from work or school, though some facilities offer educational and vocational services on-site."
      },
      {
        question: "Will I have access to my phone during treatment?",
        answer: "Policies vary by facility. Many residential programs restrict or limit phone access, especially during the initial weeks, to minimize distractions and allow full focus on recovery. Some allow scheduled phone times for family calls. Outpatient programs generally don't restrict phone use outside of session times."
      },
      {
        question: "What is a typical day like in residential treatment?",
        answer: "A typical day includes structured activities: wake-up and morning meditation, breakfast, individual and group therapy sessions, educational lectures, lunch, recreational activities or exercise, more therapy, dinner, evening support groups or leisure time, and lights out. Programs vary, but most provide a balanced mix of treatment, education, and personal time."
      },
      {
        question: "Can I leave treatment early if I want to?",
        answer: "Adults in voluntary treatment can legally leave at any time (AMA - Against Medical Advice), though this is strongly discouraged as it increases relapse risk. Staff will discuss concerns and try to address any issues. Completing treatment significantly improves outcomes. Some insurance policies may not cover treatment left early, and court-ordered patients may face legal consequences."
      }
    ]
  },
  {
    id: "using-rehablookup",
    name: "Using RehabLookup",
    icon: Shield,
    description: "How our service works and what we offer",
    faqs: [
      {
        question: "Is RehabLookup free to use?",
        answer: "Yes, RehabLookup is completely free for individuals and families searching for treatment. We provide information, reviews, and connection services at no cost to you. Our goal is to help you find the right treatment center for your specific needs without any financial barrier."
      },
      {
        question: "How does RehabLookup verify treatment centers?",
        answer: "We verify that listed facilities are properly licensed and accredited by recognized organizations such as The Joint Commission, CARF, or state licensing boards. We also confirm insurance acceptance, review treatment modalities offered, and monitor user feedback. Our team regularly updates listings to ensure accuracy."
      },
      {
        question: "Is my search confidential?",
        answer: "Absolutely. Your privacy is our priority. We do not share your personal information with third parties without your consent. When you submit a contact request, only the facility you selected receives your information. We use encryption and follow healthcare privacy best practices to protect your data."
      },
      {
        question: "Can I speak to someone for help choosing a facility?",
        answer: "Yes, our support team is available 24/7 to help you navigate options, answer questions, and connect you with appropriate treatment centers. Visit our Request Help page to get personalized assistance. Our team understands this is a difficult time and provides compassionate, non-judgmental support."
      },
      {
        question: "How do treatment centers get listed on RehabLookup?",
        answer: "Treatment centers can apply to be listed on our platform. We review their licensing, accreditation, and credentials before approval. Listed facilities must meet our quality standards and maintain accurate information. Centers cannot pay for better placement or reviews. For more information, visit our For Providers page."
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
    
    // Remove existing script if present
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

  // Generate FAQ structured data
  const allFaqsForSchema = faqCategories.flatMap(cat => 
    cat.faqs.map(faq => ({ question: faq.question, answer: faq.answer }))
  );

  return (
    <Layout>
      <SEO
        title="Frequently Asked Questions About Addiction Treatment"
        description="Get answers to common questions about addiction treatment, insurance coverage, family support, recovery, and using RehabLookup to find the right rehab center."
        canonical="/faq"
        structuredData={generateFAQSchema(allFaqsForSchema)}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "FAQ", url: "/faq" },
        ]}
      />
      
      {/* Hero Section */}
      <section className="relative bg-primary py-12 px-4 md:py-16 md:px-6 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>
        
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10">
              <HelpCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Frequently Asked Questions</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              How Can We Help You?
            </h1>
            <p className="mb-6 text-base text-primary-foreground/80 leading-relaxed max-w-xl mx-auto md:text-lg">
              Find answers to common questions about addiction treatment, insurance, family support, and recovery.
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="relative mx-auto max-w-lg">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-xl border-0 bg-card pl-11 pr-11 text-sm shadow-xl placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <span className="sr-only">Clear search</span>
                    <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Search hint */}
              <p className="mt-2 text-xs text-primary-foreground/60">
                Try searching "insurance", "detox", or "family support"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md py-3 px-4 md:py-4 md:px-6 shadow-sm">
        <div className="container">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 md:flex-wrap md:justify-center md:overflow-visible md:pb-0 md:mx-0 md:px-0 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`h-9 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                selectedCategory === null 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All Topics
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
                className={`h-9 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                  selectedCategory === category.id 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <category.icon className="h-3.5 w-3.5" />
                {category.name}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  selectedCategory === category.id ? "bg-white/20" : "bg-background"
                }`}>
                  {category.faqs.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-10 px-4 md:py-14 md:px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          {/* Search Results Info */}
          {searchQuery && (
            <div className="mb-6 flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-sm">
                <Search className="h-3.5 w-3.5 text-accent" />
                <span className="text-muted-foreground">
                  Found <span className="font-semibold text-foreground">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for 
                  <span className="font-semibold text-foreground ml-1">"{searchQuery}"</span>
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
            <div className="mx-auto max-w-md text-center py-12">
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-foreground">No Results Found</h3>
              <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
                We couldn't find any questions matching your search. Try different keywords or browse by category.
              </p>
              <Button 
                onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                className="h-10 px-6 gap-2 text-sm"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                View All Questions
              </Button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-10">
              {filteredCategories.map((category, catIndex) => (
                <div 
                  key={category.id} 
                  className="animate-fade-in"
                  style={{ animationDelay: `${catIndex * 100}ms` }}
                >
                  {/* Category Header */}
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 ring-1 ring-accent/20">
                      <category.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-lg font-bold text-foreground">
                          {category.name}
                        </h2>
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {category.faqs.length} questions
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>

                  {/* Enhanced FAQ Accordion */}
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category.id}-${index}`}
                        className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:border-accent/30 hover:shadow-md data-[state=open]:border-accent/40 data-[state=open]:shadow-lg data-[state=open]:bg-gradient-to-br data-[state=open]:from-card data-[state=open]:to-accent/5"
                      >
                        <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline py-4 px-5 gap-3 [&>svg]:shrink-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground [&>svg]:transition-transform [&[data-state=open]>svg]:text-accent group-hover:text-accent transition-colors">
                          <span className="flex items-start gap-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-xs font-bold text-accent mt-0.5">
                              {index + 1}
                            </span>
                            <span>{faq.question}</span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-5 px-5 leading-relaxed">
                          <div className="pl-8 pt-1 border-l-2 border-accent/20 ml-3">
                            {faq.answer}
                          </div>
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
      <section className="py-12 px-4 bg-muted/30 md:py-16 md:px-6">
        <div className="container">
          <div className="mx-auto max-w-2xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 via-card to-accent/10 p-8 md:p-10 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-primary/5 rounded-full blur-xl" />
            
            <div className="relative">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-lg">
                <HelpCircle className="h-6 w-6 text-white" />
              </div>
              <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
                Still Have Questions?
              </h2>
              <p className="mb-6 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Our compassionate support team is here to answer your questions and help you find the right treatment center for your needs.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/request-help?source=faq_cta">
                  <Button size="default" className="h-10 gap-2 text-sm font-semibold px-6 hover:scale-105 transition-transform">
                    <Heart className="h-4 w-4" />
                    Request Help
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="default" className="h-10 gap-2 text-sm font-semibold px-6 hover:scale-105 transition-transform">
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