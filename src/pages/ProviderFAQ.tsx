import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle, ArrowRight, Building2, CreditCard, Shield, Users,
  BarChart3, Settings, MessageSquare, Search, X, CheckCircle,
  Sparkles, TrendingUp, Zap,
} from "lucide-react";
import heroImg from "@/assets/images/faq-hero-provider.jpg";

const faqCategories = [
  {
    id: "getting-started",
    icon: Building2,
    title: "Getting Started",
    description: "Registration, verification & onboarding",
    faqs: [
      { question: "How do I list my treatment center on RehabLookup?", answer: "Click 'List Your Facility' and complete our registration form with your facility details. Our team will review your submission and verify your credentials within 2-3 business days. Once approved, your listing goes live immediately." },
      { question: "What information do I need to create a listing?", answer: "You'll need your facility name, address, contact information, licensing details, treatment programs offered, accepted insurance providers, and high-quality photos of your facility. The more complete your profile, the better your visibility in search results." },
      { question: "How long does the verification process take?", answer: "Verification typically takes 2-3 business days. We verify your state licensing, accreditations, and facility credentials. You'll receive an email notification once your listing is approved and live on the platform." },
      { question: "Is it free to list my facility?", answer: "Yes, listing your facility is completely free. You only pay when you choose to unlock an inquiry to connect with a family. There are no monthly fees or hidden costs. An optional Pro upgrade is available for enhanced visibility and discounts on unlocks." },
    ],
  },
  {
    id: "managing-listing",
    icon: Settings,
    title: "Managing Your Listing",
    description: "Profile updates, photos & status",
    faqs: [
      { question: "How do I update my facility information?", answer: "Log into your provider dashboard and navigate to 'Listing' to update your facility details, photos, treatment programs, and contact information. Changes are typically reviewed within 24 hours." },
      { question: "Can I add multiple facility locations?", answer: "Yes, if you operate multiple treatment centers, you can add each location separately from your provider dashboard. Each facility will have its own profile, analytics, and lead management." },
      { question: "How do I add or change photos?", answer: "Go to your provider dashboard, select your facility, and click 'Manage Photos'. You can upload up to 20 high-quality images. We recommend including exterior shots, common areas, treatment rooms, and amenity photos." },
      { question: "Can I pause my listing temporarily?", answer: "Yes, you can temporarily pause your listing from the dashboard settings. This is useful during renovations or capacity limitations. Your listing data and analytics will be preserved for when you're ready to reactivate." },
    ],
  },
  {
    id: "inquiries-management",
    icon: Users,
    title: "Inquiries & Contacts",
    description: "Receiving and managing patient leads",
    faqs: [
      { question: "How do I receive and respond to inquiries?", answer: "When a family expresses interest in your facility, you'll receive a notification with basic details. To view their full contact information and respond, you unlock the inquiry. Unlocked inquiries appear in your dashboard with complete details." },
      { question: "What information is included in an inquiry?", answer: "Before unlocking, you see treatment needs, insurance type, location preference, and urgency level. After unlocking, you get full contact details including name, phone, email, and any additional message from the family." },
      { question: "How does the unlock system work?", answer: "When you see an inquiry that matches your facility, you can choose to unlock it to view full contact details. You only pay for inquiries you decide to pursue. Pro members receive 20% off all unlocks." },
      { question: "Can I set up inquiry notifications?", answer: "Yes, you can customize your notification preferences in the dashboard settings. Options include instant email alerts, SMS notifications, and daily digest emails so you never miss a potential admission." },
    ],
  },
  {
    id: "billing-credits",
    icon: CreditCard,
    title: "Billing & Credits",
    description: "Payments, pricing & Pro upgrade",
    faqs: [
      { question: "How does billing work?", answer: "Listing is free. You purchase credits to unlock inquiries, or pay per unlock. Pro Visibility is an optional monthly upgrade for enhanced placement and 20% off all unlocks. All payments are processed securely through Stripe." },
      { question: "What payment methods do you accept?", answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover). Credits can be purchased in packages and never expire. All payments are processed securely through Stripe." },
      { question: "What is Pro Visibility?", answer: "Pro Visibility is an optional upgrade that gives you featured placement on homepage, state, and city pages plus 20% off every inquiry unlock. It's designed for facilities that want maximum exposure and savings." },
      { question: "Can I get a refund for unused credits?", answer: "Credits are non-refundable but never expire. If you have concerns about a specific inquiry quality, contact our support team and we'll review it. We stand behind the quality of our inquiries." },
    ],
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analytics & Performance",
    description: "Tracking results & ROI",
    faqs: [
      { question: "What analytics are available?", answer: "Your dashboard includes profile views, unique visitors, lead rates, conversion metrics, and engagement trends. Premium plans include advanced analytics with demographic insights, referral sources, and competitive benchmarking." },
      { question: "How often is analytics data updated?", answer: "Analytics data is updated in real-time for views and leads. Aggregated reports and trend analysis are refreshed daily. You can export data for custom reporting at any time." },
      { question: "Can I see where my traffic comes from?", answer: "Yes, the analytics dashboard shows traffic sources including organic search, direct visits, and referral links. Premium plans include detailed source attribution and campaign tracking capabilities." },
    ],
  },
  {
    id: "verification-trust",
    icon: Shield,
    title: "Verification & Trust",
    description: "Badges, accreditations & credibility",
    faqs: [
      { question: "What does the verified badge mean?", answer: "The verified badge indicates that we've confirmed your facility's licensing, accreditations, and credentials. Verified listings receive higher visibility and increased trust from families searching for treatment." },
      { question: "How do I get my facility verified?", answer: "Verification is included with all listings. During registration, you'll provide your licensing information and any accreditations. Our team verifies this information with the relevant authorities." },
      { question: "What accreditations do you recognize?", answer: "We recognize major accrediting bodies including JCAHO, CARF, LegitScript, and state-specific licensing authorities. All recognized accreditations are displayed on your facility profile." },
    ],
  },
  {
    id: "support",
    icon: MessageSquare,
    title: "Support & Help",
    description: "Getting assistance from our team",
    faqs: [
      { question: "How can I contact support?", answer: "You can reach our provider support team via email at providers@rehablookup.com, through live chat in your dashboard, or by visiting our support page. Business hours are Monday-Friday, 9am-6pm EST." },
      { question: "Do you offer onboarding assistance?", answer: "Yes, all new providers receive onboarding support including profile optimization tips, best practices guidance, and a welcome call to answer any questions. Premium plans include dedicated account management." },
      { question: "Where can I find training resources?", answer: "Visit our Provider Resources page for guides, best practices, and optimization tips. We also offer webinars and documentation to help you get the most out of your listing." },
    ],
  },
];

