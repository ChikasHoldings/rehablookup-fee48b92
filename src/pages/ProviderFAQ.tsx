import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  ArrowRight,
  Building2,
  CreditCard,
  Shield,
  Users,
  BarChart3,
  Settings,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import { providerNavLinks } from "@/data/providerNavLinks";

const faqCategories = [
  {
    id: "getting-started",
    icon: Building2,
    title: "Getting Started",
    faqs: [
      {
        question: "How do I list my treatment center on RehabLookup?",
        answer: "Getting started is easy. Click 'List Your Facility' and complete our registration form with your facility details. Our team will review your submission and verify your credentials within 2-3 business days. Once approved, your listing goes live immediately.",
      },
      {
        question: "What information do I need to create a listing?",
        answer: "You'll need your facility name, address, contact information, licensing details, treatment programs offered, accepted insurance providers, and high-quality photos of your facility. The more complete your profile, the better your visibility in search results.",
      },
      {
        question: "How long does the verification process take?",
        answer: "Verification typically takes 2-3 business days. We verify your state licensing, accreditations, and facility credentials. You'll receive an email notification once your listing is approved and live on the platform.",
      },
      {
        question: "Is there a free listing option?",
        answer: "Yes, we offer a free basic listing that includes your facility profile, contact information, and basic program details. Premium plans offer additional features like featured placement, enhanced analytics, and priority support.",
      },
    ],
  },
  {
    id: "managing-listing",
    icon: Settings,
    title: "Managing Your Listing",
    faqs: [
      {
        question: "How do I update my facility information?",
        answer: "Log into your provider dashboard and navigate to 'Listing' to update your facility details, photos, treatment programs, and contact information. Changes are typically reviewed within 24 hours.",
      },
      {
        question: "Can I add multiple facility locations?",
        answer: "Yes, if you operate multiple treatment centers, you can add each location separately from your provider dashboard. Each facility will have its own profile, analytics, and lead management.",
      },
      {
        question: "How do I add or change photos?",
        answer: "Go to your provider dashboard, select your facility, and click 'Manage Photos'. You can upload up to 20 high-quality images. We recommend including exterior shots, common areas, treatment rooms, and amenity photos.",
      },
      {
        question: "Can I pause my listing temporarily?",
        answer: "Yes, you can temporarily pause your listing from the dashboard settings. This is useful during renovations or capacity limitations. Your listing data and analytics will be preserved for when you're ready to reactivate.",
      },
    ],
  },
  {
    id: "leads-management",
    icon: Users,
    title: "Leads & Contacts",
    faqs: [
      {
        question: "How do I receive and respond to leads?",
        answer: "All leads are sent directly to your registered email and appear in your provider dashboard. You can respond via email or use our built-in messaging system. We recommend responding within 1 hour for the best conversion rates.",
      },
      {
        question: "What information is included in a lead?",
        answer: "Each lead includes the contact's name, phone number, email, preferred contact method, insurance information (if provided), treatment needs, and any additional message. You can also see the lead's urgency level and qualification status.",
      },
      {
        question: "How are leads distributed?",
        answer: "Leads are distributed based on the family's selected preferences, your facility's location, treatment specialties, and insurance acceptance. Featured listings receive priority placement and additional lead visibility.",
      },
      {
        question: "Can I set up lead notifications?",
        answer: "Yes, you can customize your notification preferences in the dashboard settings. Options include instant email alerts, SMS notifications, daily digest emails, and browser push notifications.",
      },
    ],
  },
  {
    id: "billing-plans",
    icon: CreditCard,
    title: "Billing & Plans",
    faqs: [
      {
        question: "What plans are available?",
        answer: "We offer Basic (free), Professional, and Premium plans. Each tier includes different features like enhanced visibility, analytics, lead limits, and support levels. Visit our pricing page or contact sales for detailed comparisons.",
      },
      {
        question: "How does billing work?",
        answer: "Paid plans are billed monthly or annually (with a discount for annual billing). You can upgrade, downgrade, or cancel your plan at any time from your billing settings. Changes take effect at the next billing cycle.",
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover) and can arrange ACH transfers for annual enterprise agreements. All payments are processed securely through Stripe.",
      },
      {
        question: "Can I get a refund if I'm not satisfied?",
        answer: "We offer a 14-day money-back guarantee for new paid subscriptions. If you're not satisfied within the first 14 days, contact our support team for a full refund.",
      },
    ],
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analytics & Performance",
    faqs: [
      {
        question: "What analytics are available?",
        answer: "Your dashboard includes profile views, unique visitors, lead rates, conversion metrics, and engagement trends. Premium plans include advanced analytics with demographic insights, referral sources, and competitive benchmarking.",
      },
      {
        question: "How often is analytics data updated?",
        answer: "Analytics data is updated in real-time for views and leads. Aggregated reports and trend analysis are refreshed daily. You can export data for custom reporting at any time.",
      },
      {
        question: "Can I see where my traffic comes from?",
        answer: "Yes, the analytics dashboard shows traffic sources including organic search, direct visits, and referral links. Premium plans include detailed source attribution and campaign tracking capabilities.",
      },
    ],
  },
  {
    id: "verification-trust",
    icon: Shield,
    title: "Verification & Trust",
    faqs: [
      {
        question: "What does the verified badge mean?",
        answer: "The verified badge indicates that we've confirmed your facility's licensing, accreditations, and credentials. Verified listings receive higher visibility and increased trust from families searching for treatment.",
      },
      {
        question: "How do I get my facility verified?",
        answer: "Verification is included with all listings. During registration, you'll provide your licensing information and any accreditations. Our team verifies this information with the relevant authorities.",
      },
      {
        question: "What accreditations do you recognize?",
        answer: "We recognize major accrediting bodies including JCAHO, CARF, LegitScript, and state-specific licensing authorities. All recognized accreditations are displayed on your facility profile.",
      },
    ],
  },
  {
    id: "support",
    icon: MessageSquare,
    title: "Support & Help",
    faqs: [
      {
        question: "How can I contact support?",
        answer: "You can reach our provider support team via email at providers@rehablookup.com, through live chat in your dashboard, or by visiting our support page. Business hours are Monday-Friday, 9am-6pm EST.",
      },
      {
        question: "Do you offer onboarding assistance?",
        answer: "Yes, all new providers receive onboarding support including profile optimization tips, best practices guidance, and a welcome call to answer any questions. Premium plans include dedicated account management.",
      },
      {
        question: "Where can I find training resources?",
        answer: "Visit our Provider Resources page for guides, best practices, and optimization tips. We also offer webinars and documentation to help you get the most out of your listing.",
      },
    ],
  },
];

