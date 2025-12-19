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
} from "lucide-react";
import { useState } from "react";
import { providerNavLinks } from "@/data/providerNavLinks";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Target,
    title: "High-Intent Leads",
    description: "Connect with families actively seeking treatment, not cold prospects. Our leads are ready to take the next step.",
    stat: "85%",
    statLabel: "Conversion Ready",
  },
  {
    icon: Eye,
    title: "Maximum Visibility",
    description: "Get discovered by thousands of families searching for quality addiction treatment in your area.",
    stat: "10K+",
    statLabel: "Monthly Searches",
  },
  {
    icon: BadgeCheck,
    title: "Trust & Credibility",
    description: "Our verification badge signals quality and trustworthiness to families making critical decisions.",
    stat: "3x",
    statLabel: "More Inquiries",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track every view, click, and inquiry. Make data-driven decisions to optimize your admissions.",
    stat: "24/7",
    statLabel: "Live Dashboard",
  },
  {
    icon: Zap,
    title: "Instant Notifications",
    description: "Get real-time alerts when families show interest. Respond quickly to increase conversions.",
    stat: "<1min",
    statLabel: "Alert Speed",
  },
  {
    icon: HeartHandshake,
    title: "Dedicated Support",
    description: "Our partner success team helps you optimize your listing and maximize your ROI.",
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
    quote: "RehabLookup has transformed our admissions. We saw a 40% increase in qualified leads within the first three months. The ROI is incredible.",
    author: "Dr. Sarah Mitchell",
    role: "Clinical Director",
    facility: "Sunrise Recovery Center",
    location: "California",
    metric: "+40%",
    metricLabel: "Admissions",
  },
  {
    quote: "The quality of referrals is exceptional. Families arrive informed and ready to begin treatment. Our intake team loves it.",
    author: "Michael Torres",
    role: "Admissions Director",
    facility: "New Horizons Treatment",
    location: "Florida",
    metric: "95%",
    metricLabel: "Lead Quality",
  },
  {
    quote: "The analytics alone are worth the investment. We finally have visibility into what drives our admissions.",
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
    description: "Get started with essential visibility",
    features: [
      "Basic facility listing",
      "Up to 5 photos",
      "Standard search placement",
      "Monthly analytics report",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Professional",
    price: "$199",
    period: "/mo",
    description: "For growing treatment centers",
    features: [
      "Everything in Basic, plus:",
      "Priority search placement",
      "Unlimited photos & videos",
      "Real-time lead notifications",
      "Verified badge",
      "Dedicated support",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For multi-location facilities",
    features: [
      "Everything in Professional, plus:",
      "Multiple location management",
      "Custom integrations",
      "White-glove onboarding",
      "Priority lead routing",
      "Quarterly strategy reviews",
    ],
    cta: "Contact Sales",
    popular: false,
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
            <div className="flex items-center justify-center gap-3 py-2.5 relative">
              <Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
              <p className="text-sm font-medium text-center">
                <span className="font-bold">Limited Time:</span> Get 50% off your first 3 months!
                <Link 
                  to="/provider-signup" 
                  className="ml-2 underline underline-offset-2 hover:no-underline font-semibold"
                >
                  Claim Offer →
                </Link>
              </p>
              <button
                onClick={() => setShowAnnouncement(false)}
                className="absolute right-0 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4" />
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
        {/* Hero Section - High Impact */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-12 md:py-16">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-primary/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />
          
          <div className="container relative z-10 px-4">
            <div className="max-w-3xl mx-auto text-center">
              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5">
                  <Award className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-medium text-accent">#1 Treatment Directory</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">500+ Verified Partners</span>
                </div>
              </div>

              <h1 className="mb-4 font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Fill Your Beds With
                <span className="block text-primary">Qualified Admissions</span>
              </h1>
              
              <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
                Join the network trusted by 500+ treatment centers. Connect with families 
                actively seeking treatment—not tire kickers.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row mb-8">
                <Link to="/provider-signup">
                  <Button size="default" className="gap-2 h-11 px-6 text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="default" className="gap-2 h-11 px-6 text-sm font-semibold rounded-lg">
                    <Phone className="h-4 w-4" />
                    Schedule Demo
                  </Button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 border-2 border-background flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary-foreground">{String.fromCharCode(64 + i)}</span>
                      </div>
                    ))}
                  </div>
                  <span className="font-medium">500+ facilities trust us</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />
                  ))}
                  <span className="ml-1 font-medium">4.9/5 partner rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-card py-6">
          <div className="container px-4">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 text-center">
              <div className="animate-fade-in">
                <div className="font-display text-2xl md:text-3xl font-bold text-primary mb-0.5">10K+</div>
                <p className="text-xs text-muted-foreground">Families Helped Monthly</p>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                <div className="font-display text-2xl md:text-3xl font-bold text-primary mb-0.5">500+</div>
                <p className="text-xs text-muted-foreground">Verified Partners</p>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
                <div className="font-display text-2xl md:text-3xl font-bold text-primary mb-0.5">50</div>
                <p className="text-xs text-muted-foreground">States Covered</p>
              </div>
              <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
                <div className="font-display text-2xl md:text-3xl font-bold text-accent mb-0.5">40%</div>
                <p className="text-xs text-muted-foreground">Avg. Admission Increase</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-12 md:py-16">
          <div className="container px-4">
            <div className="text-center mb-10">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-medium text-accent">Why Choose RehabLookup</span>
              </div>
              <h2 className="mb-3 font-display text-xl md:text-2xl font-bold text-foreground">
                Everything You Need to Grow Admissions
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Our platform is built specifically for treatment centers.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => (
                <AnimatedCard key={benefit.title} delay={index * 80}>
                  <div className="group h-full rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-accent/30">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent/20">
                        <benefit.icon className="h-5 w-5 text-accent" />
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{benefit.stat}</div>
                        <div className="text-[10px] text-muted-foreground">{benefit.statLabel}</div>
                      </div>
                    </div>
                    <h3 className="mb-2 font-display text-base font-semibold text-foreground">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-muted/50 to-background">
          <div className="container px-4">
            <div className="text-center mb-10">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-medium text-accent">Get Started in Minutes</span>
              </div>
              <h2 className="mb-3 font-display text-xl md:text-2xl font-bold text-foreground">
                Simple 3-Step Process
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Join our network quickly and start receiving qualified leads today.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
              {[
                { 
                  step: 1, 
                  title: "Create Your Profile", 
                  description: "Sign up and add your facility details. Takes about 10 minutes.",
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
                  description: "Your listing goes live and families start finding you.",
                  icon: MessageSquare,
                },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className="relative rounded-xl border border-border bg-card p-6 shadow-sm text-center animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {index < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t-2 border-dashed border-accent/30" />
                  )}
                  
                  <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-lg font-bold text-accent-foreground shadow-md">
                    {item.step}
                  </div>
                  <div className="mb-3 mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="mb-2 font-display text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/provider-signup">
                <Button size="default" className="gap-2 h-10 px-6 text-sm font-semibold rounded-lg">
                  Get Started Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-16">
          <div className="container px-4">
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-medium text-accent">Full Feature Set</span>
                </div>
                <h2 className="mb-4 font-display text-xl md:text-2xl font-bold text-foreground">
                  Everything You Need to Succeed
                </h2>
                <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
                  Our platform gives you the tools to showcase your facility, connect with families, and grow your admissions.
                </p>

                <ul className="space-y-2.5">
                  {listingFeatures.map((feature, index) => (
                    <li key={feature.text} className="flex items-start gap-2.5 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                        feature.highlight ? "bg-accent/15" : "bg-primary/10"
                      )}>
                        <CheckCircle className={cn(
                          "h-3 w-3",
                          feature.highlight ? "text-accent" : "text-primary"
                        )} />
                      </div>
                      <span className={cn(
                        "text-sm text-foreground",
                        feature.highlight && "font-medium"
                      )}>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-primary via-primary to-primary/90 p-8 text-center shadow-lg">
                  <div className="mb-4 inline-flex items-center justify-center h-14 w-14 rounded-full bg-white/10 backdrop-blur">
                    <Building2 className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold text-primary-foreground">
                    Ready to Get Started?
                  </h3>
                  <p className="mb-6 text-sm text-primary-foreground/80 leading-relaxed">
                    Join 500+ treatment centers already growing with RehabLookup.
                  </p>
                  <Link to="/provider-signup">
                    <Button variant="hero-light" size="default" className="w-full gap-2 h-11 text-sm font-semibold rounded-lg">
                      Start Your Free Trial
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <p className="mt-3 text-xs text-primary-foreground/60">No credit card required</p>
                </div>
                
                <div className="absolute -top-3 -right-3 rounded-lg bg-accent px-3 py-1.5 shadow-md animate-float">
                  <div className="flex items-center gap-1.5 text-accent-foreground">
                    <Zap className="h-3 w-3" />
                    <span className="text-xs font-bold">Setup in 10 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-muted/50 to-background">
          <div className="container px-4">
            <div className="text-center mb-10">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5">
                <Quote className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-medium text-accent">Partner Success Stories</span>
              </div>
              <h2 className="mb-3 font-display text-xl md:text-2xl font-bold text-foreground">
                Trusted by Leading Treatment Centers
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                See how our partners are transforming their admissions.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <AnimatedCard key={testimonial.author} delay={index * 100}>
                  <div className="h-full flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <Quote className="h-6 w-6 text-accent/30" />
                      <div className="text-right">
                        <div className="text-lg font-bold text-accent">{testimonial.metric}</div>
                        <div className="text-[10px] text-muted-foreground">{testimonial.metricLabel}</div>
                      </div>
                    </div>
                    
                    <blockquote className="flex-1 text-sm text-foreground/90 leading-relaxed mb-4">
                      "{testimonial.quote}"
                    </blockquote>
                    
                    <div className="border-t border-border pt-4">
                      <p className="font-semibold text-sm text-foreground">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      <p className="text-xs text-primary font-medium mt-0.5">{testimonial.facility}, {testimonial.location}</p>
                    </div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-12 md:py-16">
          <div className="container px-4">
            <div className="text-center mb-10">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5">
                <Star className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-medium text-accent">Simple Pricing</span>
              </div>
              <h2 className="mb-3 font-display text-xl md:text-2xl font-bold text-foreground">
                Plans That Scale With You
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Start free and upgrade as you grow. No hidden fees.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <AnimatedCard key={plan.name} delay={index * 100}>
                  <div className={cn(
                    "relative h-full flex flex-col rounded-xl border p-6 transition-all",
                    plan.popular 
                      ? "border-accent bg-gradient-to-b from-accent/5 to-background shadow-md scale-[1.02]" 
                      : "border-border bg-card"
                  )}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-md">
                          <Sparkles className="h-3 w-3" />
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <h3 className="font-display text-base font-semibold text-foreground mb-1">{plan.name}</h3>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                    </div>
                    
                    <ul className="flex-1 space-y-2 mb-5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-1.5 text-xs">
                          <CheckCircle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Link to={plan.name === "Enterprise" ? "/contact" : "/provider-signup"}>
                      <Button 
                        variant={plan.popular ? "default" : "outline"} 
                        className="w-full h-9 text-sm font-semibold rounded-lg"
                      >
                        {plan.cta}
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container px-4">
            <div className="mx-auto max-w-2xl rounded-xl border border-accent/20 bg-gradient-to-br from-primary via-primary to-primary/90 p-8 text-center shadow-lg">
              <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/10 backdrop-blur">
                <HeartHandshake className="h-6 w-6 text-accent" />
              </div>
              <h2 className="mb-3 font-display text-xl md:text-2xl font-bold text-primary-foreground">
                Ready to Transform Your Admissions?
              </h2>
              <p className="mb-6 text-sm text-primary-foreground/80 max-w-lg mx-auto">
                Join 500+ treatment centers connecting with families who need their help.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/provider-signup">
                  <Button variant="hero-light" size="default" className="gap-2 h-10 px-6 text-sm font-semibold rounded-lg">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="default" className="gap-2 h-10 px-6 text-sm font-semibold rounded-lg bg-transparent border-white/30 text-primary-foreground hover:bg-white/10">
                    Talk to Sales
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-primary-foreground/60">
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
