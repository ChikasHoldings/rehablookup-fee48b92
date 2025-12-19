import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { SEO } from "@/components/SEO";
import { AnimatedCard } from "@/components/ui/animated-card";
import {
  Building2,
  Users,
  TrendingUp,
  Shield,
  CheckCircle,
  ArrowRight,
  Star,
  Eye,
  MessageSquare,
  BarChart3,
  Clock,
  X,
  Sparkles,
  Quote,
  Zap,
  Award,
  HeartHandshake,
  BadgeCheck,
  Phone,
  Target,
  Check,
} from "lucide-react";
import { useState } from "react";
import { providerNavLinks } from "@/data/providerNavLinks";
import { cn } from "@/lib/utils";
import providerDashboardMockup from "@/assets/provider-dashboard-mockup.jpg";

const benefits = [
  {
    icon: Target,
    title: "High-Intent Leads",
    description: "Connect with families actively seeking treatment—not cold prospects.",
    stat: "85%",
    statLabel: "Conversion Ready",
  },
  {
    icon: Eye,
    title: "Maximum Visibility",
    description: "Get discovered by thousands searching for quality treatment.",
    stat: "10K+",
    statLabel: "Monthly Searches",
  },
  {
    icon: BadgeCheck,
    title: "Trust & Credibility",
    description: "Our verification badge signals quality to families.",
    stat: "3x",
    statLabel: "More Inquiries",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track every view, click, and inquiry with precision.",
    stat: "24/7",
    statLabel: "Live Dashboard",
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    description: "Get real-time alerts when families show interest.",
    stat: "<1min",
    statLabel: "Alert Speed",
  },
  {
    icon: HeartHandshake,
    title: "Dedicated Support",
    description: "Our team helps optimize your listing and maximize ROI.",
    stat: "100%",
    statLabel: "Satisfaction",
  },
];

const listingFeatures = [
  { text: "Unlimited facility photos and virtual tours", highlight: true },
  { text: "Custom program descriptions and specializations", highlight: false },
  { text: "Insurance verification integration", highlight: true },
  { text: "Staff credentials and accreditations display", highlight: false },
  { text: "Direct inquiry forms and lead capture", highlight: true },
  { text: "Real-time analytics dashboard", highlight: false },
  { text: "Priority placement in search results", highlight: true },
  { text: "Dedicated account manager", highlight: false },
];

const testimonials = [
  {
    quote: "RehabLookup transformed our admissions. We saw a 40% increase in qualified leads within three months.",
    author: "Dr. Sarah Mitchell",
    role: "Clinical Director",
    facility: "Sunrise Recovery Center",
    location: "California",
    metric: "+40%",
    metricLabel: "Admissions",
  },
  {
    quote: "The quality of referrals is exceptional. Families arrive informed and ready to begin treatment.",
    author: "Michael Torres",
    role: "Admissions Director",
    facility: "New Horizons Treatment",
    location: "Florida",
    metric: "95%",
    metricLabel: "Lead Quality",
  },
  {
    quote: "The analytics alone are worth the investment. We finally have visibility into what drives admissions.",
    author: "Jennifer Adams",
    role: "Marketing Manager",
    facility: "Coastal Wellness Center",
    location: "Texas",
    metric: "2x",
    metricLabel: "ROI",
  },
];

const pricingPlans = [
  {
    name: "Basic",
    price: "Free",
    period: "",
    description: "Essential visibility for new facilities",
    features: [
      "Basic facility listing",
      "Up to 5 photos",
      "5 leads per month",
      "Standard search placement",
      "Monthly analytics report",
    ],
    cta: "Start Free",
    popular: false,
    highlight: false,
  },
  {
    name: "Professional",
    price: "$299",
    period: "/mo",
    description: "For growing treatment centers",
    features: [
      "Everything in Basic, plus:",
      "Priority search placement",
      "Unlimited photos & videos",
      "25 leads per month",
      "Real-time lead notifications",
      "Verified badge",
      "Email support",
    ],
    cta: "Get Started",
    popular: true,
    highlight: true,
  },
  {
    name: "Premium",
    price: "$599",
    period: "/mo",
    description: "Maximum visibility & leads",
    features: [
      "Everything in Professional, plus:",
      "Featured placement",
      "Unlimited leads",
      "Dedicated account manager",
      "Priority phone support",
      "Custom integrations",
      "Quarterly strategy reviews",
    ],
    cta: "Contact Sales",
    popular: false,
    highlight: false,
  },
];

