import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { SEO } from "@/components/SEO";
import {
  Building2,
  Users,
  TrendingUp,
  Shield,
  CheckCircle,
  ArrowRight,
  Star,
  MessageSquare,
  BarChart3,
  Clock,
  Zap,
  Award,
  BadgeCheck,
  Phone,
  Check,
  Unlock,
  Crown,
  DollarSign,
  Eye,
  Target,
} from "lucide-react";
import { providerNavLinks } from "@/data/providerNavLinks";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import providerDashboardMockup from "@/assets/provider-dashboard-mockup.jpg";
import providerAvatar1 from "@/assets/avatars/provider-avatar-1.jpg";
import providerAvatar2 from "@/assets/avatars/provider-avatar-2.jpg";
import providerAvatar3 from "@/assets/avatars/provider-avatar-3.jpg";
import providerAvatar4 from "@/assets/avatars/provider-avatar-4.jpg";
import testimonialSarah from "@/assets/testimonials/testimonial-sarah.jpg";
import testimonialMichael from "@/assets/testimonials/testimonial-michael.jpg";
import testimonialJennifer from "@/assets/testimonials/testimonial-jennifer.jpg";

const providerAvatars = [providerAvatar1, providerAvatar2, providerAvatar3, providerAvatar4];

const ForProviders = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="List Your Rehab Center Free - For Providers | RehabLookup"
        description="List your treatment center for free on RehabLookup. Receive inquiries from families seeking care and pay only when you choose to connect."
        canonical="/for-providers"
        keywords={[
          "list rehab center free",
          "treatment center marketing",
          "addiction treatment referrals",
          "rehab facility listing",
          "treatment center directory",
          "behavioral health marketing"
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "RehabLookup Provider Listing Service",
          serviceType: "Treatment Center Directory Listing",
          provider: {
            "@type": "Organization",
            name: "RehabLookup",
          },
          description: "List your treatment center for free and connect with families actively seeking addiction recovery services",
          areaServed: {
            "@type": "Country",
            name: "United States",
          },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
        ]}
      />
      
      <Header
        navLinks={providerNavLinks}
        ctaLink="/provider-signup"
        ctaLabel="List Free"
        variant="provider"
      />
      
      <main className="flex-1">
        {/* Hero Section - Clean & Focused */}
        <section className="relative bg-slate-900 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          
          <div className="container relative z-10 px-5 md:px-6 py-16 md:py-24">
            <div className="max-w-4xl mx-auto text-center">
              {/* Trust indicator */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 mb-8">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-white/90">Trusted by 500+ Treatment Centers Nationwide</span>
              </div>

              <h1 className="mb-6 text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                List Your Facility for Free.
                <span className="block text-emerald-400 mt-2">Connect With Families Ready for Treatment.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
                Get discovered by families actively searching for care. No monthly fees, no contracts—pay only when you choose to connect with an inquiry.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-10">
                <Link to="/provider-signup">
                  <Button size="lg" className="gap-2 h-14 px-10 text-base font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all">
                    List Your Facility Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="lg" className="gap-2 h-14 px-8 text-base font-semibold border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                    <Phone className="h-5 w-5" />
                    Schedule a Demo
                  </Button>
                </Link>
              </div>

              {/* Value props row */}
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Free to List</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>No Monthly Fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Pay Per Inquiry</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span>Cancel Anytime</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-b border-border bg-muted/30 py-10">
          <div className="container px-5 md:px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center max-w-4xl mx-auto">
              {[
                { value: "10K+", label: "Families Helped Monthly", icon: Users },
                { value: "500+", label: "Verified Partners", icon: Building2 },
                { value: "50", label: "States Covered", icon: Target },
                { value: "40%", label: "Avg. Admission Increase", icon: TrendingUp },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <stat.icon className="h-5 w-5 text-primary" />
                    <span className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works - Clean 4-Step */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container px-5 md:px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">How It Works</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Start Receiving Inquiries in 4 Simple Steps
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                No complicated setup. Create your listing and start connecting with families today.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
              {[
                { step: 1, title: "Create Your Listing", description: "Sign up and add your facility details, photos, and services.", icon: Building2 },
                { step: 2, title: "Get Verified", description: "Our team reviews your listing to ensure quality and accuracy.", icon: BadgeCheck },
                { step: 3, title: "Receive Inquiries", description: "Families discover your facility and submit inquiries.", icon: MessageSquare },
                { step: 4, title: "Connect & Convert", description: "Unlock inquiries you want and reach out directly.", icon: Phone },
              ].map((item, index) => (
                <div key={item.step} className="relative">
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-3rem)] border-t-2 border-dashed border-border" />
                  )}
                  <div className="relative bg-card border border-border rounded-xl p-6 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                        {item.step}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mx-auto mb-4">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Value Proposition - Why Choose Us */}
        <section className="py-16 md:py-24 bg-muted/30 border-y border-border">
          <div className="container px-5 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 items-center max-w-6xl mx-auto">
              <div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Why RehabLookup</p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                  Built for Treatment Centers That Want Real Results
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Unlike lead aggregators that sell the same contact to multiple facilities, our inquiries come directly from families who found your listing and expressed interest in your specific program.
                </p>
                
                <div className="space-y-4">
                  {[
                    { icon: Target, title: "High-Intent Inquiries", desc: "Families actively seeking treatment, not cold lists" },
                    { icon: Eye, title: "Maximum Visibility", desc: "Get discovered in search results and state directories" },
                    { icon: Zap, title: "Instant Notifications", desc: "Real-time alerts when families show interest" },
                    { icon: BarChart3, title: "Analytics Dashboard", desc: "Track views, inquiries, and conversion metrics" },
                    { icon: DollarSign, title: "Transparent Pricing", desc: "Pay only for inquiries you choose to unlock" },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl" />
                <img 
                  src={providerDashboardMockup} 
                  alt="Provider Dashboard"
                  className="relative rounded-xl shadow-xl border border-border w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Model - Simple & Clear */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container px-5 md:px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Simple Pricing</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Free to List. Pay Only When You Connect.
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                No monthly fees, no contracts. You're in complete control.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {/* Free Listing */}
              <div className="bg-card border border-border rounded-xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-foreground">Free Listing</h3>
                    <p className="text-sm text-muted-foreground">No cost to get started</p>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-6">
                  {[
                    "Full facility profile with photos",
                    "Appear in search results",
                    "Receive inquiry notifications",
                    "Basic analytics dashboard",
                    "Email support",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Pay per inquiry when you unlock contact details
                </p>
                
                <Link to="/provider-signup">
                  <Button variant="outline" className="w-full h-12">
                    Get Started Free
                  </Button>
                </Link>
              </div>

              {/* Pro Visibility */}
              <div className="bg-slate-900 text-white rounded-xl p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <span className="text-xs font-semibold bg-emerald-500 text-white px-2 py-1 rounded-full">
                    Popular
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
                    <Crown className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">Pro Visibility</h3>
                    <p className="text-sm text-white/60">$149/month</p>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-6">
                  {[
                    "Everything in Free, plus:",
                    "20% off every inquiry unlock",
                    "Featured on homepage",
                    "Priority in search results",
                    "Gold Pro badge on listing",
                    "Priority support",
                  ].map((feature, idx) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <Check className={cn("h-4 w-4 shrink-0", idx === 0 ? "text-white/40" : "text-emerald-400")} />
                      <span className={idx === 0 ? "text-white/60" : "text-white"}>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/provider-signup">
                  <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white">
                    Start Free, Upgrade Later
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials - Clean Grid */}
        <section className="py-16 md:py-24 bg-muted/30 border-y border-border">
          <div className="container px-5 md:px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Success Stories</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Trusted by Leading Treatment Centers
              </h2>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span>4.9/5 from 500+ reviews</span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {[
                {
                  quote: "RehabLookup transformed our admissions. We saw a 40% increase in qualified inquiries within three months.",
                  author: "Dr. Sarah Mitchell",
                  role: "Clinical Director",
                  facility: "Sunrise Recovery Center",
                  avatar: testimonialSarah,
                  metric: "+40%",
                },
                {
                  quote: "The quality of referrals is exceptional. Families arrive informed and ready to begin treatment.",
                  author: "Michael Torres",
                  role: "Admissions Director",
                  facility: "New Horizons Treatment",
                  avatar: testimonialMichael,
                  metric: "95%",
                },
                {
                  quote: "The pay-per-inquiry model means we only pay for real opportunities. Best decision we made.",
                  author: "Jennifer Adams",
                  role: "Marketing Manager",
                  facility: "Coastal Wellness Center",
                  avatar: testimonialJennifer,
                  metric: "2x ROI",
                },
              ].map((testimonial) => (
                <div key={testimonial.author} className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <blockquote className="text-foreground mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.author}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-foreground text-sm">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{testimonial.metric}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container px-5 md:px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">FAQ</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Common Questions
              </h2>
            </div>

            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="space-y-3">
                {[
                  {
                    q: "Is it really free to list my facility?",
                    a: "Yes, creating your listing is completely free. You only pay when you choose to unlock an inquiry to view contact details. No monthly fees, setup fees, or hidden charges."
                  },
                  {
                    q: "How does the inquiry unlock system work?",
                    a: "When a family expresses interest, you'll see basic details about their needs. If you'd like to connect, unlock the inquiry to view their full contact information and reach out directly. You control which inquiries you pursue."
                  },
                  {
                    q: "What kind of inquiry quality can I expect?",
                    a: "Our inquiries come from families actively seeking treatment—not cold prospects. Each includes verified contact information, treatment preferences, insurance details, and urgency level."
                  },
                  {
                    q: "How long does it take to get started?",
                    a: "Most providers complete their profile and go live in under 10 minutes. Simply create an account, add your facility details and photos, then submit for verification."
                  },
                  {
                    q: "What is Pro Visibility?",
                    a: "Pro is an optional upgrade that gives you premium placement (homepage, top of search results) and 20% off every inquiry unlock. Start free and upgrade anytime."
                  },
                ].map((faq) => (
                  <AccordionItem key={faq.q} value={faq.q} className="border border-border rounded-lg px-5 bg-card">
                    <AccordionTrigger className="text-left text-foreground font-medium hover:no-underline py-4">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-24 bg-slate-900 text-white">
          <div className="container px-5 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Connect With More Families?
              </h2>
              <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
                Join 500+ treatment centers already growing their admissions with RehabLookup.
              </p>
              
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center mb-8">
                <Link to="/provider-signup">
                  <Button size="lg" className="gap-2 h-14 px-10 text-base font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">
                    List Your Facility Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
              
              <p className="text-sm text-white/50">
                No credit card required • Free to list • Pay only when you connect
              </p>
              
              {/* Social proof */}
              <div className="flex items-center justify-center gap-3 mt-8">
                <div className="flex -space-x-2">
                  {providerAvatars.map((avatar, i) => (
                    <img 
                      key={i} 
                      src={avatar} 
                      alt={`Provider ${i + 1}`}
                      className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover"
                    />
                  ))}
                </div>
                <span className="text-sm text-white/60">500+ facilities trust RehabLookup</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
      <BackToTop />
    </div>
  );
};

export default ForProviders;
