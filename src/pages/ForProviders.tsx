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
  BadgeCheck,
  Eye,
  Target,
  Heart,
  Globe,
  Sparkles,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import providerHero from "@/assets/provider-hero.jpg";
import providerTeam from "@/assets/provider-team.jpg";
import providerFacility from "@/assets/provider-facility.jpg";
import providerDashboardScreenshot from "@/assets/provider-dashboard-screenshot.png";
import testimonialSarah from "@/assets/testimonials/testimonial-sarah.jpg";
import testimonialMichael from "@/assets/testimonials/testimonial-michael.jpg";
import testimonialJennifer from "@/assets/testimonials/testimonial-jennifer.jpg";

const ForProviders = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="List Your Rehab Center Free | RehabLookup for Providers"
        description="List your treatment center for free on RehabLookup. Connect with families actively seeking care and grow your admissions."
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
      
      <Header />
      
      <main className="flex-1">
        {/* Hero Section - Image background like homepage */}
        <section className="relative z-10">
          <link rel="preload" as="image" href={providerHero} />
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${providerHero})` }}
          />
          
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/75" />

          {/* Content */}
          <div className="container relative py-16 md:py-20 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              {/* Trust indicator */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 mb-6 animate-fade-in">
                <Shield className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-white/90">Trusted by 500+ Treatment Centers Nationwide</span>
              </div>

              {/* Headline */}
              <h1 className="mb-4 font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl animate-fade-in" style={{ animationDelay: "50ms" }}>
                Grow Your Admissions with Qualified Families
              </h1>

              {/* Subheadline */}
              <p className="mb-8 text-base md:text-lg text-white/85 animate-fade-in max-w-2xl mx-auto leading-relaxed" style={{ animationDelay: "100ms" }}>
                List your facility on the largest treatment center directory and connect with families actively searching for care.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: "150ms" }}>
                <Link to="/provider-signup">
                  <Button size="lg" className="gap-2 h-14 px-10 text-base font-semibold shadow-lg transition-all">
                    List Your Facility Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/provider-resources">
                  <Button variant="outline" size="lg" className="gap-2 h-14 px-8 text-base font-semibold border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm">
                    Learn More
                  </Button>
                </Link>
              </div>

              {/* Value props row */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-white/70 mt-10 animate-fade-in" style={{ animationDelay: "200ms" }}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span>Free to List</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span>Verified Families</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span>Quick Setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span>Nationwide Reach</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-b border-border bg-primary text-primary-foreground py-8">
          <div className="container px-5 md:px-6">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 text-center max-w-4xl mx-auto">
              {[
                { value: "10K+", label: "Families Helped Monthly", icon: Users },
                { value: "500+", label: "Verified Partners", icon: Building2 },
                { value: "50", label: "States Covered", icon: Globe },
                { value: "40%", label: "Avg. Admission Increase", icon: TrendingUp },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <stat.icon className="h-4 w-4 text-accent" />
                    <span className="text-2xl md:text-3xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-xs md:text-sm text-primary-foreground/80">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
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
                { step: 3, title: "Get Discovered", description: "Families find your facility through search and directories.", icon: Eye },
                { step: 4, title: "Connect Directly", description: "Reach out to interested families and grow your census.", icon: MessageSquare },
              ].map((item, index) => (
                <div key={item.step} className="relative">
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(50%+2.5rem)] w-[calc(100%-3rem)] border-t-2 border-dashed border-border" />
                  )}
                  <div className="relative bg-card border border-border rounded-xl p-6 text-center h-full">
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

        {/* Value Proposition with Image */}
        <section className="py-16 md:py-24 bg-muted/30 border-y border-border">
          <div className="container px-5 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 items-center max-w-6xl mx-auto">
              <div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Why RehabLookup</p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
                  Connect With Families Ready for Treatment
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Unlike lead aggregators that share contacts with multiple facilities, our inquiries come directly from families who found your specific listing and expressed genuine interest in your program.
                </p>
                
                <div className="space-y-4">
                  {[
                    { icon: Target, title: "High Intent Inquiries", desc: "Families actively seeking treatment, not cold prospects" },
                    { icon: Eye, title: "Maximum Visibility", desc: "Get discovered in search results and state directories" },
                    { icon: Zap, title: "Instant Notifications", desc: "Real time alerts when families show interest" },
                    { icon: BarChart3, title: "Analytics Dashboard", desc: "Track views, inquiries, and conversion metrics" },
                    { icon: Heart, title: "Quality Matches", desc: "Connect with families who fit your program" },
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
                <img 
                  src={providerDashboardScreenshot} 
                  alt="Provider Dashboard showing analytics, inquiries, and recent leads"
                  className="rounded-xl shadow-2xl border border-border w-full"
                />
                {/* Decorative elements */}
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl -z-10" />
                <div className="absolute -top-4 -left-4 w-32 h-32 bg-accent/10 rounded-full blur-2xl -z-10" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid with Images */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container px-5 md:px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Platform Features</p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Everything You Need to Grow
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Tools designed specifically for treatment centers to attract and convert more admissions.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
              {/* Feature Card 1 */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="aspect-video relative">
                  <img 
                    src={providerTeam} 
                    alt="Treatment center team collaborating"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Rich Facility Profiles</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Showcase your facility with photos, videos, staff bios, and detailed program information. Help families understand what makes your center unique.
                  </p>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="aspect-video relative">
                  <img 
                    src={providerFacility} 
                    alt="Modern treatment facility lobby"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Nationwide Exposure</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Reach families across all 50 states searching for treatment options. Our SEO optimized pages help your facility get found when it matters most.
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Features List */}
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {[
                { icon: Shield, title: "Verified Badge", desc: "Build trust with a verified facility badge" },
                { icon: Clock, title: "Quick Response", desc: "Connect with families within minutes" },
                { icon: BarChart3, title: "Performance Insights", desc: "Track your listing performance" },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <feature.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
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
                  quote: "The quality of families we connect with is exceptional. They arrive informed and ready to begin treatment.",
                  author: "Michael Torres",
                  role: "Admissions Director",
                  facility: "New Horizons Treatment",
                  avatar: testimonialMichael,
                  metric: "95%",
                },
                {
                  quote: "Our admissions team loves how easy it is to manage inquiries. Best decision we made for our marketing.",
                  author: "Jennifer Adams",
                  role: "Marketing Manager",
                  facility: "Coastal Wellness Center",
                  avatar: testimonialJennifer,
                  metric: "2x Growth",
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
                    a: "Yes, creating your listing is completely free. There are no setup fees, monthly fees, or hidden charges to get your facility visible on our platform."
                  },
                  {
                    q: "What kind of inquiry quality can I expect?",
                    a: "Our inquiries come from families actively seeking treatment. Each inquiry includes verified contact information, treatment preferences, insurance details, and urgency level."
                  },
                  {
                    q: "How long does it take to get started?",
                    a: "Most providers complete their profile and go live in under 10 minutes. Simply create an account, add your facility details and photos, then submit for verification."
                  },
                  {
                    q: "How do families find my facility?",
                    a: "Families discover your facility through our search engine, state directories, and treatment type pages. Our SEO ensures your listing is visible when families search for care."
                  },
                  {
                    q: "Can I update my listing after it goes live?",
                    a: "Absolutely. You can update your facility information, photos, services, and availability at any time through your provider dashboard."
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

        {/* Final CTA - Card style, not full-width background */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container px-5 md:px-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-card border border-border rounded-2xl p-8 md:p-12 text-center shadow-lg">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-6">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Join 500+ Treatment Centers</span>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Ready to Connect With More Families?
                </h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Join hundreds of treatment centers already growing their admissions with RehabLookup.
                </p>
                
                <Link to="/provider-signup">
                  <Button size="lg" className="gap-2 h-14 px-10 text-base font-semibold shadow-md">
                    List Your Facility Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                
                <p className="text-sm text-muted-foreground mt-6">
                  No credit card required. Free to get started.
                </p>
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
