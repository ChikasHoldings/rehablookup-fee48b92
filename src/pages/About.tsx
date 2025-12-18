import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Shield,
  Users,
  CheckCircle,
  ArrowRight,
  Eye,
  Target,
  Lightbulb,
  Clock,
  Award,
  TrendingUp,
  Globe,
  Sparkles,
} from "lucide-react";
import aboutTeamImage from "@/assets/about-team.jpg";
import aboutMissionImage from "@/assets/about-mission.jpg";

const values = [
  {
    icon: Shield,
    title: "Transparency",
    description:
      "We believe families deserve accurate, honest information about treatment options without hidden agendas or misleading claims.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconBg: "from-blue-500 to-cyan-500",
  },
  {
    icon: Heart,
    title: "Compassion",
    description:
      "We understand the emotional weight of searching for addiction treatment. Our approach is always respectful and supportive.",
    gradient: "from-rose-500/20 to-pink-500/20",
    iconBg: "from-rose-500 to-pink-500",
  },
  {
    icon: CheckCircle,
    title: "Verification",
    description:
      "Every facility in our directory is verified for proper licensing, accreditation, and quality standards.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconBg: "from-emerald-500 to-teal-500",
  },
  {
    icon: Users,
    title: "Accessibility",
    description:
      "Treatment information should be accessible to everyone, regardless of their situation or insurance status.",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconBg: "from-violet-500 to-purple-500",
  },
];

const timeline = [
  {
    year: "2020",
    title: "Founded with Purpose",
    description: "RehabLookup was founded with a simple mission: make finding addiction treatment easier and more transparent for families in need.",
    icon: Sparkles,
  },
  {
    year: "2021",
    title: "Nationwide Expansion",
    description: "Expanded our directory to cover treatment centers across all 50 states, making help accessible to families everywhere.",
    icon: Globe,
  },
  {
    year: "2022",
    title: "Verification Program",
    description: "Launched our comprehensive facility verification program to ensure every listed center meets quality standards.",
    icon: Shield,
  },
  {
    year: "2023",
    title: "10,000+ Families Helped",
    description: "Reached a milestone of helping over 10,000 families connect with verified treatment centers.",
    icon: TrendingUp,
  },
  {
    year: "2024",
    title: "Industry Recognition",
    description: "Recognized as a trusted resource in the addiction treatment space, partnering with leading healthcare organizations.",
    icon: Award,
  },
];

const missionCards = [
  {
    icon: Eye,
    title: "Our Vision",
    description: "A world where every person struggling with addiction can easily find quality, verified treatment options without confusion or barriers.",
  },
  {
    icon: Target,
    title: "Our Mission",
    description: "To connect families with trusted addiction treatment centers through transparency, compassion, and verified information.",
  },
  {
    icon: Heart,
    title: "Our Promise",
    description: "We will never accept payment to rank facilities higher. Our listings are based solely on verification and quality standards.",
  },
];