export default function ProviderFAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const cats = activeCategory
      ? faqCategories.filter((c) => c.id === activeCategory)
      : faqCategories;

    if (!searchQuery.trim()) return cats;

    const q = searchQuery.toLowerCase();
    return cats
      .map((c) => ({
        ...c,
        faqs: c.faqs.filter(
          (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((c) => c.faqs.length > 0);
  }, [searchQuery, activeCategory]);

  const totalResults = filteredCategories.reduce((a, c) => a + c.faqs.length, 0);

  const allFaqsForSchema = faqCategories.flatMap((c) =>
    c.faqs.map((f) => ({ question: f.question, answer: f.answer }))
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SEO
        title="Provider FAQ — Treatment Center Questions | RehabLookup"
        description="Answers to common questions about listing your treatment center, managing inquiries, billing, analytics, and growing admissions on RehabLookup."
        canonical="/provider-faq"
        structuredData={generateFAQSchema(allFaqsForSchema)}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
          { name: "Provider FAQ", url: "/provider-faq" },
        ]}
      />

      <main className="flex-1">
        {/* Hero — Split Screen */}
        <section className="relative bg-primary overflow-hidden">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-0 items-stretch min-h-[340px]">
              {/* Left */}
              <div className="flex flex-col justify-center py-12 lg:py-16 lg:pr-12 relative z-10">
                <nav className="mb-4">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Home</Link>
                    <span className="text-primary-foreground/40">/</span>
                    <Link to="/for-providers" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">Providers</Link>
                    <span className="text-primary-foreground/40">/</span>
                    <span className="text-primary-foreground font-medium">FAQ</span>
                  </span>
                </nav>
                <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-full px-4 py-1.5 mb-5 w-fit">
                  <Building2 className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium text-primary-foreground">For Treatment Centers</span>
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-primary-foreground mb-4 leading-tight">
                  Provider FAQ
                </h1>
                <p className="text-base text-primary-foreground/80 leading-relaxed max-w-lg mb-6">
                  Everything you need to know about listing your facility, managing inquiries, billing, and growing your admissions on RehabLookup.
                </p>

                {/* Search */}
                <div className="relative max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    type="text"
                    placeholder="Search provider questions…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 rounded-xl border-0 bg-card pl-11 pr-10 text-sm shadow-xl placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors z-10"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Image */}
              <div className="hidden lg:block relative">
                <img
                  src={heroImg}
                  alt="Provider dashboard analytics"
                  className="absolute inset-0 w-full h-full object-cover"
                  width={800}
                  height={600}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* Value Props Bar */}
        <section className="border-b border-border bg-card py-4">
          <div className="container">
            <div className="flex items-center justify-center gap-8 md:gap-14 text-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-foreground">Free Listing</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-foreground">Grow Admissions</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-foreground">Real-Time Analytics</span>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-foreground">Verified Badge</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content — Sidebar + FAQ */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-background to-muted/20">
          <div className="container">
            {/* Search results */}
            {searchQuery && (
              <div className="mb-8 flex items-center justify-center gap-3">
                <div className="flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm">
                  <Search className="h-3.5 w-3.5 text-accent" />
                  <span className="text-muted-foreground">
                    Found <span className="font-semibold text-foreground">{totalResults}</span> result{totalResults !== 1 ? "s" : ""}
                  </span>
                </div>
                <button onClick={() => setSearchQuery("")} className="text-sm text-primary hover:underline">Clear</button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-10">
              {/* Sidebar */}
              <aside className="lg:w-64 shrink-0">
                <div className="lg:sticky lg:top-24">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Topics</h3>
                  <nav className="space-y-1">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                        !activeCategory ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <HelpCircle className="h-4 w-4 shrink-0" />
                      All Topics
                    </button>
                    {faqCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                        className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                          activeCategory === cat.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <cat.icon className="h-4 w-4 shrink-0" />
                        {cat.title}
                        <span className="ml-auto text-xs opacity-70">{cat.faqs.length}</span>
                      </button>
                    ))}
                  </nav>

                  {/* Provider CTA */}
                  <div className="mt-8 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <p className="text-sm font-semibold text-foreground">Ready to List?</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      Join 500+ facilities growing their admissions on RehabLookup.
                    </p>
                    <Link to="/provider-signup">
                      <Button size="sm" className="w-full gap-1.5 h-9 text-xs font-semibold">
                        List Your Facility <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </aside>

              {/* FAQ Content */}
              <div className="flex-1 min-w-0">
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">No Results Found</h3>
                    <p className="text-sm text-muted-foreground mb-6">Try different keywords or browse all topics.</p>
                    <Button onClick={() => { setSearchQuery(""); setActiveCategory(null); }} variant="outline" className="gap-2">
                      View All Questions
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {filteredCategories.map((category) => (
                      <div key={category.id} id={category.id} className="scroll-mt-32">
                        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                            <category.icon className="h-4.5 w-4.5 text-accent" />
                          </div>
                          <div>
                            <h2 className="text-lg font-display font-bold text-foreground">{category.title}</h2>
                            <p className="text-xs text-muted-foreground">{category.description}</p>
                          </div>
                        </div>

                        <Accordion type="single" collapsible className="space-y-2">
                          {category.faqs.map((faq, index) => (
                            <AccordionItem
                              key={index}
                              value={`${category.id}-${index}`}
                              className="group border border-border rounded-xl bg-card overflow-hidden transition-all hover:border-accent/20 data-[state=open]:border-accent/30 data-[state=open]:shadow-sm"
                            >
                              <AccordionTrigger className="text-left py-4 px-5 gap-3 hover:no-underline [&>svg]:shrink-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground [&[data-state=open]>svg]:text-accent">
                                <span className="text-sm font-semibold text-foreground leading-snug group-hover:text-accent transition-colors">
                                  {faq.question}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="px-5 pb-5">
                                <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-10 bg-muted/30">
          <div className="container">
            <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/5 via-card to-accent/10 p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-3xl" />
              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 shrink-0">
                    <MessageSquare className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-foreground mb-1">Still Have Questions?</h2>
                    <p className="text-sm text-muted-foreground">Our provider support team is here to help.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-13 md:ml-0">
                  <Link to="/provider-support">
                    <Button className="gap-2 font-semibold">
                      Contact Support <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/providers/resources">
                    <Button variant="outline" className="font-semibold">
                      Resources
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