export default function ProviderFAQ() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return faqCategories;

    const query = searchQuery.toLowerCase().trim();
    
    return faqCategories
      .map((category) => ({
        ...category,
        faqs: category.faqs.filter(
          (faq) =>
            faq.question.toLowerCase().includes(query) ||
            faq.answer.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.faqs.length > 0);
  }, [searchQuery]);

  const totalResults = filteredCategories.reduce(
    (acc, cat) => acc + cat.faqs.length,
    0
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="Provider FAQ - Common Questions for Treatment Centers"
        description="Find answers to frequently asked questions about listing your treatment center on RehabLookup. Learn about verification, leads, billing, and more."
        canonical="/provider-faq"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
          { name: "FAQ", url: "/provider-faq" },
        ]}
      />

      <Header
        navLinks={providerNavLinks}
        ctaLink="/provider-login"
        ctaLabel="Provider Login"
        variant="provider"
      />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-muted/40 to-background py-12 md:py-16">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

          <div className="container relative z-10 px-5 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <div className="mb-4 md:mb-4 inline-flex items-center gap-2.5 md:gap-2 rounded-full bg-accent/10 px-5 md:px-4 py-2.5 md:py-1.5">
                <HelpCircle className="h-5 w-5 md:h-4 md:w-4 text-accent" />
                <span className="text-base md:text-sm font-medium text-accent">Provider FAQ</span>
              </div>
              <h1 className="mb-4 md:mb-3 font-display text-3xl md:text-3xl lg:text-4xl font-bold text-foreground">
                Frequently Asked Questions
              </h1>
              <p className="text-lg md:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
                Find answers to common questions about listing your treatment center, managing leads, billing, and more.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 md:gap-3 sm:flex-row">
                <Link to="/provider-signup" className="w-full sm:w-auto">
                  <Button size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                    Get Started
                    <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
                  </Button>
                </Link>
                <Link to="/provider-support" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                    Contact Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Quick Navigation */}
        <section className="border-b border-border bg-card py-6 sticky top-0 z-40">
          <div className="container px-5 md:px-6">
            {/* Search Bar */}
            <div className="max-w-xl mx-auto mb-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-10 h-12 rounded-xl text-base"
                  maxLength={100}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {totalResults === 0
                    ? "No results found"
                    : `Found ${totalResults} result${totalResults === 1 ? "" : "s"}`}
                </p>
              )}
            </div>

            {/* Category Navigation - hide when searching */}
            {!searchQuery && (
              <div className="flex flex-wrap justify-center gap-2">
                {faqCategories.map((category) => (
                  <a
                    key={category.id}
                    href={`#${category.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-accent/30 hover:bg-accent/5 hover:text-accent"
                  >
                    <category.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{category.title}</span>
                    <span className="sm:hidden">{category.title.split(' ')[0]}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="py-16 md:py-20">
          <div className="container px-5 md:px-6">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  No Results Found
                </h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search terms or browse all categories.
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="space-y-12">
                {filteredCategories.map((category) => (
                  <div key={category.id} id={category.id} className="scroll-mt-24">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                        <category.icon className="h-5 w-5 text-accent" />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-foreground">
                        {category.title}
                      </h2>
                      {searchQuery && (
                        <span className="text-sm text-muted-foreground">
                          ({category.faqs.length} result{category.faqs.length === 1 ? "" : "s"})
                        </span>
                      )}
                    </div>

                    <Accordion type="single" collapsible className="space-y-3" defaultValue={searchQuery ? `${category.id}-0` : undefined}>
                      {category.faqs.map((faq, index) => (
                        <AccordionItem
                          key={index}
                          value={`${category.id}-${index}`}
                          className="rounded-xl border border-border bg-card px-6 data-[state=open]:shadow-sm data-[state=open]:border-accent/20 transition-all"
                        >
                          <AccordionTrigger className="text-left font-display text-base font-semibold text-foreground hover:no-underline hover:text-accent py-5 transition-colors">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
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

        {/* CTA Section */}
        <section className="py-16 md:py-20">
          <div className="container px-5 md:px-6">
            <div className="mx-auto max-w-3xl rounded-2xl md:rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-8 lg:p-12 text-center">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20">
                <MessageSquare className="h-7 w-7 text-accent" />
              </div>
              <h2 className="mb-4 md:mb-3 font-display text-2xl md:text-xl lg:text-2xl font-bold text-foreground">
                Still Have Questions?
              </h2>
              <p className="mb-8 md:mb-6 text-lg md:text-base text-muted-foreground max-w-xl mx-auto">
                Our dedicated provider support team is here to help. Reach out and we'll get back to you within 24 hours.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 md:gap-3 sm:flex-row">
                <Link to="/provider-support" className="w-full sm:w-auto">
                  <Button size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                    Contact Support
                    <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
                  </Button>
                </Link>
                <Link to="/provider-resources" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                    View Resources
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}