const About = () => {
  return (
    <Layout>
      <SEO
        title="About RehabLookup - Trusted Addiction Treatment Directory"
        description="RehabLookup connects families with verified addiction treatment centers. Learn about our mission, values, and commitment to transparency in helping you find recovery."
        canonical="/about"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ]}
      />
      
      {/* Hero - Navy background with decorative elements */}
      <section className="bg-primary py-16 px-4 md:py-24 md:px-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        </div>
        
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur-sm border border-white/10">
              <Heart className="h-5 w-5 text-accent" />
              <span className="text-base font-medium text-primary-foreground">Our Story</span>
            </div>
            <h1 className="mb-6 font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
              About RehabLookup
            </h1>
            <p className="text-lg text-primary-foreground/80 leading-relaxed md:text-xl max-w-2xl mx-auto">
              We're on a mission to connect families with trusted addiction treatment 
              centers through transparency, compassion, and verified information.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-5 px-4 md:py-4 md:px-6">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-base md:gap-12 md:text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Shield className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>Verified Facilities</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Clock className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Users className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>10,000+ Families Helped</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Cards Section */}
      <section className="py-16 px-4 md:py-24 md:px-6 bg-gradient-to-b from-background to-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2.5">
              <Target className="h-5 w-5 text-accent" />
              <span className="text-base font-medium text-accent">What Drives Us</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl mb-4">
              Our Purpose & Promise
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything we do is guided by our commitment to helping families find the right treatment.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {missionCards.map((card, index) => (
              <div
                key={card.title}
                className="group relative rounded-3xl bg-gradient-to-br from-accent/5 to-accent/10 p-1 animate-fade-in hover:scale-[1.02] transition-transform duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-full rounded-[22px] bg-card p-8 border border-border/50">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                    <card.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="mb-3 font-display text-xl font-bold text-foreground">
                    {card.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Are with Image */}
      <section className="py-16 px-4 md:py-24 md:px-6">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="animate-fade-in">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2.5">
                <Eye className="h-5 w-5 text-accent" />
                <span className="text-base font-medium text-accent">Who We Are</span>
              </div>
              <h2 className="mb-6 font-display text-2xl font-bold text-foreground md:text-3xl">
                A Directory You Can Trust
              </h2>
              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">RehabLookup is a directory service, not a treatment provider.</strong> We 
                  connect individuals and families with addiction treatment centers across the nation.
                </p>
                <p>
                  We understand that finding the right treatment center is one of the most 
                  important decisions a family can make. That's why we've built a platform 
                  focused on transparency, accuracy, and compassion.
                </p>
                <p>
                  Our team works diligently to verify each facility in our directory, 
                  ensuring they meet proper licensing requirements and quality standards.
                </p>
              </div>
              
              {/* Stats */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <div className="font-display text-2xl font-bold text-accent">500+</div>
                  <div className="text-sm text-muted-foreground">Verified Centers</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <div className="font-display text-2xl font-bold text-accent">50</div>
                  <div className="text-sm text-muted-foreground">States Covered</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <div className="font-display text-2xl font-bold text-accent">24/7</div>
                  <div className="text-sm text-muted-foreground">Support</div>
                </div>
              </div>
            </div>
            
            <div className="relative animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={aboutMissionImage} 
                  alt="RehabLookup mission - helping families find hope" 
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="font-display text-xl font-semibold text-white">
                    Helping families find hope
                  </p>
                  <p className="mt-1 text-white/80 text-sm">
                    Every journey begins with a single step
                  </p>
                </div>
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl -z-10" />
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-primary/20 rounded-full blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 px-4 md:py-24 md:px-6 bg-primary relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl translate-y-1/2" />
        </div>
        
        <div className="container relative">
          <div className="text-center mb-14">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 backdrop-blur-sm border border-white/10">
              <Clock className="h-5 w-5 text-accent" />
              <span className="text-base font-medium text-primary-foreground">Our Journey</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl mb-4">
              Building Trust Over Time
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto">
              From our founding to today, we've been committed to helping families find the right treatment.
            </p>
          </div>

          <div className="max-w-4xl mx-auto relative">
            {/* Vertical line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent/50 via-accent to-accent/50 md:-translate-x-1/2" />
            
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div
                  key={item.year}
                  className={`relative flex items-start gap-6 md:gap-0 animate-fade-in ${
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Content */}
                  <div className={`flex-1 md:w-[calc(50%-2rem)] ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                    <div className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors duration-300 ${index % 2 === 0 ? "ml-14 md:ml-0" : "ml-14 md:ml-0"}`}>
                      <div className={`flex items-center gap-3 mb-3 ${index % 2 === 0 ? "md:justify-end" : ""}`}>
                        <span className="text-accent font-display font-bold text-lg">{item.year}</span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-primary-foreground mb-2">
                        {item.title}
                      </h3>
                      <p className="text-primary-foreground/70 text-sm leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Center dot with icon */}
                  <div className="absolute left-8 md:left-1/2 -translate-x-1/2 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent/80 shadow-lg flex items-center justify-center ring-4 ring-primary">
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  
                  {/* Spacer for alternating layout */}
                  <div className="hidden md:block flex-1 md:w-[calc(50%-2rem)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 md:py-24 md:px-6">
        <div className="container">
          <div className="text-center mb-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2.5">
              <Users className="h-5 w-5 text-accent" />
              <span className="text-base font-medium text-accent">Our Team</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl mb-4">
              Dedicated to Your Success
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our team of specialists is here to help you navigate the path to recovery.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
              <img 
                src={aboutTeamImage} 
                alt="RehabLookup team of dedicated specialists" 
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                <h3 className="font-display text-2xl font-bold text-white mb-2">
                  Compassionate Experts
                </h3>
                <p className="text-white/80 max-w-lg">
                  Our team combines healthcare expertise with genuine compassion. We're not just a 
                  directory—we're real people dedicated to helping you find the right treatment.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm text-white">
                    <CheckCircle className="h-4 w-4" />
                    Trained Specialists
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm text-white">
                    <Heart className="h-4 w-4" />
                    Judgment-Free Support
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm text-white">
                    <Clock className="h-4 w-4" />
                    Available 24/7
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 px-4 md:py-24 md:px-6 bg-muted/30">
        <div className="container">
          <div className="mb-12 text-center animate-fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2.5">
              <Lightbulb className="h-5 w-5 text-accent" />
              <span className="text-base font-medium text-accent">Our Values</span>
            </div>
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">
              What Guides Us
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              These core principles shape everything we do at RehabLookup.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <div
                key={value.title}
                className={`group relative rounded-3xl bg-gradient-to-br ${value.gradient} p-1 animate-fade-in hover:scale-[1.02] transition-transform duration-300`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-full rounded-[22px] bg-card p-6 border border-border/50">
                  <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${value.iconBg} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                    <value.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="border-y border-border bg-card py-12 px-4 md:px-6">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-accent/10 p-8 animate-fade-in">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-lg">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                  Important Notice
                </h3>
                <div className="space-y-3 text-muted-foreground leading-relaxed">
                  <p>
                    RehabLookup is a directory and referral service. We are <strong className="text-foreground">not</strong> a 
                    treatment provider, medical facility, or substitute for professional medical advice.
                  </p>
                  <p>
                    If you or someone you know is experiencing a medical emergency, please call 911 immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Navy background */}
      <section className="bg-primary py-16 px-4 md:py-20 md:px-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        </div>
        
        <div className="container text-center relative">
          <div className="mb-6 inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-xl mx-auto">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
            Ready to Find Treatment?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/80 max-w-xl mx-auto">
            Search our directory or speak with a specialist today. We're here to help.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-4">
            <Link to="/rehab-centers" className="w-full sm:w-auto">
              <Button variant="hero-light" size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:px-8 hover:scale-105 hover:shadow-xl transition-all duration-200">
                Find Treatment Centers
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/request-help?source=about_cta" className="w-full sm:w-auto">
              <Button variant="hero-light" size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:px-8 hover:scale-105 transition-all duration-200">
                <Heart className="h-5 w-5" />
                Request Help
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