const ForProviders = () => {
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="List Your Treatment Center - For Providers"
        description="Partner with RehabLookup to increase your treatment center's visibility. Connect with families seeking quality addiction care. Free listing available."
        canonical="/for-providers"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
        ]}
      />
      
      {/* Sticky Announcement Bar */}
      {showAnnouncement && (
        <div className="sticky top-0 z-[60] bg-gradient-to-r from-accent via-accent/95 to-accent text-accent-foreground">
          <div className="container px-4">
            <div className="flex items-center justify-center gap-2 py-2 relative">
              <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse" />
              <p className="text-xs font-medium text-center">
                <span className="font-bold">Limited Time:</span> Get 50% off your first 3 months
                <Link 
                  to="/provider-signup" 
                  className="ml-1.5 underline underline-offset-2 hover:no-underline font-semibold"
                >
                  Claim Offer →
                </Link>
              </p>
              <button
                onClick={() => setShowAnnouncement(false)}
                className="absolute right-0 p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Dismiss announcement"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Header
        navLinks={providerNavLinks}
        ctaLink="/provider-signup"
        ctaLabel="Get Started"
        variant="provider"
      />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-10 md:py-14">
          <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-accent/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[180px] h-[180px] bg-primary/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />
          
          <div className="container relative z-10 px-4">
            <div className="max-w-2xl mx-auto text-center">
              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                <div className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1">
                  <Award className="h-3 w-3 text-accent" />
                  <span className="text-[11px] font-medium text-accent">#1 Treatment Directory</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1">
                  <Shield className="h-3 w-3 text-primary" />
                  <span className="text-[11px] font-medium text-primary">500+ Verified Partners</span>
                </div>
              </div>

              <h1 className="mb-3 font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight">
                Fill Your Beds With
                <span className="text-primary"> Qualified Admissions</span>
              </h1>
              
              <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-5 leading-relaxed">
                Join the network trusted by 500+ treatment centers. Connect with families 
                actively seeking treatment—not tire kickers.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-2.5 sm:flex-row mb-6">
                <Link to="/provider-signup">
                  <Button size="sm" className="gap-1.5 h-9 px-5 text-xs font-semibold rounded-md shadow-md hover:shadow-lg transition-all">
                    Start Free Trial
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="sm" className="gap-1.5 h-9 px-5 text-xs font-semibold rounded-md">
                    <Phone className="h-3.5 w-3.5" />
                    Schedule Demo
                  </Button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="flex -space-x-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/70 border-2 border-background flex items-center justify-center">
                        <span className="text-[9px] font-bold text-primary-foreground">{String.fromCharCode(64 + i)}</span>
                      </div>
                    ))}
                  </div>
                  <span className="font-medium">500+ facilities trust us</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                  ))}
                  <span className="ml-1 font-medium">4.9/5 rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-card py-4">
          <div className="container px-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-center">
              {[
                { value: "10K+", label: "Families Helped Monthly" },
                { value: "500+", label: "Verified Partners" },
                { value: "50", label: "States Covered" },
                { value: "40%", label: "Avg. Admission Increase", accent: true },
              ].map((stat, index) => (
                <div key={stat.label} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className={cn(
                    "font-display text-xl md:text-2xl font-bold mb-0.5",
                    stat.accent ? "text-accent" : "text-primary"
                  )}>
                    {stat.value}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-10 md:py-12">
          <div className="container px-4">
            <div className="text-center mb-8">
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1">
                <TrendingUp className="h-3 w-3 text-accent" />
                <span className="text-[11px] font-medium text-accent">Why Choose RehabLookup</span>
              </div>
              <h2 className="mb-2 font-display text-lg md:text-xl font-bold text-foreground">
                Everything You Need to Grow Admissions
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Our platform is built specifically for treatment centers.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => (
                <AnimatedCard key={benefit.title} delay={index * 60}>
                  <div className="group h-full rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-accent/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 transition-colors group-hover:bg-accent/20">
                        <benefit.icon className="h-4 w-4 text-accent" />
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-primary">{benefit.stat}</div>
                        <div className="text-[9px] text-muted-foreground">{benefit.statLabel}</div>
                      </div>
                    </div>
                    <h3 className="mb-1.5 font-display text-sm font-semibold text-foreground">
                      {benefit.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-10 md:py-12 bg-gradient-to-b from-muted/50 to-background">
          <div className="container px-4">
            <div className="text-center mb-8">
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1">
                <Clock className="h-3 w-3 text-accent" />
                <span className="text-[11px] font-medium text-accent">Get Started in Minutes</span>
              </div>
              <h2 className="mb-2 font-display text-lg md:text-xl font-bold text-foreground">
                Simple 3-Step Process
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Join our network quickly and start receiving qualified leads.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 max-w-2xl mx-auto">
              {[
                { 
                  step: 1, 
                  title: "Create Your Profile", 
                  description: "Sign up and add your facility details in about 10 minutes.",
                  icon: Building2,
                },
                { 
                  step: 2, 
                  title: "Get Verified", 
                  description: "Our team reviews your credentials within 24 hours.",
                  icon: BadgeCheck,
                },
                { 
                  step: 3, 
                  title: "Receive Leads", 
                  description: "Go live and families start finding you immediately.",
                  icon: MessageSquare,
                },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="relative rounded-lg border border-border bg-card p-5 shadow-sm text-center animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-2 w-4 border-t-2 border-dashed border-accent/30" />
                  )}
                  
                  <div className="mb-3 mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-sm font-bold text-accent-foreground shadow">
                    {item.step}
                  </div>
                  <div className="mb-2 mx-auto flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h3 className="mb-1.5 font-display text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-6">
              <Link to="/provider-signup">
                <Button size="sm" className="gap-1.5 h-8 px-5 text-xs font-semibold rounded-md">
                  Get Started Now
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section with Dashboard Image */}
        <section className="py-10 md:py-12">
          <div className="container px-4">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div>
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1">
                  <CheckCircle className="h-3 w-3 text-accent" />
                  <span className="text-[11px] font-medium text-accent">Full Feature Set</span>
                </div>
                <h2 className="mb-3 font-display text-lg md:text-xl font-bold text-foreground">
                  Everything You Need to Succeed
                </h2>
                <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
                  Our platform gives you the tools to showcase your facility, connect with families, and grow your admissions.
                </p>

                <ul className="space-y-2">
                  {listingFeatures.map((feature, index) => (
                    <li key={feature.text} className="flex items-start gap-2 animate-fade-in" style={{ animationDelay: `${index * 40}ms` }}>
                      <div className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                        feature.highlight ? "bg-accent/15" : "bg-primary/10"
                      )}>
                        <Check className={cn(
                          "h-2.5 w-2.5",
                          feature.highlight ? "text-accent" : "text-primary"
                        )} />
                      </div>
                      <span className={cn(
                        "text-xs text-foreground",
                        feature.highlight && "font-medium"
                      )}>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div className="rounded-xl overflow-hidden border border-border shadow-lg bg-card">
                  <img 
                    src={providerDashboardMockup} 
                    alt="RehabLookup Provider Dashboard showing analytics, lead notifications, and facility management" 
                    className="w-full h-auto"
                  />
                </div>
                
                {/* Floating badge */}
                <div className="absolute -bottom-3 -left-3 md:-left-4 rounded-lg bg-primary px-3 py-2 shadow-lg">
                  <div className="flex items-center gap-2 text-primary-foreground">
                    <BarChart3 className="h-4 w-4 text-accent" />
                    <div>
                      <div className="text-xs font-bold">Real-Time Analytics</div>
                      <div className="text-[10px] opacity-80">Track every metric</div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -top-3 -right-3 rounded-lg bg-accent px-2.5 py-1.5 shadow-md animate-float">
                  <div className="flex items-center gap-1 text-accent-foreground">
                    <Zap className="h-3 w-3" />
                    <span className="text-[10px] font-bold">Live Dashboard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-10 md:py-12 bg-gradient-to-b from-muted/50 to-background">
          <div className="container px-4">
            <div className="text-center mb-8">
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1">
                <Quote className="h-3 w-3 text-accent" />
                <span className="text-[11px] font-medium text-accent">Partner Success Stories</span>
              </div>
              <h2 className="mb-2 font-display text-lg md:text-xl font-bold text-foreground">
                Trusted by Leading Treatment Centers
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                See how our partners are transforming their admissions.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <AnimatedCard key={testimonial.author} delay={index * 80}>
                  <div className="h-full flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <Quote className="h-5 w-5 text-accent/30" />
                      <div className="text-right">
                        <div className="text-base font-bold text-accent">{testimonial.metric}</div>
                        <div className="text-[9px] text-muted-foreground">{testimonial.metricLabel}</div>
                      </div>
                    </div>
                    
                    <blockquote className="flex-1 text-xs text-foreground/90 leading-relaxed mb-3">
                      "{testimonial.quote}"
                    </blockquote>
                    
                    <div className="border-t border-border pt-3">
                      <p className="font-semibold text-xs text-foreground">{testimonial.author}</p>
                      <p className="text-[10px] text-muted-foreground">{testimonial.role}</p>
                      <p className="text-[10px] text-primary font-medium mt-0.5">{testimonial.facility}, {testimonial.location}</p>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-10 md:py-12">
          <div className="container px-4">
            <div className="text-center mb-8">
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1">
                <Star className="h-3 w-3 text-accent" />
                <span className="text-[11px] font-medium text-accent">Simple Pricing</span>
              </div>
              <h2 className="mb-2 font-display text-lg md:text-xl font-bold text-foreground">
                Plans That Scale With You
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Start free and upgrade as you grow. No hidden fees.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 max-w-3xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <AnimatedCard key={plan.name} delay={index * 80}>
                  <div className={cn(
                    "relative h-full flex flex-col rounded-lg border p-5 transition-all",
                    plan.highlight 
                      ? "border-accent bg-gradient-to-b from-accent/5 to-background shadow-md scale-[1.02]" 
                      : "border-border bg-card"
                  )}>
                    {plan.popular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold text-accent-foreground shadow">
                          <Sparkles className="h-2.5 w-2.5" />
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <h3 className="font-display text-sm font-semibold text-foreground mb-0.5">{plan.name}</h3>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-xs text-muted-foreground">{plan.period}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{plan.description}</p>
                    </div>
                    
                    <ul className="flex-1 space-y-1.5 mb-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-1.5 text-[11px]">
                          <CheckCircle className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Link to={plan.name === "Premium" ? "/contact" : "/provider-signup"}>
                      <Button 
                        variant={plan.highlight ? "default" : "outline"} 
                        size="sm"
                        className="w-full h-8 text-xs font-semibold rounded-md"
                      >
                        {plan.cta}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </AnimatedCard>
              ))}
            </div>

            <p className="text-center text-[10px] text-muted-foreground mt-4">
              All plans include 14-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-10 md:py-12 bg-gradient-to-b from-primary/5 to-background">
          <div className="container px-4">
            <div className="mx-auto max-w-xl rounded-lg border border-accent/20 bg-gradient-to-br from-primary via-primary to-primary/90 p-6 text-center shadow-lg">
              <div className="mb-3 inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/10 backdrop-blur">
                <HeartHandshake className="h-5 w-5 text-accent" />
              </div>
              <h2 className="mb-2 font-display text-lg md:text-xl font-bold text-primary-foreground">
                Ready to Transform Your Admissions?
              </h2>
              <p className="mb-4 text-xs text-primary-foreground/80 max-w-md mx-auto">
                Join 500+ treatment centers connecting with families who need their help.
              </p>
              <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Link to="/provider-signup">
                  <Button variant="hero-light" size="sm" className="gap-1.5 h-8 px-5 text-xs font-semibold rounded-md">
                    Start Free Trial
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 px-5 text-xs font-semibold rounded-md bg-transparent border-white/30 text-primary-foreground hover:bg-white/10">
                    Talk to Sales
                  </Button>
                </Link>
              </div>
              <p className="mt-3 text-[10px] text-primary-foreground/60">
                No credit card required • Setup in 10 minutes • Cancel anytime
              </p>
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
